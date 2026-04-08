/**
 * OpenAI-compatible HTTP transport.
 *
 * Single transport adapter for every provider that speaks the OpenAI
 * REST contract: `openai`, `openrouter`, `ollama`, `lm-studio`. Wraps
 * `new OpenAI({ apiKey, baseURL })` once per provider and exposes the
 * runtime's `EmbeddingClient` / `TextClient` contracts.
 *
 * Credential resolution, base URL resolution, and capability
 * availability all live here — this is the single source of truth for
 * the four OpenAI-compatible providers.
 */

import { Effect } from 'effect'
import OpenAI from 'openai'
import type {
  EmbeddingClient,
  EmbeddingResult,
  EmbedOptions,
} from '../capabilities/embed.js'
import { EmbeddingError } from '../capabilities/embed.js'
import type {
  GenerateTextOptions,
  TextClient,
  TextGenerationResult,
} from '../capabilities/generate-text.js'
import { TextGenerationError } from '../capabilities/generate-text.js'
import { MissingApiKey } from '../errors.js'
import type { ProviderId } from '../runtime.js'

// ============================================================================
// Provider configuration
// ============================================================================

/**
 * Provider IDs served by this transport. `voyage` is handled by
 * `src/providers/transports/voyage.ts` because the Voyage REST shape
 * differs from OpenAI's.
 */
export type OpenAICompatibleProviderId = Exclude<ProviderId, 'voyage'>

interface ProviderConfig {
  /** Default base URL. `undefined` means use the OpenAI SDK default. */
  readonly baseURL: string | undefined
  /** Env var for the API key, or `undefined` when the provider is local. */
  readonly envVar: string | undefined
  /** Placeholder used in place of a real key for local providers. */
  readonly localApiKeyPlaceholder?: string
}

const PROVIDER_CONFIGS: Record<OpenAICompatibleProviderId, ProviderConfig> = {
  openai: {
    baseURL: undefined,
    envVar: 'OPENAI_API_KEY',
  },
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    envVar: 'OPENROUTER_API_KEY',
  },
  ollama: {
    baseURL: 'http://localhost:11434/v1',
    envVar: undefined,
    localApiKeyPlaceholder: 'ollama',
  },
  'lm-studio': {
    baseURL: 'http://localhost:1234/v1',
    envVar: undefined,
    localApiKeyPlaceholder: 'lm-studio',
  },
}

/**
 * Base URL each provider advertises. Mirrored for consumers that need
 * the value without going through the transport factories.
 */
export const getProviderBaseURL = (
  id: OpenAICompatibleProviderId,
): string | undefined => PROVIDER_CONFIGS[id].baseURL

// ============================================================================
// Provider inference
// ============================================================================

/**
 * Infer the provider id from a base URL.
 *
 * Moved from `src/embeddings/provider-constants.ts`. The runtime is the
 * canonical home for provider identity; the old location re-exports
 * from here for transition compatibility.
 */
export const inferProviderFromUrl = (
  baseURL: string | undefined,
): ProviderId => {
  if (!baseURL) return 'openai'

  for (const [id, config] of Object.entries(PROVIDER_CONFIGS)) {
    const providerUrl = config.baseURL
    if (providerUrl && baseURL.includes(providerUrl.replace('/v1', ''))) {
      return id as ProviderId
    }
  }

  // Voyage lives outside PROVIDER_CONFIGS; match on hostname fragment.
  if (baseURL.includes('voyageai.com')) return 'voyage'

  // Partial match for custom ports or proxies.
  if (baseURL.includes('openrouter')) return 'openrouter'

  return 'openai'
}

// ============================================================================
// Credential resolution
// ============================================================================

const resolveApiKey = (
  id: OpenAICompatibleProviderId,
): Effect.Effect<string, MissingApiKey> => {
  const config = PROVIDER_CONFIGS[id]

  // Local provider: return the sentinel, never read env.
  if (config.envVar === undefined) {
    return Effect.succeed(config.localApiKeyPlaceholder ?? 'local')
  }

  const value = process.env[config.envVar]
  if (value === undefined || value === '') {
    return Effect.fail(
      new MissingApiKey({
        provider: id,
        envVar: config.envVar,
      }),
    )
  }
  return Effect.succeed(value)
}

const buildOpenAIClient = (
  id: OpenAICompatibleProviderId,
): Effect.Effect<OpenAI, MissingApiKey> =>
  Effect.gen(function* () {
    const apiKey = yield* resolveApiKey(id)
    const config = PROVIDER_CONFIGS[id]
    return new OpenAI({
      apiKey,
      ...(config.baseURL !== undefined ? { baseURL: config.baseURL } : {}),
    })
  })

