/**
 * Embedding types for mdcontext
 */

// ============================================================================
// Embedding Provider
// ============================================================================

export interface EmbeddingProvider {
  readonly name: string
  readonly dimensions: number
  embed(texts: string[]): Promise<EmbeddingResult>
}

/**
 * Extended embedding provider with metadata about the underlying service.
 * Implementations like OpenAIProvider include these additional properties.
 */
export interface EmbeddingProviderWithMetadata extends EmbeddingProvider {
  readonly model: string
  readonly baseURL: string | undefined
}

/**
 * Type guard to check if an EmbeddingProvider has extended metadata.
 * Use this instead of unsafe type casting when accessing model/baseURL.
 */
export const hasProviderMetadata = (
  provider: EmbeddingProvider,
): provider is EmbeddingProviderWithMetadata => {
  return (
    'model' in provider &&
    typeof (provider as EmbeddingProviderWithMetadata).model === 'string'
  )
}

export interface EmbeddingResult {
  readonly embeddings: readonly number[][]
  readonly tokensUsed: number
  readonly cost: number
}

// ============================================================================
// Vector Index
// ============================================================================

export interface VectorEntry {
  readonly id: string
  readonly sectionId: string
  readonly documentPath: string
  readonly heading: string
  readonly embedding: readonly number[]
}

export interface VectorIndex {
  readonly version: number
  readonly provider: string
  readonly providerModel?: string | undefined
  readonly providerBaseURL?: string | undefined
  readonly dimensions: number
  readonly entries: Record<string, VectorEntry>
  readonly totalCost: number
  readonly totalTokens: number
  readonly createdAt: string
  readonly updatedAt: string
}

// ============================================================================
// Semantic Search
// ============================================================================

export interface SemanticSearchOptions {
  /** Maximum number of results */
  readonly limit?: number | undefined
  /** Minimum similarity threshold (0-1) */
  readonly threshold?: number | undefined
  /** Filter by document path pattern */
  readonly pathPattern?: string | undefined
  /** Provider configuration override */
  readonly providerConfig?:
    | {
        readonly provider: 'openai' | 'ollama' | 'lm-studio' | 'openrouter'
        readonly baseURL?: string | undefined
        readonly model?: string | undefined
      }
    | undefined
}

export interface SemanticSearchResult {
  readonly sectionId: string
  readonly documentPath: string
  readonly heading: string
  readonly similarity: number
  readonly content?: string | undefined
}

/**
 * Extended semantic search result including metadata about below-threshold results.
 * Used to provide user feedback when 0 results pass the threshold.
 */
export interface SemanticSearchResultWithStats {
  readonly results: readonly SemanticSearchResult[]
  /** Number of results found below threshold (only set when includeBelowThresholdStats is true) */
  readonly belowThresholdCount?: number | undefined
  /** Highest similarity among below-threshold results */
  readonly belowThresholdHighest?: number | undefined
}

// ============================================================================
// Errors
// ============================================================================
// NOTE: Embedding-related errors are defined in src/errors/index.ts:
// - EmbeddingError: For embedding operation failures (rate limits, quota, network)
// - ApiKeyMissingError: For missing API keys
// - ApiKeyInvalidError: For invalid/rejected API keys
//
// Use these centralized error types instead of defining errors here.
// Example:
//   import { EmbeddingError } from '../errors/index.js'
//   new EmbeddingError({ reason: 'RateLimit', message: 'Rate limited' })
