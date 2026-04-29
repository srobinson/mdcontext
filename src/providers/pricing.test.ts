/**
 * Unit tests for pricing lookup.
 *
 * Covers:
 *   - Known embed models return correct input-only pricing.
 *   - Known generateText models return input + output pricing.
 *   - Unknown models return undefined (caller maps to cost: 0).
 *   - Local-model patterns (nomic, mxbai) are absent and return undefined.
 *   - checkPricingFreshness / getPricingDate still behave as before.
 */

import { describe, expect, it } from 'vitest'
import {
  checkPricingFreshness,
  getPricingDate,
  lookupPricing,
} from './pricing.js'

describe('lookupPricing', () => {
  describe('embed capability', () => {
    it('returns input-only pricing for OpenAI embedding models', () => {
      expect(lookupPricing('embed', 'text-embedding-3-small')).toEqual({
        input: 0.02,
      })
      expect(lookupPricing('embed', 'text-embedding-3-large')).toEqual({
        input: 0.13,
      })
      expect(lookupPricing('embed', 'text-embedding-ada-002')).toEqual({
        input: 0.1,
      })
    })

    it('returns input-only pricing for Voyage embedding models', () => {
      expect(lookupPricing('embed', 'voyage-4-large')).toEqual({ input: 0.12 })
      expect(lookupPricing('embed', 'voyage-4')).toEqual({ input: 0.06 })
      expect(lookupPricing('embed', 'voyage-4-lite')).toEqual({ input: 0.02 })
      expect(lookupPricing('embed', 'voyage-context-3')).toEqual({
        input: 0.18,
      })
      expect(lookupPricing('embed', 'voyage-3-large')).toEqual({
        input: 0.18,
      })
      expect(lookupPricing('embed', 'voyage-3.5')).toEqual({ input: 0.06 })
      expect(lookupPricing('embed', 'voyage-3.5-lite')).toEqual({ input: 0.02 })
      expect(lookupPricing('embed', 'voyage-3')).toEqual({ input: 0.06 })
      expect(lookupPricing('embed', 'voyage-3-lite')).toEqual({ input: 0.02 })
      expect(lookupPricing('embed', 'voyage-code-3')).toEqual({ input: 0.18 })
      expect(lookupPricing('embed', 'voyage-2')).toEqual({ input: 0.1 })
      expect(lookupPricing('embed', 'voyage-large-2')).toEqual({ input: 0.12 })
      expect(lookupPricing('embed', 'voyage-code-2')).toEqual({ input: 0.12 })
    })

    it('returns undefined for unknown embed models', () => {
      expect(lookupPricing('embed', 'nomic-embed-text')).toBeUndefined()
      expect(lookupPricing('embed', 'mxbai-embed-large')).toBeUndefined()
      expect(lookupPricing('embed', 'does-not-exist')).toBeUndefined()
    })

    it('never leaks output pricing for embed models', () => {
      const pricing = lookupPricing('embed', 'text-embedding-3-small')
      expect(pricing?.output).toBeUndefined()
    })
  })

  describe('generateText capability', () => {
    it('returns input and output pricing for chat models', () => {
      expect(lookupPricing('generateText', 'gpt-4o-mini')).toEqual({
        input: 0.15,
        output: 0.6,
      })
      expect(lookupPricing('generateText', 'gpt-4o')).toEqual({
        input: 2.5,
        output: 10,
      })
      expect(lookupPricing('generateText', 'gpt-4-turbo')).toEqual({
        input: 10,
        output: 30,
      })
      expect(lookupPricing('generateText', 'gpt-3.5-turbo')).toEqual({
        input: 0.5,
        output: 1.5,
      })
    })

    it('returns undefined for unknown chat models', () => {
      expect(lookupPricing('generateText', 'gpt-5')).toBeUndefined()
      expect(lookupPricing('generateText', 'llama3')).toBeUndefined()
    })

    it('does not fall back to gpt-4o-mini pricing for unknown models', () => {
      // Regression guard for the LLM_PRICING[model] ?? LLM_PRICING['gpt-4o-mini']
      // pattern that used to live in hyde.ts.
      expect(lookupPricing('generateText', 'unknown-model')).toBeUndefined()
    })
  })

  describe('rerank capability', () => {
    it('returns undefined for all rerank models (no pricing table yet)', () => {
      expect(lookupPricing('rerank', 'rerank-english-v3.0')).toBeUndefined()
    })
  })

  describe('embed vs generateText isolation', () => {
    it('does not resolve an embed model under generateText', () => {
      expect(
        lookupPricing('generateText', 'text-embedding-3-small'),
      ).toBeUndefined()
    })

    it('does not resolve a chat model under embed', () => {
      expect(lookupPricing('embed', 'gpt-4o-mini')).toBeUndefined()
    })
  })
})

describe('getPricingDate', () => {
  it('returns a YYYY-MM formatted string', () => {
    const date = getPricingDate()
    expect(date).toMatch(/^\d{4}-\d{2}$/)
  })
})

describe('checkPricingFreshness', () => {
  it('returns a string or null without throwing', () => {
    const result = checkPricingFreshness()
    expect(result === null || typeof result === 'string').toBe(true)
  })

  it('warning message mentions day count when stale', () => {
    const result = checkPricingFreshness()
    if (result !== null) {
      expect(result).toMatch(/\d+ days old/)
    }
  })
})