// ============================================================================
// Embedding client factory
// ============================================================================

/**
 * Construct an `EmbeddingClient` for an OpenAI-compatible provider.
 *
 * Fails with `MissingApiKey` when the provider requires a key and the
 * env var is unset. Local providers (ollama, lm-studio) never fail
 * construction because they use a sentinel key.
 */
export const createEmbedClient = (
  id: OpenAICompatibleProviderId,
): Effect.Effect<EmbeddingClient, MissingApiKey> =>
  Effect.map(buildOpenAIClient(id), (openai) => ({
    embed: (texts, options) => invokeEmbed(openai, id, texts, options),
  }))

const invokeEmbed = (
  openai: OpenAI,
  id: OpenAICompatibleProviderId,
  texts: readonly string[],
  options: EmbedOptions | undefined,
): Effect.Effect<EmbeddingResult, EmbeddingError> =>
  Effect.tryPromise({
    try: async () => {
      if (texts.length === 0) {
        return {
          embeddings: [],
          model: options?.model ?? 'unknown',
        } satisfies EmbeddingResult
      }
      const model = options?.model
      if (model === undefined || model === '') {
        throw new Error(
          `${id} embed call requires options.model. The runtime does not default the embedding model — callers resolve it from config.`,
        )
      }
      const params: OpenAI.Embeddings.EmbeddingCreateParams = {
        model,
        input: texts as string[],
      }
      const requestOptions: { signal?: AbortSignal } = {}
      if (options?.signal !== undefined) {
        requestOptions.signal = options.signal
      }
      const response = await openai.embeddings.create(params, requestOptions)
      const result: EmbeddingResult = {
        embeddings: response.data.map((d) => d.embedding),
        model: response.model,
        ...(response.usage
          ? { usage: { inputTokens: response.usage.prompt_tokens ?? 0 } }
          : {}),
      }
      return result
    },
    catch: (cause) =>
      new EmbeddingError({
        provider: id,
        message: cause instanceof Error ? cause.message : String(cause),
        cause,
      }),
  })

// ============================================================================
// Text generation client factory
// ============================================================================

/**
 * Construct a `TextClient` for an OpenAI-compatible provider.
 *
 * Fails with `MissingApiKey` when the provider requires a key and the
 * env var is unset.
 */
export const createGenerateTextClient = (
  id: OpenAICompatibleProviderId,
): Effect.Effect<TextClient, MissingApiKey> =>
  Effect.map(buildOpenAIClient(id), (openai) => ({
    generateText: (prompt, options) =>
      invokeGenerateText(openai, id, prompt, options),
  }))

const invokeGenerateText = (
  openai: OpenAI,
  id: OpenAICompatibleProviderId,
  prompt: string,
  options: GenerateTextOptions | undefined,
): Effect.Effect<TextGenerationResult, TextGenerationError> =>
  Effect.tryPromise({
    try: async () => {
      const model = options?.model
      if (model === undefined || model === '') {
        throw new Error(
          `${id} generateText call requires options.model. The runtime does not default the chat model — callers resolve it from config.`,
        )
      }
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
      if (options?.systemPrompt !== undefined) {
        messages.push({ role: 'system', content: options.systemPrompt })
      }
      messages.push({ role: 'user', content: prompt })

      const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model,
        messages,
        ...(options?.maxTokens !== undefined
          ? { max_tokens: options.maxTokens }
          : {}),
        ...(options?.temperature !== undefined
          ? { temperature: options.temperature }
          : {}),
      }
      const requestOptions: { signal?: AbortSignal } = {}
      if (options?.signal !== undefined) {
        requestOptions.signal = options.signal
      }
      const response = await openai.chat.completions.create(
        params,
        requestOptions,
      )
      const text = response.choices[0]?.message?.content ?? ''
      const result: TextGenerationResult = {
        text,
        model: response.model,
        ...(response.usage
          ? {
              usage: {
                inputTokens: response.usage.prompt_tokens ?? 0,
                outputTokens: response.usage.completion_tokens ?? 0,
              },
            }
          : {}),
      }
      return result
    },
    catch: (cause) =>
      new TextGenerationError({
        provider: id,
        message: cause instanceof Error ? cause.message : String(cause),
        cause,
      }),
  })

// ============================================================================
// Capability availability
// ============================================================================

/**
 * Providers served by this transport expose both `embed` and
 * `generateText`. Voyage is intentionally absent — see
 * `voyage.ts` for its embed-only runtime.
 */
export const OPENAI_COMPATIBLE_PROVIDER_IDS: readonly OpenAICompatibleProviderId[] =
  ['openai', 'openrouter', 'ollama', 'lm-studio'] as const
