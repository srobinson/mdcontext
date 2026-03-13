/**
 * Provider-Specific Error Detection and Handling
 *
 * This module provides utilities to detect and classify errors from different
 * embedding providers (Ollama, LM Studio, OpenRouter) and transform them into
 * user-friendly error messages with actionable suggestions.
 *
 * ## Supported Providers
 *
 * - **Ollama**: Local daemon-based embedding (port 11434)
 * - **LM Studio**: GUI-based local embedding (port 1234)
 * - **OpenRouter**: API gateway for multiple providers
 *
 * ## Usage
 *
 * ```typescript
 * import { detectProviderError, getProviderSuggestions } from './provider-errors.js'
 *
 * try {
 *   await client.embeddings.create(...)
 * } catch (error) {
 *   const providerError = detectProviderError('ollama', error)
 *   if (providerError) {
 *     console.log(providerError.userMessage)
 *     console.log(getProviderSuggestions(providerError))
 *   }
 * }
 * ```
 */

import type { EmbeddingProviderName } from '../config/schema.js'
import { PROVIDER_PORTS } from './provider-constants.js'

// ============================================================================
// Provider Error Types
// ============================================================================

/**
 * Types of provider-specific errors
 */
export type ProviderErrorType =
  // Connection errors (local providers)
  | 'daemon-not-running'
  | 'gui-not-running'
  | 'connection-refused'
  | 'connection-timeout'
  // Model errors
  | 'model-not-found'
  | 'model-loading'
  | 'model-not-ready'
  // API errors (remote providers)
  | 'invalid-api-key'
  | 'rate-limited'
  | 'quota-exceeded'
  | 'model-unavailable'
  // Generic
  | 'network-error'
  | 'unknown'

/**
 * Structured provider error with context for user-friendly display
 */
export interface ProviderError {
  readonly type: ProviderErrorType
  readonly provider: EmbeddingProviderName
  readonly message: string
  readonly model?: string | undefined
  readonly originalError: unknown
}

// ============================================================================
// Port Detection
// ============================================================================

/**
 * Detect which provider an error is from based on port number.
 * Uses PROVIDER_PORTS from provider-constants.ts as single source of truth.
 */
const detectProviderFromPort = (
  error: Error,
): EmbeddingProviderName | undefined => {
  const message = error.message
  for (const [provider, port] of Object.entries(PROVIDER_PORTS)) {
    if (port && message.includes(String(port))) {
      return provider as EmbeddingProviderName
    }
  }
  return undefined
}

// ============================================================================
// Ollama Error Detection
// ============================================================================

/**
 * Detect Ollama-specific errors
 */
const detectOllamaError = (error: unknown): ProviderError | null => {
  if (!(error instanceof Error)) return null

  const message = error.message.toLowerCase()

  // Connection refused - daemon not running
  if (
    message.includes('econnrefused') ||
    message.includes('connect econnrefused') ||
    message.includes('connection refused')
  ) {
    // Check if it's Ollama's port
    if (
      error.message.includes('11434') ||
      error.message.includes('localhost:11434')
    ) {
      return {
        type: 'daemon-not-running',
        provider: 'ollama',
        message: 'Ollama daemon is not running',
        originalError: error,
      }
    }
  }

  // Model not found
  if (
    message.includes('model') &&
    (message.includes('not found') || message.includes('does not exist'))
  ) {
    const model = extractModelName(error.message)
    return {
      type: 'model-not-found',
      provider: 'ollama',
      message: model
        ? `Model '${model}' is not installed in Ollama`
        : 'Requested model is not installed in Ollama',
      model,
      originalError: error,
    }
  }

  // Model loading/not ready
  if (
    message.includes('not ready') ||
    message.includes('loading') ||
    message.includes('initializing')
  ) {
    const model = extractModelName(error.message)
    return {
      type: 'model-loading',
      provider: 'ollama',
      message: model
        ? `Model '${model}' is still loading`
        : 'Model is still loading',
      model,
      originalError: error,
    }
  }

  return null
}

// ============================================================================
// LM Studio Error Detection
// ============================================================================

/**
 * Detect LM Studio-specific errors
 */
const detectLMStudioError = (error: unknown): ProviderError | null => {
  if (!(error instanceof Error)) return null

  const message = error.message.toLowerCase()

  // Connection refused - GUI not running
  if (
    message.includes('econnrefused') ||
    message.includes('connect econnrefused') ||
    message.includes('connection refused')
  ) {
    if (
      error.message.includes('1234') ||
      error.message.includes('localhost:1234')
    ) {
      return {
        type: 'gui-not-running',
        provider: 'lm-studio',
        message: 'LM Studio is not running or local server is not started',
        originalError: error,
      }
    }
  }

  // Model not loaded
  if (
    message.includes('no model') ||
    message.includes('model not loaded') ||
    message.includes('select a model')
  ) {
    return {
      type: 'model-not-found',
      provider: 'lm-studio',
      message: 'No embedding model is loaded in LM Studio',
      originalError: error,
    }
  }

  return null
}

