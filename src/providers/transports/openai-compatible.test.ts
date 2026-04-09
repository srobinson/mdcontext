/**
 * Unit tests for the transport-level helpers on the OpenAI-compatible
 * provider transport. The capability clients themselves are covered
 * indirectly through `registry.test.ts` and `provider-matrix.test.ts`;
 * this file owns the small sync helpers that consumers reach for
 * without constructing a full client (`getProviderEnvVar`,
 * `hasAnyRemoteApiKey`, `getEffectiveBaseURL`).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  getEffectiveBaseURL,
  getProviderEnvVar,
  hasAnyRemoteApiKey,
  inferProviderFromErrorMessage,
} from './openai-compatible.js'

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

describe('getEffectiveBaseURL', () => {
  it('returns the transport default when no override is supplied', () => {
    // Locks the fact that the helper mirrors `getProviderBaseURL` when
    // called bare. `openai` intentionally returns undefined so the SDK
    // can pick its own default.
    expect(getEffectiveBaseURL('openai')).toBeUndefined()
    expect(getEffectiveBaseURL('ollama')).toBe('http://localhost:11434/v1')
    expect(getEffectiveBaseURL('lm-studio')).toBe('http://localhost:1234/v1')
    expect(getEffectiveBaseURL('openrouter')).toBe(
      'https://openrouter.ai/api/v1',
    )
  })

  it('returns the override when baseURL is supplied', () => {
    expect(
      getEffectiveBaseURL('ollama', {
        baseURL: 'http://my-private-host:9999/v1',
      }),
    ).toBe('http://my-private-host:9999/v1')
  })

  it('falls back to the default when overrides.baseURL is explicitly undefined', () => {
    // Consumers pass `{ baseURL: providerConfig.baseURL }` without a
    // conditional, so the field is frequently `{ baseURL: undefined }`.
    // The helper must treat that as "no override", not as a request to
    // erase the transport default.
    expect(getEffectiveBaseURL('ollama', { baseURL: undefined })).toBe(
      'http://localhost:11434/v1',
    )
  })

  it('ignores an apiKey-only override and still returns the default baseURL', () => {
    expect(getEffectiveBaseURL('openrouter', { apiKey: 'sk-test' })).toBe(
      'https://openrouter.ai/api/v1',
    )
  })

  it('returns a custom URL even when it happens to equal the default', () => {
    // Regression guard: a naive implementation that compared override
    // against default and returned the default on equality would lose
    // caller intent. The helper must return the override verbatim.
    expect(
      getEffectiveBaseURL('ollama', { baseURL: 'http://localhost:11434/v1' }),
    ).toBe('http://localhost:11434/v1')
  })
})

describe('inferProviderFromErrorMessage', () => {
  it('detects ollama from its default port (11434)', () => {
    expect(
      inferProviderFromErrorMessage('connect ECONNREFUSED 127.0.0.1:11434'),
    ).toBe('ollama')
  })

  it('detects lm-studio from its default port (1234)', () => {
    expect(
      inferProviderFromErrorMessage('connect ECONNREFUSED 127.0.0.1:1234'),
    ).toBe('lm-studio')
  })

  it('returns undefined for messages without a recognized port', () => {
    expect(
      inferProviderFromErrorMessage('connect ECONNREFUSED 127.0.0.1:8080'),
    ).toBeUndefined()
  })

  it('returns undefined for messages with no port at all', () => {
    // Remote providers (openai, openrouter) have implicit standard
    // ports, so they can never be identified via port-string matching.
    // The helper must fail closed rather than guessing.
    expect(
      inferProviderFromErrorMessage('401 Unauthorized from api.openai.com'),
    ).toBeUndefined()
  })

  it('returns undefined for an empty message', () => {
    expect(inferProviderFromErrorMessage('')).toBeUndefined()
  })
})
