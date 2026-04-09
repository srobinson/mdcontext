/**
 * Tests for `resolveHydeOptions` — the fallback chain that decides which
 * provider, baseURL, model, credentials, and system prompt the HyDE call
 * should receive when `semanticSearch` is invoked with `hyde: true`.
 *
 * These tests do not exercise the OpenAI client at all. They guard the
 * resolution logic in isolation so that future refactors of either the
 * embedding-side `providerConfig` shape or the HyDE-side options surface
 * cannot silently regress the precedence rules.
 *
 * Precedence under test:
 *   1. Explicit `hydeOptions.*` always wins.
 *   2. Otherwise inherit `provider` and (when the resolved provider matches)
 *      `baseURL` from `options.providerConfig`.
 *   3. Voyage embedding provider fails fast with `CapabilityNotSupported`
 *      when no explicit HyDE provider override is pinned. Voyage AI has no
 *      chat completions endpoint, so silently falling back to openai used
 *      to mask the real cause of credential errors.
 *   4. Otherwise leave the field undefined so `generateHypotheticalDocument`
 *      can apply its per-provider defaults.
 */

import { Effect, Redacted } from 'effect'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CapabilityNotSupported,
  clearRegistry,
  registerProvider,
  type TextClient,
} from '../providers/index.js'
import { resolveHydeOptions } from './hyde-options.js'
import type { SemanticSearchOptions } from './types.js'

const runResolve = (options: SemanticSearchOptions) =>
  Effect.runSync(resolveHydeOptions(options))

const runResolveEither = (options: SemanticSearchOptions) =>
  Effect.runSync(Effect.either(resolveHydeOptions(options)))

describe('resolveHydeOptions provider resolution', () => {
  it('defaults to openai when no provider info is set anywhere', () => {
    const resolved = runResolve({})

    expect(resolved.provider).toBe('openai')
    expect(resolved.baseURL).toBeUndefined()
  })

  it('inherits provider from embedding-side providerConfig', () => {
    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'ollama' },
    }

    const resolved = runResolve(options)
    expect(resolved.provider).toBe('ollama')
  })

  it('fails fast with CapabilityNotSupported when embedding side is voyage', () => {
    // Voyage AI has no chat completions API. The previous resolver
    // silently substituted openai, which surfaced as a misleading
    // OPENAI_API_KEY error inside HyDE for users running voyage-only.
    // ALP-1703 contract: fail fast with the actionable capability error.
    // The alternatives payload is asserted separately against the live
    // registry in the "voyage fail-fast alternatives" describe block.
    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'voyage' },
    }

    const result = runResolveEither(options)
    expect(result._tag).toBe('Left')
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(CapabilityNotSupported)
      expect(result.left.provider).toBe('voyage')
      expect(result.left.capability).toBe('generateText')
    }
  })

  it('lets explicit hydeOptions.provider override the voyage capability check', () => {
    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'voyage' },
      hydeOptions: { provider: 'lm-studio' },
    }

    const resolved = runResolve(options)
    expect(resolved.provider).toBe('lm-studio')
  })

  it('lets explicit hydeOptions.provider override matching embedding provider', () => {
    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'openai' },
      hydeOptions: { provider: 'openrouter' },
    }

    const resolved = runResolve(options)
    expect(resolved.provider).toBe('openrouter')
  })
})

