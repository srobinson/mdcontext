/**
 * Embedding Provider Factory
 *
 * Creates embedding providers based on configuration. Supports multiple
 * providers (OpenAI, Ollama, LM Studio, OpenRouter) with automatic
 * baseURL mapping for OpenAI-compatible APIs.
 */

import { Effect, Option } from 'effect'
import { ConfigService, type EmbeddingProvider } from '../config/index.js'
import type { EmbeddingsConfig } from '../config/schema.js'
import type { ApiKeyMissingError } from '../errors/index.js'
import { createOpenAIProvider } from './openai-provider.js'
import type { EmbeddingProvider as EmbeddingProviderInterface } from './types.js'

// ============================================================================
// Provider BaseURL Mapping
// ============================================================================

/**
 * Default base URLs for each embedding provider.
 *
 * - openai: Uses SDK default (https://api.openai.com/v1)
 * - ollama: Local Ollama server
 * - lm-studio: Local LM Studio server
 * - openrouter: OpenRouter API gateway
 */
export const PROVIDER_BASE_URLS: Record<EmbeddingProvider, string | undefined> =
  {
    openai: undefined, // Use OpenAI SDK default
    ollama: 'http://localhost:11434/v1',
    'lm-studio': 'http://localhost:1234/v1',
    openrouter: 'https://openrouter.ai/api/v1',
  } as const

/**
 * Get the base URL for a provider, respecting config override.
 *
 * Precedence:
 * 1. Explicit baseURL from config (highest priority)
 * 2. Provider-specific default from PROVIDER_BASE_URLS
 * 3. OpenAI SDK default (undefined means use SDK default)
 */
export const getProviderBaseURL = (
  provider: EmbeddingProvider,
  configBaseURL: Option.Option<string>,
): string | undefined => {
  // Config baseURL takes precedence
  if (Option.isSome(configBaseURL)) {
    return configBaseURL.value
  }
  // Fall back to provider default
  return PROVIDER_BASE_URLS[provider]
}

// ============================================================================
// Provider Factory
// ============================================================================

/**
 * Configuration subset needed for provider creation.
 * Extracted from EmbeddingsConfig to allow direct config passing.
 */
export interface ProviderFactoryConfig {
  readonly provider: EmbeddingProvider
  readonly baseURL?: Option.Option<string> | string | undefined
  readonly model?: string | undefined
  readonly batchSize?: number | undefined
  readonly apiKey?: Option.Option<string> | string | undefined
}

/**
 * Normalize baseURL from various input formats to Option<string>.
 */
const normalizeBaseURL = (
  baseURL: Option.Option<string> | string | undefined,
): Option.Option<string> => {
  if (baseURL === undefined) {
    return Option.none()
  }
  if (typeof baseURL === 'string') {
    return Option.some(baseURL)
  }
  return baseURL
}

/**
 * Normalize apiKey from various input formats to string | undefined.
 */
const normalizeApiKey = (
  apiKey: Option.Option<string> | string | undefined,
): string | undefined => {
  if (apiKey === undefined) {
    return undefined
  }
  if (typeof apiKey === 'string') {
    return apiKey
  }
  return Option.isSome(apiKey) ? apiKey.value : undefined
}

/**
 * Create an embedding provider based on configuration.
 *
 * All supported providers (OpenAI, Ollama, LM Studio, OpenRouter) use
 * OpenAI-compatible APIs, so we use the OpenAI provider with different
 * base URLs.
 *
 * @param config - Optional explicit config (if not provided, reads from ConfigService)
 * @returns Effect yielding the configured EmbeddingProvider
 *
 * @example
 * ```typescript
 * // Using ConfigService (reads from environment/config file)
 * const provider = yield* createEmbeddingProvider()
 *
 * // Explicit config override
 * const provider = yield* createEmbeddingProvider({
 *   provider: 'ollama',
 *   model: 'nomic-embed-text',
 * })
 * ```
 */
export const createEmbeddingProvider = (
  config?: ProviderFactoryConfig,
): Effect.Effect<
  EmbeddingProviderInterface,
  ApiKeyMissingError,
  ConfigService
> =>
  Effect.gen(function* () {
    // Get embeddings config from service if not provided
    const embeddingsConfig: EmbeddingsConfig = config
      ? ({
          provider: config.provider,
          baseURL: normalizeBaseURL(config.baseURL),
          model: config.model ?? 'text-embedding-3-small',
          dimensions: 512,
          batchSize: config.batchSize ?? 100,
          maxRetries: 3,
          retryDelayMs: 1000,
          timeoutMs: 30000,
          apiKey: Option.fromNullable(normalizeApiKey(config.apiKey)),
        } as EmbeddingsConfig)
      : (yield* ConfigService).embeddings

    const provider = embeddingsConfig.provider
    const baseURL = getProviderBaseURL(provider, embeddingsConfig.baseURL)

    // Extract API key from config if available
    const apiKey = Option.isSome(embeddingsConfig.apiKey)
      ? embeddingsConfig.apiKey.value
      : undefined

    // For now, all providers use OpenAI-compatible API
    // Future: Could return different provider classes here (e.g., native Ollama SDK)
    return yield* createOpenAIProvider({
      model: embeddingsConfig.model,
      batchSize: embeddingsConfig.batchSize,
      baseURL,
      apiKey,
    })
  })

/**
 * Create an embedding provider without ConfigService dependency.
 *
 * Use this when you need to create a provider outside of the Effect
 * context or when you have explicit config values.
 *
 * @param config - Explicit provider configuration
 * @returns Effect yielding the configured EmbeddingProvider
 */
export const createEmbeddingProviderDirect = (
  config: ProviderFactoryConfig,
): Effect.Effect<EmbeddingProviderInterface, ApiKeyMissingError> =>
  Effect.gen(function* () {
    const provider = config.provider
    const baseURL = getProviderBaseURL(
      provider,
      normalizeBaseURL(config.baseURL),
    )

    return yield* createOpenAIProvider({
      model: config.model,
      batchSize: config.batchSize,
      baseURL,
      apiKey: normalizeApiKey(config.apiKey),
    })
  })
