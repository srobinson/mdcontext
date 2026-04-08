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
 *   3. Voyage embedding provider falls back to openai because Voyage AI has
 *      no chat completions endpoint.
 *   4. Otherwise leave the field undefined so `generateHypotheticalDocument`
 *      can apply its per-provider defaults.
 */

import { Redacted } from 'effect'
import { describe, expect, it } from 'vitest'
import { resolveHydeOptions } from './hyde-options.js'
import type { SemanticSearchOptions } from './types.js'

describe('resolveHydeOptions provider resolution', () => {
  it('defaults to openai when no provider info is set anywhere', () => {
    const resolved = resolveHydeOptions({})

    expect(resolved.provider).toBe('openai')
    expect(resolved.baseURL).toBeUndefined()
  })

  it('inherits provider from embedding-side providerConfig', () => {
    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'ollama' },
    }

    const resolved = resolveHydeOptions(options)
    expect(resolved.provider).toBe('ollama')
  })

  it('falls back to openai when embedding side is voyage', () => {
    // Voyage AI has no chat completions API, so HyDE silently rebinds to
    // openai and the call site logs a debug message about the substitution.
    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'voyage' },
    }

    const resolved = resolveHydeOptions(options)
    expect(resolved.provider).toBe('openai')
  })

  it('lets explicit hydeOptions.provider override voyage fallback', () => {
    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'voyage' },
      hydeOptions: { provider: 'lm-studio' },
    }

    const resolved = resolveHydeOptions(options)
    expect(resolved.provider).toBe('lm-studio')
  })

  it('lets explicit hydeOptions.provider override matching embedding provider', () => {
    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'openai' },
      hydeOptions: { provider: 'openrouter' },
    }

    const resolved = resolveHydeOptions(options)
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

    const resolved = resolveHydeOptions(options)
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

    const resolved = resolveHydeOptions(options)
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

    const resolved = resolveHydeOptions(options)
    expect(resolved.provider).toBe('openrouter')
    expect(resolved.baseURL).toBeUndefined()
  })

  it('does not inherit baseURL when embedding side is voyage', () => {
    // Voyage falls back to openai for HyDE, and voyage's baseURL is the
    // wrong host for openai chat completions.
    const options: SemanticSearchOptions = {
      providerConfig: {
        provider: 'voyage',
        baseURL: 'https://api.voyageai.com/v1',
      },
    }

    const resolved = resolveHydeOptions(options)
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

    const resolved = resolveHydeOptions(options)
    expect(resolved.baseURL).toBe('http://other-host:8080/v1')
  })

  it('lets explicit hydeOptions.baseURL apply when no providerConfig is set', () => {
    const options: SemanticSearchOptions = {
      hydeOptions: {
        baseURL: 'http://override-only:1234/v1',
      },
    }

    const resolved = resolveHydeOptions(options)
    expect(resolved.provider).toBe('openai')
    expect(resolved.baseURL).toBe('http://override-only:1234/v1')
  })
})

describe('resolveHydeOptions credential and prompt forwarding', () => {
  it('forwards an explicit string apiKey unchanged', () => {
    const options: SemanticSearchOptions = {
      hydeOptions: { apiKey: 'sk-explicit' },
    }

    const resolved = resolveHydeOptions(options)
    expect(resolved.apiKey).toBe('sk-explicit')
  })

  it('forwards an explicit Redacted apiKey unchanged', () => {
    const redactedKey = Redacted.make('sk-redacted')
    const options: SemanticSearchOptions = {
      hydeOptions: { apiKey: redactedKey },
    }

    const resolved = resolveHydeOptions(options)
    expect(Redacted.isRedacted(resolved.apiKey)).toBe(true)
    if (Redacted.isRedacted(resolved.apiKey)) {
      expect(Redacted.value(resolved.apiKey)).toBe('sk-redacted')
    }
  })

  it('returns undefined apiKey when nothing is set, leaving env fallback to hyde.ts', () => {
    const resolved = resolveHydeOptions({})
    expect(resolved.apiKey).toBeUndefined()
  })

  it('does not pull apiKey from providerConfig (which has no public apiKey field)', () => {
    // The public providerConfig surface deliberately omits apiKey. Even if
    // a future field collision tried to leak credentials across, the
    // resolver should refuse to read them.
    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'openai' },
    }

    const resolved = resolveHydeOptions(options)
    expect(resolved.apiKey).toBeUndefined()
  })

  it('forwards systemPrompt verbatim', () => {
    const options: SemanticSearchOptions = {
      hydeOptions: {
        systemPrompt: 'Answer in fewer than 100 words.',
      },
    }

    const resolved = resolveHydeOptions(options)
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

    const resolved = resolveHydeOptions(options)
    expect(resolved.model).toBe('qwen2.5:14b')
    expect(resolved.maxTokens).toBe(768)
    expect(resolved.temperature).toBe(0.1)
  })

  it('leaves model unset when hydeOptions does not pin it (so per-provider defaults apply)', () => {
    const options: SemanticSearchOptions = {
      providerConfig: { provider: 'ollama' },
    }

    const resolved = resolveHydeOptions(options)
    // resolveHydeOptions intentionally leaves model unset; the default lookup
    // happens inside generateHypotheticalDocument to keep both layers honest.
    expect(resolved.model).toBeUndefined()
  })
})
