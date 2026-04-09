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
 * Per-call override shape accepted by every OpenAI-compatible factory.
 *
 * `baseURL` replaces the transport default for the lifetime of the
 * returned client. `apiKey` bypasses env-var resolution entirely. Both
 * factories (`createEmbedClient`, `createGenerateTextClient`) accept
 * this same shape so consumers can share override plumbing.
 */
export interface ClientOverrides {
  readonly baseURL?: string | undefined
  readonly apiKey?: string | undefined
}

/**
 * Base URL each provider advertises. Mirrored for consumers that need
 * the value without going through the transport factories.
 */
export const getProviderBaseURL = (
  id: OpenAICompatibleProviderId,
): string | undefined => PROVIDER_CONFIGS[id].baseURL

/**
 * Resolve the base URL that a transport will actually use after
 * applying overrides. Callers that need to record the "endpoint used"
 * in persistent metadata (e.g. vector-store namespaces) should use
 * this helper so the stored value matches the URL the transport
 * actually dialled.
 */
export const getEffectiveBaseURL = (
  id: OpenAICompatibleProviderId,
  overrides?: ClientOverrides,
): string | undefined => overrides?.baseURL ?? PROVIDER_CONFIGS[id].baseURL

/**
 * Env var each remote provider reads its credential from. Returns
 * `undefined` for local providers (ollama, lm-studio) which do not
 * need a credential. Mirrored for consumers that need to answer
 * "does this provider need a key?" without attempting client
 * construction.
 */
export const getProviderEnvVar = (
  id: OpenAICompatibleProviderId,
): string | undefined => PROVIDER_CONFIGS[id].envVar

/**
 * Synchronous probe: does at least one remote OpenAI-compatible
 * provider have its credential env var set? Local providers (ollama,
 * lm-studio) are excluded by design — their availability depends on
 * whether the local server is running, which this synchronous check
 * cannot verify. Callers that need to know "can I reach a cloud
 * provider right now" should use this helper rather than reading
 * `process.env.OPENAI_API_KEY` directly, so adding a fifth provider
 * to `PROVIDER_CONFIGS` extends the check automatically.
 */
export const hasAnyRemoteApiKey = (): boolean => {
  for (const config of Object.values(PROVIDER_CONFIGS)) {
    if (config.envVar === undefined) continue
    const value = process.env[config.envVar]
    if (value !== undefined && value !== '') return true
  }
  return false
}

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

/**
 * Infer the provider id from an error message that mentions a local
 * provider's default port (for example `ECONNREFUSED 127.0.0.1:11434`
 * on the ollama default, or `:1234` on the lm-studio default).
 *
 * Used by `src/embeddings/provider-errors.ts` to classify errors whose
 * provider context has been lost (the error bubbled up without a
 * provider id attached). Remote providers (openai, openrouter) have
 * implicit standard ports, so `URL.port` returns an empty string for
 * them and they are naturally excluded from the match. Only local
 * providers with explicit ports in their baseURL can be identified
 * this way.
 *
 * Lives in the runtime so the set of ports-to-providers stays in a
 * single place: adding a fifth openai-compatible provider to
 * `PROVIDER_CONFIGS` extends this check automatically without touching
 * the feature layer.
 */
export const inferProviderFromErrorMessage = (
  message: string,
): OpenAICompatibleProviderId | undefined => {
  for (const id of OPENAI_COMPATIBLE_PROVIDER_IDS) {
    const baseURL = PROVIDER_CONFIGS[id].baseURL
    if (baseURL === undefined) continue
    let port: string
    try {
      port = new URL(baseURL).port
    } catch {
      continue
    }
    if (port !== '' && message.includes(port)) {
      return id
    }
  }
  return undefined
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
  overrides?: ClientOverrides,
): Effect.Effect<OpenAI, MissingApiKey> =>
  Effect.gen(function* () {
    const apiKey =
      overrides?.apiKey !== undefined
        ? overrides.apiKey
        : yield* resolveApiKey(id)
    const baseURL = getEffectiveBaseURL(id, overrides)
    return new OpenAI({
      apiKey,
      ...(baseURL !== undefined ? { baseURL } : {}),
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
 *
 * Optional `overrides.baseURL` replaces the provider's default endpoint
 * for the lifetime of the returned client. Used by consumers that
 * point at a private host (self-hosted ollama, lm-studio on a non
 * default port, an openrouter proxy) while still routing through the
 * runtime's credential resolution. `overrides.apiKey` bypasses env var
 * resolution entirely and is accepted for symmetry with
 * `createGenerateTextClient`, though no embed consumer exposes it on
 * its caller-facing config today.
 */
export const createEmbedClient = (
  id: OpenAICompatibleProviderId,
  overrides?: ClientOverrides,
): Effect.Effect<EmbeddingClient, MissingApiKey> =>
  Effect.map(buildOpenAIClient(id, overrides), (openai) => ({
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
      if (options?.dimensions !== undefined) {
        params.dimensions = options.dimensions
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
 *
 * Optional `overrides.baseURL` replaces the provider's default endpoint
 * for the lifetime of the returned client. Used by HyDE callers that
 * point at a private host (e.g. a self-hosted ollama on a non-default
 * port) while still routing through the runtime's credential
 * resolution.
 *
 * Optional `overrides.apiKey` bypasses env var resolution entirely and
 * uses the provided string. HyDE exposes this via `HydeOptions.apiKey`
 * for per-call key rotation.
 */
export const createGenerateTextClient = (
  id: OpenAICompatibleProviderId,
  overrides?: ClientOverrides,
): Effect.Effect<TextClient, MissingApiKey> =>
  Effect.map(buildOpenAIClient(id, overrides), (openai) => ({
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
  Object.keys(PROVIDER_CONFIGS) as OpenAICompatibleProviderId[]