describe('resolveHydeOptions baseURL resolution', () => {
  it('inherits baseURL when HyDE provider matches embedding provider', () => {
    const options: SemanticSearchOptions = {
      providerConfig: {
        provider: 'ollama',
        baseURL: 'http://my-ollama:11434/v1',
      },
    }

    const resolved = runResolve(options)
    expect(resolved.provider).toBe('ollama')
    expect(resolved.baseURL).toBe('http://my-ollama:11434/v1')
  })

  it('inherits baseURL when HyDE provider is explicitly pinned to the embedding provider', () => {
    // Finding #2: a caller that explicitly sets hydeOptions.provider to
    // the same value as the embedding provider should still get the
    // embedding side's custom baseURL. The previous resolver gated
    // inheritance on `hydeOptions?.provider === undefined`, which
    // silently dropped the baseURL the moment the caller named the
    // provider — even though it was the same provider.
    const options: SemanticSearchOptions = {
      providerConfig: {
        provider: 'ollama',
        baseURL: 'http://my-ollama:11434/v1',
      },
      hydeOptions: { provider: 'ollama' },
    }

    const resolved = runResolve(options)
    expect(resolved.provider).toBe('ollama')
    expect(resolved.baseURL).toBe('http://my-ollama:11434/v1')
  })

  it('does not inherit baseURL when hydeOptions.provider diverges', () => {
    // The embedding side is pointed at a private ollama, but the user has
    // explicitly asked HyDE to use openrouter. Inheriting the ollama URL
    // would aim the chat client at the wrong host.
    const options: SemanticSearchOptions = {
      providerConfig: {
        provider: 'ollama',
        baseURL: 'http://my-ollama:11434/v1',
      },
      hydeOptions: { provider: 'openrouter' },
    }

    const resolved = runResolve(options)
    expect(resolved.provider).toBe('openrouter')
    expect(resolved.baseURL).toBeUndefined()
  })

  it('does not inherit baseURL when voyage caller pins an alternative HyDE provider', () => {
    // Voyage embedding side with an explicit override to a chat-capable
    // provider: voyage's baseURL is the wrong host for openai-compatible
    // chat completions, so it must not be inherited even though the
    // voyage provider config carries one.
    const options: SemanticSearchOptions = {
      providerConfig: {
        provider: 'voyage',
        baseURL: 'https://api.voyageai.com/v1',
      },
      hydeOptions: { provider: 'openai' },
    }

    const resolved = runResolve(options)
    expect(resolved.provider).toBe('openai')
    expect(resolved.baseURL).toBeUndefined()
  })

  it('lets explicit hydeOptions.baseURL override the inherited value', () => {
    const options: SemanticSearchOptions = {
      providerConfig: {
        provider: 'ollama',
        baseURL: 'http://my-ollama:11434/v1',
      },
      hydeOptions: {
        baseURL: 'http://other-host:8080/v1',
      },
    }

    const resolved = runResolve(options)
    expect(resolved.baseURL).toBe('http://other-host:8080/v1')
  })

  it('lets explicit hydeOptions.baseURL apply when no providerConfig is set', () => {
    const options: SemanticSearchOptions = {
      hydeOptions: {
        baseURL: 'http://override-only:1234/v1',
      },
    }

    const resolved = runResolve(options)
    expect(resolved.provider).toBe('openai')
    expect(resolved.baseURL).toBe('http://override-only:1234/v1')
  })
})