// ============================================================================
// OpenRouter Error Detection
// ============================================================================

/**
 * Detect OpenRouter-specific errors
 */
const detectOpenRouterError = (error: unknown): ProviderError | null => {
  if (!(error instanceof Error)) return null

  const message = error.message.toLowerCase()

  // Invalid API key (401 Unauthorized)
  if (
    message.includes('401') ||
    message.includes('unauthorized') ||
    message.includes('invalid api key') ||
    message.includes('invalid_api_key')
  ) {
    return {
      type: 'invalid-api-key',
      provider: 'openrouter',
      message: 'Invalid or missing OpenRouter API key',
      originalError: error,
    }
  }

  // Rate limiting (429)
  if (message.includes('429') || message.includes('rate limit')) {
    return {
      type: 'rate-limited',
      provider: 'openrouter',
      message: 'OpenRouter rate limit reached',
      originalError: error,
    }
  }

  // Quota exceeded
  if (message.includes('quota') || message.includes('insufficient')) {
    return {
      type: 'quota-exceeded',
      provider: 'openrouter',
      message: 'OpenRouter quota exceeded',
      originalError: error,
    }
  }

  // Model unavailable
  if (
    message.includes('model') &&
    (message.includes('not available') ||
      message.includes('not found') ||
      message.includes('not supported'))
  ) {
    const model = extractModelName(error.message)
    return {
      type: 'model-unavailable',
      provider: 'openrouter',
      message: model
        ? `Model '${model}' is not available via OpenRouter`
        : 'Requested model is not available via OpenRouter',
      model,
      originalError: error,
    }
  }

  return null
}

// ============================================================================
// Generic Network Error Detection
// ============================================================================

/**
 * Detect generic network errors
 */
const detectNetworkError = (
  provider: EmbeddingProviderName,
  error: unknown,
): ProviderError | null => {
  if (!(error instanceof Error)) return null

  const message = error.message.toLowerCase()

  // Connection errors
  if (
    message.includes('econnrefused') ||
    message.includes('connection refused')
  ) {
    return {
      type: 'connection-refused',
      provider,
      message: `Cannot connect to ${provider} server`,
      originalError: error,
    }
  }

  // Timeout
  if (
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('timed out')
  ) {
    return {
      type: 'connection-timeout',
      provider,
      message: `Connection to ${provider} timed out`,
      originalError: error,
    }
  }

  // DNS/network errors
  if (
    message.includes('enotfound') ||
    message.includes('dns') ||
    message.includes('network')
  ) {
    return {
      type: 'network-error',
      provider,
      message: `Network error connecting to ${provider}`,
      originalError: error,
    }
  }

  return null
}

// ============================================================================
// Model Name Extraction
// ============================================================================

/**
 * Extract model name from error message using common patterns
 */
const extractModelName = (message: string): string | undefined => {
  // Pattern: "model 'name'" or "model \"name\""
  const quotedMatch = message.match(/model\s+['"]([^'"]+)['"]/i)
  if (quotedMatch) return quotedMatch[1]

  // Pattern: "model: name" or "model name"
  const colonMatch = message.match(/model[:\s]+(\S+)/i)
  if (colonMatch) return colonMatch[1]

  return undefined
}

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Detect and classify a provider-specific error.
 *
 * @param provider - The embedding provider being used
 * @param error - The error to analyze
 * @returns Structured ProviderError or null if not a recognized provider error
 */
export const detectProviderError = (
  provider: EmbeddingProviderName,
  error: unknown,
): ProviderError | null => {
  // Try provider-specific detection first
  switch (provider) {
    case 'ollama':
      return detectOllamaError(error) ?? detectNetworkError(provider, error)
    case 'lm-studio':
      return detectLMStudioError(error) ?? detectNetworkError(provider, error)
    case 'openrouter':
      return detectOpenRouterError(error) ?? detectNetworkError(provider, error)
    case 'openai':
      // OpenAI errors are handled by the SDK, fall through to network check
      return detectNetworkError(provider, error)
    default:
      return detectNetworkError(provider, error)
  }
}

/**
 * Auto-detect provider from error (for cases where provider context is lost)
 */
export const detectProviderFromError = (
  error: unknown,
): EmbeddingProviderName | undefined => {
  if (error instanceof Error) {
    return detectProviderFromPort(error)
  }
  return undefined
}

