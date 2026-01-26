/**
 * Tests for Cost Estimation Module
 */

import { describe, expect, it } from 'vitest'
import {
  API_PRICING,
  estimateSummaryCost,
  estimateTokens,
  formatCostDisplay,
} from './cost.js'

describe('estimateTokens', () => {
  it('should estimate ~4 chars per token', () => {
    expect(estimateTokens('test')).toBe(1)
    expect(estimateTokens('testtest')).toBe(2)
    expect(estimateTokens('x'.repeat(100))).toBe(25)
  })

  it('should round up partial tokens', () => {
    expect(estimateTokens('abc')).toBe(1) // 0.75 -> 1
    expect(estimateTokens('abcde')).toBe(2) // 1.25 -> 2
  })

  it('should handle empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })
})

describe('estimateSummaryCost', () => {
  describe('CLI providers (free)', () => {
    it('should return isPaid=false for CLI mode', () => {
      const result = estimateSummaryCost('test input', 'cli', 'claude')
      expect(result.isPaid).toBe(false)
      expect(result.estimatedCost).toBe(0)
      expect(result.formattedCost).toBe('FREE (subscription)')
    })

    it('should still estimate tokens for CLI mode', () => {
      const input = 'x'.repeat(400) // ~100 tokens
      const result = estimateSummaryCost(input, 'cli', 'claude')
      expect(result.inputTokens).toBe(100)
      expect(result.outputTokens).toBe(500) // default
    })
  })

  describe('API providers (paid)', () => {
    it('should calculate cost for DeepSeek', () => {
      const input = 'x'.repeat(4000) // ~1000 tokens
      const result = estimateSummaryCost(input, 'api', 'deepseek', 500)

      expect(result.inputTokens).toBe(1000)
      expect(result.outputTokens).toBe(500)
      expect(result.isPaid).toBe(true)
      // Input: 1000 * 0.14 / 1M = 0.00014
      // Output: 500 * 0.56 / 1M = 0.00028
      // Total: 0.00042
      expect(result.estimatedCost).toBeCloseTo(0.00042, 5)
    })

    it('should calculate cost for Anthropic (more expensive)', () => {
      const input = 'x'.repeat(4000) // ~1000 tokens
      const result = estimateSummaryCost(input, 'api', 'anthropic', 500)

      expect(result.isPaid).toBe(true)
      // Input: 1000 * 3.0 / 1M = 0.003
      // Output: 500 * 15.0 / 1M = 0.0075
      // Total: 0.0105
      expect(result.estimatedCost).toBeCloseTo(0.0105, 4)
    })

    it('should calculate cost for OpenAI', () => {
      const input = 'x'.repeat(4000)
      const result = estimateSummaryCost(input, 'api', 'openai', 500)

      expect(result.isPaid).toBe(true)
      // Input: 1000 * 1.75 / 1M = 0.00175
      // Output: 500 * 14.0 / 1M = 0.007
      // Total: 0.00875
      expect(result.estimatedCost).toBeCloseTo(0.00875, 5)
    })

    it('should handle CLI provider used with API mode (falls back to deepseek pricing)', () => {
      const input = 'x'.repeat(4000)
      // When a CLI provider is used with API mode, it falls back to deepseek pricing
      const result = estimateSummaryCost(input, 'api', 'claude', 500)

      expect(result.isPaid).toBe(true)
      expect(result.estimatedCost).toBeCloseTo(0.00042, 5)
    })
  })

  describe('provider comparison', () => {
    it('should show Qwen as cheapest API provider', () => {
      const input = 'x'.repeat(4000)
      const qwen = estimateSummaryCost(input, 'api', 'qwen', 500)
      const deepseek = estimateSummaryCost(input, 'api', 'deepseek', 500)
      const anthropic = estimateSummaryCost(input, 'api', 'anthropic', 500)

      expect(qwen.estimatedCost).toBeLessThan(deepseek.estimatedCost)
      expect(deepseek.estimatedCost).toBeLessThan(anthropic.estimatedCost)
    })
  })
})

describe('formatCostDisplay', () => {
  it('should format free CLI cost', () => {
    const estimate = estimateSummaryCost('test', 'cli', 'claude')
    const display = formatCostDisplay(estimate)
    expect(display).toContain('FREE')
    expect(display).toContain('claude')
  })

  it('should format paid API cost', () => {
    const estimate = estimateSummaryCost('test', 'api', 'deepseek')
    const display = formatCostDisplay(estimate)
    expect(display).toContain('Estimated cost')
    expect(display).toContain('$')
  })
})

describe('API_PRICING', () => {
  it('should have all expected providers', () => {
    expect(API_PRICING.deepseek).toBeDefined()
    expect(API_PRICING.qwen).toBeDefined()
    expect(API_PRICING.anthropic).toBeDefined()
    expect(API_PRICING.openai).toBeDefined()
    expect(API_PRICING.gemini).toBeDefined()
  })

  it('should have valid pricing (input < output)', () => {
    for (const pricing of Object.values(API_PRICING)) {
      expect(pricing.input).toBeGreaterThan(0)
      expect(pricing.output).toBeGreaterThan(0)
      // Output tokens typically cost more
      expect(pricing.output).toBeGreaterThanOrEqual(pricing.input)
    }
  })
})
