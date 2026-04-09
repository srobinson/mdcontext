/**
 * Unit tests for the core provider runtime error classes.
 *
 * These tests assert the exact `.message` text each error produces so
 * the CLI boundary cannot silently regress the actionable-only contract:
 * every error names the thing the user has to change (capability,
 * env var, or provider id) without any design rationale, history, or
 * "because" wording.
 *
 * The matrix-level tests in `provider-matrix.test.ts` exercise the same
 * errors through the registry's fail-fast dispatch; this file pins the
 * message format in isolation so a refactor of the registry cannot
 * mask a regression in the error classes themselves.
 */

import { describe, expect, it } from 'vitest'
import {
  CapabilityNotSupported,
  MissingApiKey,
  ProviderNotFound,
} from './errors.js'

describe('CapabilityNotSupported', () => {
  it('carries provider, capability, and supportedAlternatives fields', () => {
    const error = new CapabilityNotSupported({
      provider: 'voyage',
      capability: 'generateText',
      supportedAlternatives: ['openai', 'openrouter'],
    })

    expect(error.provider).toBe('voyage')
    expect(error.capability).toBe('generateText')
    expect(error.supportedAlternatives).toEqual(['openai', 'openrouter'])
  })

  it('produces an actionable message when alternatives are present', () => {
    const error = new CapabilityNotSupported({
      provider: 'voyage',
      capability: 'generateText',
      supportedAlternatives: ['openai', 'openrouter', 'ollama', 'lm-studio'],
    })

    expect(error.message).toBe(
      'voyage does not support generateText. Use one of: openai, openrouter, ollama, lm-studio.',
    )
  })

  it('omits the "Use one of" hint when no alternatives are registered', () => {
    // Empty registry case: the registry has no providers that satisfy
    // the capability, so there is no list to suggest. The message still
    // tells the user which capability is unavailable.
    const error = new CapabilityNotSupported({
      provider: 'voyage',
      capability: 'generateText',
      supportedAlternatives: [],
    })

    expect(error.message).toBe('voyage does not support generateText.')
  })

  it('carries the Effect tagged-error tag', () => {
    const error = new CapabilityNotSupported({
      provider: 'voyage',
      capability: 'generateText',
      supportedAlternatives: [],
    })

    expect(error._tag).toBe('CapabilityNotSupported')
  })

  it('is actionable-only: no rationale, history, or "because" wording', () => {
    const error = new CapabilityNotSupported({
      provider: 'voyage',
      capability: 'generateText',
      supportedAlternatives: ['openai'],
    })

    const message = error.message.toLowerCase()
    expect(message).not.toContain('because')
    expect(message).not.toContain('rationale')
    expect(message).not.toContain('previously')
    expect(message).not.toContain('deprecated')
  })
})

describe('MissingApiKey', () => {
  it('carries provider and envVar fields', () => {
    const error = new MissingApiKey({
      provider: 'openrouter',
      envVar: 'OPENROUTER_API_KEY',
    })

    expect(error.provider).toBe('openrouter')
    expect(error.envVar).toBe('OPENROUTER_API_KEY')
  })

  it('produces an actionable message naming the exact env var to set', () => {
    const error = new MissingApiKey({
      provider: 'openrouter',
      envVar: 'OPENROUTER_API_KEY',
    })

    expect(error.message).toBe(
      'openrouter requires OPENROUTER_API_KEY. Set OPENROUTER_API_KEY in your environment.',
    )
  })

  it('names openai when the provider is openai', () => {
    const error = new MissingApiKey({
      provider: 'openai',
      envVar: 'OPENAI_API_KEY',
    })

    expect(error.message).toBe(
      'openai requires OPENAI_API_KEY. Set OPENAI_API_KEY in your environment.',
    )
  })

  it('never suggests OPENAI_API_KEY as a cross-provider fallback', () => {
    // Regression guard for the pre-refactor openrouter path that used to
    // fall back to OPENAI_API_KEY. The actionable error for openrouter
    // must point at OPENROUTER_API_KEY and nothing else.
    const error = new MissingApiKey({
      provider: 'openrouter',
      envVar: 'OPENROUTER_API_KEY',
    })

    expect(error.message).not.toContain('OPENAI_API_KEY')
  })

  it('carries the Effect tagged-error tag', () => {
    const error = new MissingApiKey({
      provider: 'voyage',
      envVar: 'VOYAGE_API_KEY',
    })

    expect(error._tag).toBe('MissingApiKey')
  })
})

describe('ProviderNotFound', () => {
  it('carries id and known fields', () => {
    const error = new ProviderNotFound({
      id: 'not-a-real-provider',
      known: ['openai', 'openrouter'],
    })

    expect(error.id).toBe('not-a-real-provider')
    expect(error.known).toEqual(['openai', 'openrouter'])
  })

  it('lists the known providers in the message', () => {
    const error = new ProviderNotFound({
      id: 'typo-provider',
      known: ['openai', 'openrouter', 'ollama', 'lm-studio', 'voyage'],
    })

    expect(error.message).toBe(
      'Provider "typo-provider" is not registered. Known providers: openai, openrouter, ollama, lm-studio, voyage.',
    )
  })

  it('shows "(none registered)" when the registry is empty', () => {
    const error = new ProviderNotFound({
      id: 'openai',
      known: [],
    })

    expect(error.message).toBe(
      'Provider "openai" is not registered. Known providers: (none registered).',
    )
  })

  it('carries the Effect tagged-error tag', () => {
    const error = new ProviderNotFound({
      id: 'foo',
      known: [],
    })

    expect(error._tag).toBe('ProviderNotFound')
  })
})
