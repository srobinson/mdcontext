/**
 * Unit tests for the transport-level helpers on the OpenAI-compatible
 * provider transport. The capability clients themselves are covered
 * indirectly through `registry.test.ts` and `provider-matrix.test.ts`;
 * this file owns the small sync helpers that consumers reach for
 * without constructing a full client (`getProviderEnvVar`,
 * `hasAnyRemoteApiKey`).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getProviderEnvVar, hasAnyRemoteApiKey } from './openai-compatible.js'

const REMOTE_KEYS = ['OPENAI_API_KEY', 'OPENROUTER_API_KEY'] as const

describe('getProviderEnvVar', () => {
  it('returns the canonical env var for each remote provider', () => {
    expect(getProviderEnvVar('openai')).toBe('OPENAI_API_KEY')
    expect(getProviderEnvVar('openrouter')).toBe('OPENROUTER_API_KEY')
  })

  it('returns undefined for local providers that do not read env', () => {
    expect(getProviderEnvVar('ollama')).toBeUndefined()
    expect(getProviderEnvVar('lm-studio')).toBeUndefined()
  })
})

describe('hasAnyRemoteApiKey', () => {
  const original: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of REMOTE_KEYS) {
      original[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const key of REMOTE_KEYS) {
      const value = original[key]
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })

  it('returns false when no remote credential is set', () => {
    expect(hasAnyRemoteApiKey()).toBe(false)
  })

  it('returns true when only OPENAI_API_KEY is set', () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    expect(hasAnyRemoteApiKey()).toBe(true)
  })

  it('returns true when only OPENROUTER_API_KEY is set (finding #1 guard)', () => {
    // Regression guard for the pre-refactor behavior where `isHydeAvailable`
    // hardcoded `process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY`.
    // A user running openrouter-only must see the helper return true without
    // OPENAI_API_KEY being set.
    process.env.OPENROUTER_API_KEY = 'sk-or-test'
    expect(hasAnyRemoteApiKey()).toBe(true)
  })

  it('treats an empty string as unset', () => {
    process.env.OPENAI_API_KEY = ''
    expect(hasAnyRemoteApiKey()).toBe(false)
  })

  it('returns true when both remote credentials are set', () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    process.env.OPENROUTER_API_KEY = 'sk-or-test'
    expect(hasAnyRemoteApiKey()).toBe(true)
  })
})
