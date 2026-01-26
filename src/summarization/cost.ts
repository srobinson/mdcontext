/**
 * Cost Estimation for AI Summarization
 *
 * Provides cost estimates for API providers before running queries.
 * CLI providers are free (subscription-based), so cost is always 0.
 */

import type {
  APIProviderName,
  CLIProviderName,
  SummarizationMode,
} from './types.js'

/**
 * Type guard to check if a provider is an API provider
 */
const isAPIProvider = (provider: string): provider is APIProviderName => {
  return ['deepseek', 'anthropic', 'openai', 'gemini', 'qwen'].includes(
    provider,
  )
}

/**
 * Pricing per 1 million tokens for each provider.
 * Values as of January 2026.
 */
export const API_PRICING: Record<
  APIProviderName,
  { input: number; output: number; displayName: string }
> = {
  deepseek: { input: 0.14, output: 0.56, displayName: 'DeepSeek' },
  qwen: { input: 0.03, output: 0.12, displayName: 'Qwen' },
  anthropic: { input: 3.0, output: 15.0, displayName: 'Anthropic Claude' },
  openai: { input: 1.75, output: 14.0, displayName: 'OpenAI GPT' },
  gemini: { input: 0.3, output: 2.5, displayName: 'Google Gemini' },
}

/**
 * Cost estimate result
 */
export interface CostEstimate {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly estimatedCost: number
  readonly provider: string
  readonly isPaid: boolean
  readonly formattedCost: string
}

/**
 * Simple token estimation (4 chars ≈ 1 token).
 */
export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4)
}

/**
 * Estimate the cost of summarizing text.
 */
export const estimateSummaryCost = (
  input: string,
  mode: SummarizationMode,
  provider: CLIProviderName | APIProviderName,
  maxOutputTokens: number = 500,
): CostEstimate => {
  const inputTokens = estimateTokens(input)

  if (mode === 'cli') {
    return {
      inputTokens,
      outputTokens: maxOutputTokens,
      estimatedCost: 0,
      provider,
      isPaid: false,
      formattedCost: 'FREE (subscription)',
    }
  }

  // For API mode, use API pricing (default to deepseek if provider not found)
  const pricing = isAPIProvider(provider)
    ? API_PRICING[provider]
    : API_PRICING.deepseek
  const inputCost = (inputTokens * pricing.input) / 1_000_000
  const outputCost = (maxOutputTokens * pricing.output) / 1_000_000
  const totalCost = inputCost + outputCost

  return {
    inputTokens,
    outputTokens: maxOutputTokens,
    estimatedCost: totalCost,
    provider,
    isPaid: true,
    formattedCost: `$${totalCost.toFixed(4)}`,
  }
}

export const formatCostDisplay = (estimate: CostEstimate): string => {
  if (!estimate.isPaid) {
    return `Using ${estimate.provider} (subscription - FREE)`
  }
  return `Estimated cost: ${estimate.formattedCost}`
}
