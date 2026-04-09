/**
 * Embedding model dimension helpers.
 *
 * Dimension validation lives at the embedding layer, not the provider runtime.
 * The runtime is use-case agnostic; knowing that text-embedding-3-small supports
 * Matryoshka reduction is an embedding concern, not a provider concern.
 */

// ============================================================================
// Model Dimension Defaults
// ============================================================================

/**
 * Native embedding dimensions for each model.
 *
 * OpenAI models support Matryoshka Representation Learning (MRL) which allows
 * dimension reduction. Ollama models have fixed native dimensions.
 *
 * Key:
 * - OpenAI: Supports dimension reduction (e.g., 1536 → 512)
 * - Ollama: Fixed native dimensions only
 */
export const MODEL_DIMENSIONS: Record<string, number> = {
  // OpenAI models (support MRL dimension reduction)
  'text-embedding-3-small': 1536, // Native: 1536, supports reduction
  'text-embedding-3-large': 3072, // Native: 3072, supports reduction
  'text-embedding-ada-002': 1536, // Native: 1536, does NOT support reduction

  // Ollama models (fixed native dimensions)
  'nomic-embed-text': 768,
  'mxbai-embed-large': 1024,
  'bge-m3': 1024,
  'all-minilm': 384,
  'snowflake-arctic-embed': 1024,

  // Voyage AI models (fixed native dimensions)
  'voyage-3.5-lite': 1024, // Best value: $0.02/1M tokens
  'voyage-3': 1024, // Higher quality: $0.06/1M tokens
  'voyage-code-3': 1024, // Code-optimized: $0.18/1M tokens
  'voyage-2': 1024,
  'voyage-large-2': 1536,
  'voyage-code-2': 1536,
} as const

/**
 * Models that support Matryoshka dimension reduction.
 * These models can be reduced to smaller dimensions without re-training.
 */
export const MATRYOSHKA_MODELS = new Set([
  'text-embedding-3-small',
  'text-embedding-3-large',
])

/**
 * Check if a model supports dimension reduction via Matryoshka.
 */
export const supportsMatryoshka = (model: string): boolean =>
  MATRYOSHKA_MODELS.has(model)

/**
 * Get the native dimensions for a model.
 *
 * @param model - Model name
 * @returns Native dimensions, or undefined if unknown
 */
export const getModelNativeDimensions = (model: string): number | undefined =>
  MODEL_DIMENSIONS[model]

/**
 * Get recommended dimensions for a model.
 *
 * For Matryoshka models: returns 512 (research-backed optimal balance)
 * For native-only models: returns native dimensions
 * For unknown models: returns undefined
 *
 * @param model - Model name
 * @returns Recommended dimensions, or undefined if unknown
 */
export const getRecommendedDimensions = (model: string): number | undefined => {
  if (supportsMatryoshka(model)) {
    // Research shows 512 is optimal balance of speed/accuracy for OpenAI models
    // See: research/semantic-search/002-research-embedding-models.md
    return 512
  }
  return MODEL_DIMENSIONS[model]
}

/**
 * Validate if requested dimensions are valid for a model.
 *
 * @param model - Model name
 * @param dimensions - Requested dimensions
 * @returns Object with isValid flag and optional warning message
 */
export const validateModelDimensions = (
  model: string,
  dimensions: number,
): { isValid: boolean; warning?: string } => {
  const nativeDims = MODEL_DIMENSIONS[model]

  // Unknown model - allow any dimensions, user takes responsibility
  if (nativeDims === undefined) {
    return { isValid: true }
  }

  // Can't exceed native dimensions
  if (dimensions > nativeDims) {
    return {
      isValid: false,
      warning: `Model '${model}' has ${nativeDims} native dimensions, cannot use ${dimensions}`,
    }
  }

  // Non-Matryoshka models must use native dimensions
  if (!supportsMatryoshka(model) && dimensions !== nativeDims) {
    return {
      isValid: false,
      warning: `Model '${model}' does not support dimension reduction, must use ${nativeDims}`,
    }
  }

  return { isValid: true }
}
