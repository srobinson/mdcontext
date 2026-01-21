/**
 * OpenAI embedding provider
 */

import { Console, Effect } from 'effect'
import OpenAI from 'openai'
import type { EmbeddingProvider, EmbeddingResult } from './types.js'

// ============================================================================
// Cost Constants
// ============================================================================

// Prices per 1M tokens (as of 2024)
const PRICING: Record<string, number> = {
  'text-embedding-3-small': 0.02,
  'text-embedding-3-large': 0.13,
  'text-embedding-ada-002': 0.1,
}

// ============================================================================
// Error Classes
// ============================================================================

export class MissingApiKeyError extends Error {
  constructor() {
    super('OPENAI_API_KEY not set')
    this.name = 'MissingApiKeyError'
  }
}

export class InvalidApiKeyError extends Error {
  constructor(message?: string) {
    super(message ?? 'Invalid OPENAI_API_KEY')
    this.name = 'InvalidApiKeyError'
  }
}

// ============================================================================
// OpenAI Provider
// ============================================================================

export interface OpenAIProviderOptions {
  readonly apiKey?: string | undefined
  readonly model?: string | undefined
  readonly batchSize?: number | undefined
}

export class OpenAIProvider implements EmbeddingProvider {
  readonly name: string
  readonly dimensions: number

  private readonly client: OpenAI
  private readonly model: string
  private readonly batchSize: number

  constructor(options: OpenAIProviderOptions = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new MissingApiKeyError()
    }

    this.client = new OpenAI({ apiKey })
    this.model = options.model ?? 'text-embedding-3-small'
    this.batchSize = options.batchSize ?? 100
    this.name = `openai:${this.model}`
    this.dimensions = 512
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
        throw new InvalidApiKeyError(error.message)
      }
      throw error
    }

    // Calculate cost
    const pricePerMillion = PRICING[this.model] ?? 0.02
    const cost = (totalTokens / 1_000_000) * pricePerMillion

    return {
      embeddings: allEmbeddings,
      tokensUsed: totalTokens,
      cost,
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export const createOpenAIProvider = (
  options?: OpenAIProviderOptions,
): EmbeddingProvider => new OpenAIProvider(options)

// ============================================================================
// Error Handler Utility
// ============================================================================

/**
 * Catches OpenAI API key errors and displays helpful messages.
 * Use with Effect.pipe after operations that may throw MissingApiKeyError or InvalidApiKeyError.
 */
export const handleApiKeyError = <A, E>(
  effect: Effect.Effect<A, E | MissingApiKeyError | InvalidApiKeyError>,
): Effect.Effect<A, E | Error> =>
  effect.pipe(
    Effect.catchIf(
      (e): e is MissingApiKeyError => e instanceof MissingApiKeyError,
      () =>
        Effect.gen(function* () {
          yield* Console.error('')
          yield* Console.error('Error: OPENAI_API_KEY not set')
          yield* Console.error('')
          yield* Console.error(
            'To use semantic search, set your OpenAI API key:',
          )
          yield* Console.error('  export OPENAI_API_KEY=sk-...')
          yield* Console.error('')
          yield* Console.error('Or add to .env file in project root.')
          return yield* Effect.fail(new Error('Missing API key'))
        }),
    ),
    Effect.catchIf(
      (e): e is InvalidApiKeyError => e instanceof InvalidApiKeyError,
      (e) =>
        Effect.gen(function* () {
          yield* Console.error('')
          yield* Console.error('Error: Invalid OPENAI_API_KEY')
          yield* Console.error('')
          yield* Console.error('The provided API key was rejected by OpenAI.')
          yield* Console.error('Please check your API key is correct:')
          yield* Console.error('  export OPENAI_API_KEY=sk-...')
          yield* Console.error('')
          yield* Console.error(`Details: ${e.message}`)
          return yield* Effect.fail(new Error('Invalid API key'))
        }),
    ),
  )