// ============================================================================
// Suggestions
// ============================================================================

/**
 * Recommended Ollama embedding models
 */
export const RECOMMENDED_OLLAMA_MODELS = [
  { name: 'nomic-embed-text', dims: 768, note: 'recommended, fast' },
  { name: 'mxbai-embed-large', dims: 1024, note: 'higher quality' },
  { name: 'bge-m3', dims: 1024, note: 'multilingual' },
] as const

/**
 * Get actionable suggestions for a provider error
 */
export const getProviderSuggestions = (error: ProviderError): string[] => {
  switch (error.type) {
    // Ollama errors
    case 'daemon-not-running':
      return [
        'Start the Ollama daemon: ollama serve',
        'Install Ollama: https://ollama.com/download',
      ]

    // LM Studio errors
    case 'gui-not-running':
      return [
        'Open LM Studio application',
        'Go to Developer tab and start the local server',
        'Ensure an embedding model is loaded',
        'Note: LM Studio requires GUI - consider Ollama for automation',
      ]

    // Model errors
    case 'model-not-found':
      if (error.provider === 'ollama') {
        const suggestions = [
          error.model
            ? `Download the model: ollama pull ${error.model}`
            : 'Download an embedding model',
          'Recommended embedding models:',
        ]
        for (const model of RECOMMENDED_OLLAMA_MODELS) {
          suggestions.push(
            `  - ${model.name} (${model.dims} dims, ${model.note})`,
          )
        }
        return suggestions
      }
      if (error.provider === 'lm-studio') {
        return [
          'Load an embedding model in LM Studio',
          'Go to Models tab and download an embedding model',
          'Then load it in the Home tab',
        ]
      }
      if (error.provider === 'openrouter') {
        return [
          'Check available models: https://openrouter.ai/models',
          'Common embedding models: text-embedding-3-small, text-embedding-3-large',
        ]
      }
      return ['Check that the model name is correct']

    case 'model-loading':
      return [
        'Wait for the model to finish loading',
        error.model
          ? `Or pre-load it: ollama run ${error.model}`
          : 'First request may be slow while model loads',
      ]

    // OpenRouter API errors
    case 'invalid-api-key':
      return [
        'Get an API key: https://openrouter.ai/keys',
        'Set the key: export OPENROUTER_API_KEY=sk-or-...',
        'Or set: export OPENAI_API_KEY=sk-or-...',
        'Note: OpenRouter keys start with sk-or-',
      ]

    case 'rate-limited':
      return [
        'Wait a moment and try again',
        'OpenRouter shares rate limits across all users',
        'Consider using Ollama for unlimited local inference',
        'Or use OpenAI directly for higher rate limits',
      ]

    case 'quota-exceeded':
      return [
        'Check your OpenRouter balance: https://openrouter.ai/credits',
        'Add credits to continue using OpenRouter',
        'Or switch to a free provider like Ollama',
      ]

    case 'model-unavailable':
      return [
        'Check available models: https://openrouter.ai/models',
        'Try: text-embedding-3-small or text-embedding-3-large',
      ]

    // Connection errors
    case 'connection-refused':
      if (error.provider === 'ollama') {
        return ['Start the Ollama daemon: ollama serve']
      }
      if (error.provider === 'lm-studio') {
        return ['Open LM Studio and start the local server']
      }
      return ['Check that the server is running']

    case 'connection-timeout':
      return [
        'Check your network connection',
        'The server may be overloaded, try again later',
        'Consider increasing timeout in config',
      ]

    case 'network-error':
      return [
        'Check your internet connection',
        'Check if the server is reachable',
        'Try again later',
      ]

    default:
      return ['Check the error details above']
  }
}

/**
 * Get a user-friendly error title for display
 */
export const getProviderErrorTitle = (error: ProviderError): string => {
  switch (error.type) {
    case 'daemon-not-running':
      return 'Ollama is not running'
    case 'gui-not-running':
      return 'LM Studio is not running'
    case 'model-not-found':
      return error.model
        ? `Model '${error.model}' not found`
        : 'Model not found'
    case 'model-loading':
      return error.model
        ? `Model '${error.model}' is still loading`
        : 'Model is still loading'
    case 'invalid-api-key':
      return 'Invalid API key'
    case 'rate-limited':
      return 'Rate limit exceeded'
    case 'quota-exceeded':
      return 'Quota exceeded'
    case 'model-unavailable':
      return 'Model not available'
    case 'connection-refused':
      return `Cannot connect to ${error.provider}`
    case 'connection-timeout':
      return `Connection to ${error.provider} timed out`
    case 'network-error':
      return 'Network error'
    default:
      return 'Embedding error'
  }
}