describe('resolveHydeOptions credential and prompt forwarding', () => {
  it('forwards an explicit string apiKey unchanged', () => {
    const options: SemanticSearchOptions = {
      hydeOptions: { apiKey: 'sk-explicit' },
    }

    const resolved = runResolve(options)
    expect(resolved.apiKey).toBe('sk-explicit')
  })

  it('forwards an explicit Redacted apiKey unchanged', () => {
    const redactedKey = Redacted.make('sk-redacted')
    const options: SemanticSearchOptions = {
      hydeOptions: { apiKey: redactedKey },
    }

    const resolved = runResolve(options)
    expect(Redacted.isRedacted(resolved.apiKey)).toBe(true)
    if (Redacted.isRedacted(resolved.apiKey)) {
      expect(Redacted.value(resolved.apiKey)).toBe('sk-redacted')
    }
  })

  it('returns undefined apiKey when nothing is set, leaving env fallback to hyde.ts', () => {
    const resolved = runResolve({})
    expect(resolved.apiKey).toBeUndefined()
  })

  it('does not pull apiKey from providerConfig (which has no public apiKey field)', () => {
    // The public providerConfig surface deliberately omits apiKey. Even if
    // a future field collision tried to leak credentials across, the
    // resolver should refuse to read them.
    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'openai' },
    }

    const resolved = runResolve(options)
    expect(resolved.apiKey).toBeUndefined()
  })

  it('forwards systemPrompt verbatim', () => {
    const options: SemanticSearchOptions = {
      hydeOptions: {
        systemPrompt: 'Answer in fewer than 100 words.',
      },
    }

    const resolved = runResolve(options)
    expect(resolved.systemPrompt).toBe('Answer in fewer than 100 words.')
  })

  it('forwards model, maxTokens, and temperature verbatim', () => {
    const options: SemanticSearchOptions = {
      hydeOptions: {
        model: 'qwen2.5:14b',
        maxTokens: 768,
        temperature: 0.1,
      },
    }

    const resolved = runResolve(options)
    expect(resolved.model).toBe('qwen2.5:14b')
    expect(resolved.maxTokens).toBe(768)
    expect(resolved.temperature).toBe(0.1)
  })

  it('leaves model unset when hydeOptions does not pin it (so per-provider defaults apply)', () => {
    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'ollama' },
    }

    const resolved = runResolve(options)
    // resolveHydeOptions intentionally leaves model unset; the default lookup
    // happens inside generateHypotheticalDocument to keep both layers honest.
    expect(resolved.model).toBeUndefined()
  })
})

describe('resolveHydeOptions voyage fail-fast alternatives (runtime-derived)', () => {
  // ALP-1711: the `supportedAlternatives` payload for the voyage
  // fail-fast is read from `getProvidersForCapability('generateText')`
  // at resolve time, not from a static constant. This block installs a
  // deliberate subset of provider runtimes so the assertion proves the
  // list reflects the live registry — a static source would still
  // include all four default OpenAI-compatible providers.
  const fakeTextClient: TextClient = {
    generateText: () =>
      Effect.succeed({
        text: 'unused',
        model: 'fake',
      }),
  }

  beforeEach(() => {
    clearRegistry()
    registerProvider({
      id: 'openai',
      capabilities: { generateText: fakeTextClient },
    })
    registerProvider({
      id: 'ollama',
      capabilities: { generateText: fakeTextClient },
    })
  })

  afterEach(() => {
    clearRegistry()
  })

  it('carries exactly the registered providers that support generateText', () => {
    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'voyage' },
    }

    const result = runResolveEither(options)
    expect(result._tag).toBe('Left')
    if (
      result._tag === 'Left' &&
      result.left instanceof CapabilityNotSupported
    ) {
      expect(result.left.supportedAlternatives).toEqual(['openai', 'ollama'])
    }
  })

  it('reflects a registry where the set changes between calls', () => {
    // Add a third provider mid-test and re-resolve: the new error must
    // carry the expanded list. Proves the lookup is live, not cached.
    registerProvider({
      id: 'lm-studio',
      capabilities: { generateText: fakeTextClient },
    })

    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'voyage' },
    }

    const result = runResolveEither(options)
    expect(result._tag).toBe('Left')
    if (
      result._tag === 'Left' &&
      result.left instanceof CapabilityNotSupported
    ) {
      expect(result.left.supportedAlternatives).toEqual([
        'openai',
        'ollama',
        'lm-studio',
      ])
    }
  })

  it('returns an empty alternatives list when no generateText providers are registered', () => {
    // Wipe the two fakes installed in beforeEach and register only an
    // embed-only provider (voyage-shaped). The fail-fast should still
    // trigger but the actionable list is legitimately empty: the caller
    // has no other choice in this registry.
    clearRegistry()
    registerProvider({
      id: 'voyage',
      capabilities: {},
    })

    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'voyage' },
    }

    const result = runResolveEither(options)
    expect(result._tag).toBe('Left')
    if (
      result._tag === 'Left' &&
      result.left instanceof CapabilityNotSupported
    ) {
      expect(result.left.supportedAlternatives).toEqual([])
    }
  })
})
