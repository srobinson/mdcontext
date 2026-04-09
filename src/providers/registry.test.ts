/**
 * Registry contract tests for ALP-1703.
 *
 * Locks the fail-fast wiring that the runtime promises to consumers:
 *
 *  - `getCapability(runtime, 'generateText')` on a provider whose
 *    runtime exposes only `embed` (voyage) fails with
 *    `CapabilityNotSupported` and the failure carries the live list of
 *    registered providers that DO satisfy the capability.
 *
 *  - `getProvider(id)` for a default-set provider whose credential env
 *    var is unset fails with `MissingApiKey` (not `ProviderNotFound`).
 *    The user pinned `provider: 'openrouter'` and forgot to set
 *    `OPENROUTER_API_KEY`; the actionable error tells them which env
 *    var to set, not that the provider does not exist.
 *
 *  - `getProvider(id)` for a genuinely-unknown id falls through to
 *    `ProviderNotFound` so typos still get the "did you mean" listing.
 */

import { Effect } from 'effect'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CapabilityNotSupported,
  clearRegistry,
  getCapability,
  getProvider,
  MissingApiKey,
  ProviderNotFound,
  registerDefaultProviders,
} from './index.js'
import type { ProviderId, ProviderRuntime } from './runtime.js'

const ALL_OPENAI_KEYS = {
  OPENAI_API_KEY: 'sk-test-openai',
  OPENROUTER_API_KEY: 'sk-or-test',
  VOYAGE_API_KEY: 'voyage-test',
}

const snapshotEnv = (
  keys: readonly string[],
): Record<string, string | undefined> => {
  const snapshot: Record<string, string | undefined> = {}
  for (const key of keys) {
    snapshot[key] = process.env[key]
  }
  return snapshot
}

const restoreEnv = (snapshot: Record<string, string | undefined>): void => {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

describe('getCapability', () => {
  let envSnapshot: Record<string, string | undefined>

  beforeEach(() => {
    clearRegistry()
    envSnapshot = snapshotEnv(Object.keys(ALL_OPENAI_KEYS))
    for (const [key, value] of Object.entries(ALL_OPENAI_KEYS)) {
      process.env[key] = value
    }
    Effect.runSync(registerDefaultProviders())
  })

  afterEach(() => {
    clearRegistry()
    restoreEnv(envSnapshot)
  })

  it('fails with CapabilityNotSupported when voyage is asked for generateText', () => {
    const voyage = Effect.runSync(getProvider('voyage'))
    const result = Effect.runSync(
      Effect.either(getCapability(voyage, 'generateText')),
    )

    expect(result._tag).toBe('Left')
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(CapabilityNotSupported)
      expect(result.left.provider).toBe('voyage')
      expect(result.left.capability).toBe('generateText')
    }
  })

  it('populates supportedAlternatives from the live registry', () => {
    const voyage = Effect.runSync(getProvider('voyage'))
    const result = Effect.runSync(
      Effect.either(getCapability(voyage, 'generateText')),
    )

    expect(result._tag).toBe('Left')
    if (
      result._tag === 'Left' &&
      result.left instanceof CapabilityNotSupported
    ) {
      // All four OpenAI-compatible providers registered cleanly because
      // every env var was set in beforeEach.
      const sorted = [...result.left.supportedAlternatives].sort()
      expect(sorted).toEqual(['lm-studio', 'ollama', 'openai', 'openrouter'])
    }
  })

  it('produces an actionable message naming the provider, capability, and alternatives', () => {
    const voyage = Effect.runSync(getProvider('voyage'))
    const result = Effect.runSync(
      Effect.either(getCapability(voyage, 'generateText')),
    )

    expect(result._tag).toBe('Left')
    if (
      result._tag === 'Left' &&
      result.left instanceof CapabilityNotSupported
    ) {
      const message = result.left.message
      expect(message).toContain('voyage')
      expect(message).toContain('generateText')
      expect(message).toContain('openai')
      expect(message).toContain('openrouter')
      // Actionable-only: no design rationale, no history, no "because".
      expect(message.toLowerCase()).not.toContain('rationale')
      expect(message.toLowerCase()).not.toContain('previously')
      expect(message.toLowerCase()).not.toContain('because')
    }
  })

  it('returns the embed client for a provider that supports embed', () => {
    const openai = Effect.runSync(getProvider('openai'))
    const client = Effect.runSync(getCapability(openai, 'embed'))
    expect(typeof client.embed).toBe('function')
  })

  it('returns the generateText client for a provider that supports generateText', () => {
    const openai = Effect.runSync(getProvider('openai'))
    const client = Effect.runSync(getCapability(openai, 'generateText'))
    expect(typeof client.generateText).toBe('function')
  })
})

describe('getCapability with a hand-rolled runtime', () => {
  // Direct test of the dispatch logic that does not depend on
  // registerDefaultProviders. Useful for confirming that the registry
  // contents (not the registered runtime's own capability slots) drive
  // the supportedAlternatives list.
  beforeEach(() => {
    clearRegistry()
  })

  afterEach(() => {
    clearRegistry()
  })

  it('returns an empty supportedAlternatives list when the registry is empty', () => {
    const orphan: ProviderRuntime = {
      id: 'voyage',
      capabilities: {},
    }
    const result = Effect.runSync(
      Effect.either(getCapability(orphan, 'generateText')),
    )
    expect(result._tag).toBe('Left')
    if (
      result._tag === 'Left' &&
      result.left instanceof CapabilityNotSupported
    ) {
      expect(result.left.supportedAlternatives).toEqual([])
    }
  })
})

