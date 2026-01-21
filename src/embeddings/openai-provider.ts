/**
 * OpenAI embedding provider
 */

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
// OpenAI Provider
// ============================================================================

export interface OpenAIProviderOptions {
  readonly apiKey?: string | undefined
  readonly model?: string | undefined
  readonly batchSize?: number | undefined
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('OPENAI_API_KEY not set')
    this.name = 'MissingApiKeyError'
  }
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
