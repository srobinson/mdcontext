/**
 * Regression coverage for the shared CLI error handlers (ALP-1715).
 *
 * `createEmbeddingErrorHandler` is the dispatcher that catches failures
 * from `buildEmbeddings` inside search/index commands. Before ALP-1715
 * it only covered the legacy `MdmError` family; when voyage + HyDE
 * started producing `CapabilityNotSupported` and empty-registry lookups
 * produced `ProviderNotFound`, those tags escaped the catchTags call
 * and fell through to the generic `Unexpected error` path in main.ts.
 *
 * The test below pins the contract: the handler must surface the
 * actionable `error.message` on stderr and return `null` so the caller
 * can gracefully degrade, for both provider-runtime tags. Asserting
 * via a `console.error` spy exercises the exact code path that an end
 * user sees.
 */

import { Effect } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CapabilityNotSupported, ProviderNotFound } from '../errors/index.js'
import { createEmbeddingErrorHandler } from './shared-error-handling.js'

describe('createEmbeddingErrorHandler: provider runtime errors (ALP-1715)', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('handles CapabilityNotSupported with actionable stderr output', async () => {
    const handler = createEmbeddingErrorHandler({ silent: false })
    // The handler is a Match.tags-style record; the CapabilityNotSupported
    // key must exist so Effect.catchTags dispatches on it.
    expect(handler.CapabilityNotSupported).toBeDefined()

    const error = new CapabilityNotSupported({
      provider: 'voyage',
      capability: 'generateText',
      supportedAlternatives: ['openai', 'ollama'],
    })

    const result = await Effect.runPromise(
      handler.CapabilityNotSupported(error),
    )

    // Graceful degradation contract: return null so the caller can
    // fall back (e.g., keyword search instead of semantic).
    expect(result).toBeNull()

    // Actionable remediation contract: the user-facing message must
    // include both the capability mismatch and the concrete
    // alternatives — never just a stack trace or "(unexpected)".
    expect(errorSpy).toHaveBeenCalled()
    const stderrOutput = errorSpy.mock.calls
      .map((call: unknown[]) => call.join(' '))
      .join('\n')
    expect(stderrOutput).toContain('voyage does not support generateText')
    expect(stderrOutput).toContain('openai')
  })

  it('handles ProviderNotFound with actionable stderr output', async () => {
    const handler = createEmbeddingErrorHandler({ silent: false })
    expect(handler.ProviderNotFound).toBeDefined()

    const error = new ProviderNotFound({
      id: 'cohere',
      known: ['openai', 'voyage'],
    })

    const result = await Effect.runPromise(handler.ProviderNotFound(error))

    expect(result).toBeNull()
    expect(errorSpy).toHaveBeenCalled()
    const stderrOutput = errorSpy.mock.calls
      .map((call: unknown[]) => call.join(' '))
      .join('\n')
    expect(stderrOutput).toContain('cohere')
    expect(stderrOutput).toContain('is not registered')
  })

  it('suppresses stderr output in silent mode (JSON output)', async () => {
    const handler = createEmbeddingErrorHandler({ silent: true })

    const error = new CapabilityNotSupported({
      provider: 'voyage',
      capability: 'generateText',
      supportedAlternatives: ['openai'],
    })

    const result = await Effect.runPromise(
      handler.CapabilityNotSupported(error),
    )

    // Silent mode must still return null (so the caller degrades) but
    // must NOT print to stderr — stderr is reserved for the JSON
    // error envelope the caller will emit itself.
    expect(result).toBeNull()
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