describe('getProvider after registerDefaultProviders', () => {
  let envSnapshot: Record<string, string | undefined>
  const trackedKeys: readonly string[] = [
    'OPENAI_API_KEY',
    'OPENROUTER_API_KEY',
    'VOYAGE_API_KEY',
  ]

  beforeEach(() => {
    clearRegistry()
    envSnapshot = snapshotEnv(trackedKeys)
  })

  afterEach(() => {
    clearRegistry()
    restoreEnv(envSnapshot)
  })

  it('surfaces MissingApiKey for openrouter when OPENROUTER_API_KEY is unset', () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    delete process.env.OPENROUTER_API_KEY
    Effect.runSync(registerDefaultProviders())

    const result = Effect.runSync(Effect.either(getProvider('openrouter')))
    expect(result._tag).toBe('Left')
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(MissingApiKey)
      if (result.left instanceof MissingApiKey) {
        expect(result.left.provider).toBe('openrouter')
        expect(result.left.envVar).toBe('OPENROUTER_API_KEY')
        // Actionable-only: the message must mention OPENROUTER_API_KEY
        // and must NOT suggest OPENAI_API_KEY as a fallback.
        expect(result.left.message).toContain('OPENROUTER_API_KEY')
        expect(result.left.message).not.toContain('OPENAI_API_KEY')
      }
    }
  })

  it('surfaces MissingApiKey for openai when OPENAI_API_KEY is unset', () => {
    delete process.env.OPENAI_API_KEY
    process.env.OPENROUTER_API_KEY = 'sk-or-test'
    Effect.runSync(registerDefaultProviders())

    const result = Effect.runSync(Effect.either(getProvider('openai')))
    expect(result._tag).toBe('Left')
    if (result._tag === 'Left' && result.left instanceof MissingApiKey) {
      expect(result.left.provider).toBe('openai')
      expect(result.left.envVar).toBe('OPENAI_API_KEY')
    }
  })

  it('surfaces MissingApiKey for voyage when VOYAGE_API_KEY is unset', () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    delete process.env.VOYAGE_API_KEY
    Effect.runSync(registerDefaultProviders())

    const result = Effect.runSync(Effect.either(getProvider('voyage')))
    expect(result._tag).toBe('Left')
    if (result._tag === 'Left' && result.left instanceof MissingApiKey) {
      expect(result.left.provider).toBe('voyage')
      expect(result.left.envVar).toBe('VOYAGE_API_KEY')
    }
  })

  it('returns the runtime when the credential is set', () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test'
    Effect.runSync(registerDefaultProviders())

    const result = Effect.runSync(getProvider('openrouter'))
    expect(result.id).toBe('openrouter')
    expect(result.baseURL).toBe('https://openrouter.ai/api/v1')
    expect(result.capabilities.embed).toBeDefined()
    expect(result.capabilities.generateText).toBeDefined()
  })

  it('falls through to ProviderNotFound for an id that is not in the default set', () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    Effect.runSync(registerDefaultProviders())

    const result = Effect.runSync(
      Effect.either(getProvider('not-a-real-provider' as ProviderId)),
    )
    expect(result._tag).toBe('Left')
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(ProviderNotFound)
      if (result.left instanceof ProviderNotFound) {
        expect(result.left.id).toBe('not-a-real-provider')
        expect(result.left.message).toContain('not-a-real-provider')
        expect(result.left.message).toContain('openai')
      }
    }
  })

  it('local providers (ollama, lm-studio) register without any env vars set', () => {
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENROUTER_API_KEY
    delete process.env.VOYAGE_API_KEY
    Effect.runSync(registerDefaultProviders())

    const ollama = Effect.runSync(getProvider('ollama'))
    expect(ollama.id).toBe('ollama')
    expect(ollama.capabilities.embed).toBeDefined()
    expect(ollama.capabilities.generateText).toBeDefined()

    const lmStudio = Effect.runSync(getProvider('lm-studio'))
    expect(lmStudio.id).toBe('lm-studio')
  })

  it('a later registerProvider call clears any prior credential failure for the same id', () => {
    delete process.env.OPENROUTER_API_KEY
    Effect.runSync(registerDefaultProviders())

    // Confirm the failure is recorded.
    const failureFirst = Effect.runSync(
      Effect.either(getProvider('openrouter')),
    )
    expect(failureFirst._tag).toBe('Left')
    if (failureFirst._tag === 'Left') {
      expect(failureFirst.left).toBeInstanceOf(MissingApiKey)
    }

    // Re-register with the env var present and confirm the failure is gone.
    process.env.OPENROUTER_API_KEY = 'sk-or-test'
    Effect.runSync(registerDefaultProviders())

    const successSecond = Effect.runSync(getProvider('openrouter'))
    expect(successSecond.id).toBe('openrouter')
  })
})
