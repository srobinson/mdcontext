/**
 * Pricing lookup for provider capabilities.
 *
 * Single source of truth for model pricing, backed by
 * `src/embeddings/pricing.json`. Both embedding and generateText
 * consumers read through `lookupPricing`.
 *
 * Contract:
 *   - A lookup miss returns `undefined`.
 *   - Callers map `undefined` to `cost: 0`. There is no fallback to
 *     "some other model's" pricing, ever.
 *   - Local providers (ollama, lm-studio) are absent from the table
 *     by design and report zero cost.
 */

import pricingData from '../embeddings/pricing.json' with { type: 'json' }
import type { Capability } from './runtime.js'

export interface ModelPricing {
  /** USD per 1M input tokens. */
  readonly input: number
  /** USD per 1M output tokens. Present for `generateText` only. */
  readonly output?: number
}

type PricingTable = Readonly<Record<string, ModelPricing>>

const embedPricing = pricingData.embed as PricingTable
const generateTextPricing = pricingData.generateText as PricingTable

/**
 * Look up pricing for a given capability and model.
 *
 * @returns Pricing for the model, or `undefined` when the model is
 *          not listed. Callers treat `undefined` as `cost: 0`.
 *
 * @example
 *   lookupPricing('embed', 'text-embedding-3-small')
 *   // { input: 0.02 }
 *
 *   lookupPricing('generateText', 'gpt-4o-mini')
 *   // { input: 0.15, output: 0.6 }
 *
 *   lookupPricing('embed', 'nomic-embed-text')
 *   // undefined (local model; caller reports cost: 0)
 */
export const lookupPricing = (
  capability: Capability,
  model: string,
): ModelPricing | undefined => {
  switch (capability) {
    case 'embed':
      return embedPricing[model]
    case 'generateText':
      return generateTextPricing[model]
    case 'rerank':
      return undefined
  }
}

/**
 * Check if pricing data is stale (>90 days old).
 *
 * @returns Warning message when stale, `null` otherwise.
 */
export const checkPricingFreshness = (): string | null => {
  const [year, month] = pricingData.lastUpdated.split('-').map(Number)
  if (!year || !month) return null

  const lastUpdated = new Date(year, month - 1, 1) // Month is 0-indexed
  const now = new Date()
  const daysSince = Math.floor(
    (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (daysSince > 90) {
    return `Pricing data is ${daysSince} days old. May not reflect current rates.`
  }
  return null
}

/**
 * Get the pricing last-updated date.
 *
 * @returns Formatted `YYYY-MM` string.
 */
export const getPricingDate = (): string => pricingData.lastUpdated
