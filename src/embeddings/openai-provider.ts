/**
 * OpenAI embedding provider
 */

import { Effect } from 'effect'
import OpenAI from 'openai'
import {
  ApiKeyInvalidError,
  ApiKeyMissingError,
  EmbeddingError,
} from '../errors/index.js'
import type { EmbeddingProvider, EmbeddingResult } from './types.js'

// ============================================================================
// Cost Constants
// ============================================================================

/**
 * OpenAI embedding model pricing data.
 *
 * Prices per 1M tokens. Updated manually - see maintenance process below.
 *
 * Maintenance: Check https://platform.openai.com/docs/pricing quarterly
 * and update lastUpdated + prices if needed.
 */
export const PRICING_DATA = {
  /** Last update date in YYYY-MM format */
  lastUpdated: '2024-09',
  /** Source URL for verification */
  source: 'https://platform.openai.com/docs/pricing',
  /** Prices per 1M tokens by model */
  prices: {
    'text-embedding-3-small': 0.02,
    'text-embedding-3-large': 0.13,
    'text-embedding-ada-002': 0.1,
  } as Record<string, number>,
}

/**
 * Check if pricing data is stale (>90 days old).
 *
 * @returns Warning message if stale, null otherwise
 */
export const checkPricingFreshness = (): string | null => {
  const [year, month] = PRICING_DATA.lastUpdated.split('-').map(Number)
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
 * Get the pricing date for display.
 *
 * @returns Formatted string like "2024-09"
 */
export const getPricingDate = (): string => PRICING_DATA.lastUpdated

// ============================================================================
// OpenAI Provider
// ============================================================================

export interface OpenAIProviderOptions {
  readonly apiKey?: string | undefined
  readonly model?: string | undefined
  readonly batchSize?: number | undefined
  readonly baseURL?: string | undefined
  /**
   * Provider name for error context (e.g., 'ollama', 'lm-studio')
   * Defaults to 'openai' if baseURL is not set
   */
  readonly providerName?: string | undefined
}

export class OpenAIProvider implements EmbeddingProvider {
  readonly name: string
  readonly dimensions: number
  /** Provider name for error context */
  readonly providerName: string
  /** Model name */
  readonly model: string
  /** Base URL for API requests */
  readonly baseURL: string | undefined

  private readonly client: OpenAI
  private readonly batchSize: number

  private constructor(apiKey: string, options: OpenAIProviderOptions = {}) {
    this.baseURL = options.baseURL
    this.client = new OpenAI({
      apiKey,
      baseURL: options.baseURL, // If undefined, SDK uses default https://api.openai.com/v1
    })
    this.model = options.model ?? 'text-embedding-3-small'
    this.batchSize = options.batchSize ?? 100
    // Infer provider name from baseURL if not explicitly provided
    this.providerName =
      options.providerName ?? this.inferProviderName(options.baseURL)
    this.name = `${this.providerName}:${this.model}`
    this.dimensions = 512
  }

  /**
   * Infer the provider name from the baseURL
   */
  private inferProviderName(baseURL: string | undefined): string {
    if (!baseURL) return 'openai'
    if (baseURL.includes('11434')) return 'ollama'
    if (baseURL.includes('1234')) return 'lm-studio'
    if (baseURL.includes('openrouter')) return 'openrouter'
    return 'openai'
  }

  /**
   * Create an OpenAI provider instance.
   * Returns an Effect that fails with ApiKeyMissingError if no API key is available.
   */
  static create(
    options: OpenAIProviderOptions = {},
  ): Effect.Effect<OpenAIProvider, ApiKeyMissingError> {
    // For OpenRouter provider, check OPENROUTER_API_KEY first, then fall back to OPENAI_API_KEY
    const isOpenRouter =
      options.baseURL?.includes('openrouter') ||
      options.providerName === 'openrouter'
    const apiKey =
      options.apiKey ??
      (isOpenRouter ? process.env.OPENROUTER_API_KEY : undefined) ??
      process.env.OPENAI_API_KEY

    if (!apiKey) {
      return Effect.fail(
        new ApiKeyMissingError({
          provider: isOpenRouter ? 'OpenRouter' : 'OpenAI',
          envVar: isOpenRouter ? 'OPENROUTER_API_KEY' : 'OPENAI_API_KEY',
        }),
      )
    }

    // Warn if using OpenAI key format with OpenRouter
    const shouldWarn =
      isOpenRouter && apiKey.startsWith('sk-') && !apiKey.startsWith('sk-or-')

    return Effect.succeed(new OpenAIProvider(apiKey, options)).pipe(
      shouldWarn
        ? Effect.tap(() =>
            Effect.logWarning(
              '⚠️  Using OpenAI key format with OpenRouter. Consider setting OPENROUTER_API_KEY with a key starting with "sk-or-"',
            ),
          )
        : (self) => self,
    )
  }

  async embed(texts: string[]): Promise<EmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], tokensUsed: 0, cost: 0 }
    }

    const allEmbeddings: number[][] = []
    let totalTokens = 0

    try {
      // Process in batches
      for (let i = 0; i < texts.length; i += this.batchSize) {
        const batch = texts.slice(i, i + this.batchSize)

        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
          dimensions: 512, // Ensure consistent dimensions
        })

        for (const item of response.data) {
          allEmbeddings.push(item.embedding)
        }

        totalTokens += response.usage?.total_tokens ?? 0
      }
    } catch (error) {
      // Check for authentication errors (401 Unauthorized, invalid API key)
      if (error instanceof OpenAI.AuthenticationError) {
        throw new ApiKeyInvalidError({
          provider: this.providerName,
          details: error.message,
        })
      }
      // Wrap error with provider context for better error messages
      throw new EmbeddingError({
        reason: this.classifyError(error),
        message: error instanceof Error ? error.message : String(error),
        provider: this.providerName,
        cause: error,
      })
    }

    // Calculate cost (only for paid providers)
    const pricePerMillion =
      this.providerName === 'openai' || this.providerName === 'openrouter'
        ? (PRICING_DATA.prices[this.model] ?? 0.02)
        : 0 // Local providers are free
    const cost = (totalTokens / 1_000_000) * pricePerMillion

    return {
      embeddings: allEmbeddings,
      tokensUsed: totalTokens,
      cost,
    }
  }

  /**
   * Classify an error into a known category for better error handling
   */
  private classifyError(
    error: unknown,
  ): 'RateLimit' | 'QuotaExceeded' | 'Network' | 'ModelError' | 'Unknown' {
    if (!(error instanceof Error)) return 'Unknown'
    const msg = error.message.toLowerCase()

    // Rate limiting
    if (
      msg.includes('429') ||
      msg.includes('rate limit') ||
      msg.includes('too many requests')
    ) {
      return 'RateLimit'
    }

    // Quota/billing issues
    if (
      msg.includes('quota') ||
      msg.includes('insufficient') ||
      msg.includes('billing')
    ) {
      return 'QuotaExceeded'
    }

    // Network issues
    if (
      msg.includes('econnrefused') ||
      msg.includes('timeout') ||
      msg.includes('network') ||
      msg.includes('enotfound') ||
      msg.includes('connection')
    ) {
      return 'Network'
    }

    // Model issues
    if (
      msg.includes('model') &&
      (msg.includes('not found') ||
        msg.includes('not exist') ||
        msg.includes('invalid'))
    ) {
      return 'ModelError'
    }

    return 'Unknown'
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an OpenAI embedding provider.
 * Returns an Effect that fails with ApiKeyMissingError if no API key is available.
 *
 * Usage:
 * ```typescript
 * const provider = yield* createOpenAIProvider()
 * const result = yield* Effect.tryPromise(() => provider.embed(texts))
 * ```
 */
export const createOpenAIProvider = (
  options?: OpenAIProviderOptions,
): Effect.Effect<EmbeddingProvider, ApiKeyMissingError> =>
  OpenAIProvider.create(options)

/**
 * Wrap an embedding operation to catch InvalidApiKeyError thrown during embed().
 * Use this when calling provider.embed() to convert thrown errors to Effect failures.
 *
 * Usage:
 * ```typescript
 * const result = yield* wrapEmbedding(provider.embed(texts))
 * ```
 */
export const wrapEmbedding = (
  embedPromise: Promise<EmbeddingResult>,
): Effect.Effect<EmbeddingResult, ApiKeyInvalidError | EmbeddingError> =>
  Effect.tryPromise({
    try: () => embedPromise,
    catch: (e) => {
      if (e instanceof ApiKeyInvalidError) {
        return e
      }
      return new EmbeddingError({
        reason: 'Unknown',
        message: e instanceof Error ? e.message : String(e),
        provider: 'OpenAI',
        cause: e,
      })
    },
  })
