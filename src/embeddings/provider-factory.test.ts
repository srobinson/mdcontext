/**
 * Provider Base URL Sync Tests
 *
 * Locks the per-provider default base URLs to their canonical values.
 * Repointed at the runtime transport (`src/providers/transports/`) after
 * `src/embeddings/provider-factory.ts` was deleted in ALP-1701.
 *
 * The fuller factory test surface lived in this file before the
 * migration. ALP-1704 replaces the deleted coverage with provider-matrix
 * tests against the runtime client contract.
 */

import { describe, expect, it } from 'vitest'
import {
  getProviderBaseURL,
  OPENAI_COMPATIBLE_PROVIDER_IDS,
} from '../providers/transports/openai-compatible.js'
import { getVoyageBaseURL } from '../providers/transports/voyage.js'

describe('Provider base URLs', () => {
  it('openai uses the SDK default (undefined)', () => {
    expect(getProviderBaseURL('openai')).toBeUndefined()
  })

  it('ollama points at the local default', () => {
    expect(getProviderBaseURL('ollama')).toBe('http://localhost:11434/v1')
  })

  it('lm-studio points at the local default', () => {
    expect(getProviderBaseURL('lm-studio')).toBe('http://localhost:1234/v1')
  })

  it('openrouter points at the public API', () => {
    expect(getProviderBaseURL('openrouter')).toBe(
      'https://openrouter.ai/api/v1',
    )
  })

  it('voyage points at the public API', () => {
    expect(getVoyageBaseURL()).toBe('https://api.voyageai.com/v1')
  })

  it('exposes the four OpenAI-compatible providers', () => {
    expect([...OPENAI_COMPATIBLE_PROVIDER_IDS].sort()).toEqual(
      ['lm-studio', 'ollama', 'openai', 'openrouter'].sort(),
    )
  })
})
