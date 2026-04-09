/**
 * HyDE (Hypothetical Document Embeddings) Query Expansion
 *
 * HyDE improves retrieval by generating a hypothetical document that would
 * answer the query, then searching using that document's embedding instead
 * of the raw query embedding.
 *
 * This bridges the semantic gap between short questions and detailed documents,
 * providing 10-30% improvement on ambiguous or complex queries.
 *
 * Paper: "Precise Zero-Shot Dense Retrieval without Relevance Labels"
 * https://arxiv.org/abs/2212.10496
 *
 * Implementation: this module is a thin consumer of the provider runtime.
 * Credential resolution, base URL resolution, the chat completion call,
 * and HTTP transport all live in `src/providers/transports/openai-compatible.ts`.
 * The runtime keeps a single `new OpenAI` call site for the four
 * OpenAI-compatible providers; HyDE only handles the use-case-specific bits:
 * picking a default model per provider, computing dollar cost via
 * `lookupPricing`, and remapping runtime errors into the consumer error
 * surface that the CLI handles.
 */

import { Effect, Redacted } from 'effect'
import {
  ApiKeyMissingError,
  EmbeddingError as ConsumerEmbeddingError,
  type EmbeddingErrorCause,
} from '../errors/index.js'
import {
  createGenerateTextClient,
  hasAnyRemoteApiKey,
  lookupPricing,
  type MissingApiKey,
  type OpenAICompatibleProviderId,
  type TextGenerationError,
} from '../providers/index.js'

// ============================================================================
// Types
// ============================================================================

/**
 * LLM providers supported for HyDE generation.
 *
 * Voyage is intentionally excluded because Voyage AI does not expose a chat
 * completion API. When the embedding side uses voyage and HyDE is enabled
 * without an explicit provider override, `resolveHydeOptions` fails fast
 * with `CapabilityNotSupported` before any HTTP call is made.
 *
 * The set is derived from `OpenAICompatibleProviderId` so any provider added
 * to the runtime's OpenAI-compatible transport automatically becomes a
 * candidate for HyDE generation.
 */
export type HydeProviderName = OpenAICompatibleProviderId

/**
 * Configuration for HyDE query expansion.
 */
export interface HydeOptions {
  /**
   * LLM provider for HyDE generation. Determines which OpenAI-compatible
   * endpoint to call and which default model to use when `model` is unset.
   * Default: 'openai'.
   */
  readonly provider?: HydeProviderName | undefined
  /**
   * API key for the chosen provider. Can be a plain string or Redacted<string>.
   * When unset, the runtime resolves the credential from the provider's env
   * var (OPENAI_API_KEY for openai, OPENROUTER_API_KEY for openrouter, etc.).
   */
  readonly apiKey?: string | Redacted.Redacted<string> | undefined
  /**
   * Model to use for hypothetical document generation. When unset, a
   * provider-specific default model is used.
   */
  readonly model?: string | undefined
  /** Maximum tokens for the generated document. Default: 256 */
  readonly maxTokens?: number | undefined
  /** Temperature for generation. Lower = more focused. Default: 0.3 */
  readonly temperature?: number | undefined
  /** Custom system prompt for document generation */
  readonly systemPrompt?: string | undefined
  /**
   * Base URL for the chat completion endpoint. When unset, the runtime
   * uses the provider's default baseURL.
   */
  readonly baseURL?: string | undefined
}

/**
 * Result from HyDE query expansion.
 */
export interface HydeResult {
  /** The generated hypothetical document */
  readonly hypotheticalDocument: string
  /** The original query for reference */
  readonly originalQuery: string
  /** Model used for generation */
  readonly model: string
  /** Tokens used for generation */
  readonly tokensUsed: number
  /** Estimated cost of the LLM call. Zero when the model is not in the
   *  pricing table (local providers and unknown remote models). */
  readonly cost: number
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PROVIDER: HydeProviderName = 'openai'
const DEFAULT_MAX_TOKENS = 256
const DEFAULT_TEMPERATURE = 0.3

/**
 * Per-provider default model for HyDE generation. The local providers
 * (ollama, lm-studio) use generic small-model names that the operator is
 * expected to override; the remote providers point at their cheapest
 * capable chat model.
 *
 * The runtime intentionally does not own model defaults — picking a
 * sensible chat model is a use-case decision and lives at the consumer
 * layer alongside the prompt template.
 */
const DEFAULT_MODELS_BY_PROVIDER: Record<HydeProviderName, string> = {
  openai: 'gpt-4o-mini',
  ollama: 'llama3.2',
  'lm-studio': 'local-model',
  openrouter: 'openai/gpt-4o-mini',
}

/**
 * Default system prompt for generating hypothetical documents.
 * Designed to produce concise, factual content that matches documentation style.
 */
const DEFAULT_SYSTEM_PROMPT = `You are a technical documentation assistant. Given a user's question, write a short, factual passage that would appear in documentation answering this question.

Guidelines:
- Write 2-4 concise paragraphs
- Use technical but accessible language
- Include specific details, code examples, or configuration options where relevant
- Focus on directly answering the question
- Do not include greetings, preambles, or meta-commentary
- Write as if this is an excerpt from existing documentation`

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Classify a runtime `TextGenerationError` into a `reason` for the
 * centralized consumer `EmbeddingError`. Mirrors the embed-batched.ts
 * classifier so the CLI keeps producing the same suggestions for HyDE
 * failures that it produces for embedding failures, even though the
 * underlying capability differs.
 */
const classifyTextGenerationError = (
  error: TextGenerationError,
): EmbeddingErrorCause => {
  const msg = error.message.toLowerCase()

  if (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  ) {
    return 'RateLimit'
  }

  if (
    msg.includes('quota') ||
    msg.includes('insufficient') ||
    msg.includes('billing')
  ) {
    return 'QuotaExceeded'
  }

  if (
    msg.includes('econnrefused') ||
    msg.includes('timeout') ||
    msg.includes('etimedout') ||
    msg.includes('network') ||
    msg.includes('enotfound') ||
    msg.includes('connection')
  ) {
    return 'Network'
  }

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

/**
 * Convert a terminal runtime `TextGenerationError` into the consumer-facing
 * `EmbeddingError`. HyDE reuses the embedding error type for CLI parity:
 * the user only cares whether the LLM call succeeded, not which capability
 * it failed on.
 */
const toConsumerError = (error: TextGenerationError): ConsumerEmbeddingError =>
  new ConsumerEmbeddingError({
    reason: classifyTextGenerationError(error),
    message: error.message,
    provider: error.provider,
    cause: error.cause,
  })

// ============================================================================
// Client Factory
// ============================================================================

/**
 * Construct a generateText client for the given HyDE provider.
 *
 * Bridges the runtime's `createGenerateTextClient` and remaps the runtime's
 * `MissingApiKey` into the centralized `ApiKeyMissingError` so the CLI error
 * handler keeps producing the same exit codes and suggestions.
 *
 * Optional `apiKey` and `baseURL` overrides flow through to the runtime
 * factory; both are honored on a per-call basis. The runtime resolves the
 * env var only when `apiKey` is omitted, fixing finding #1 (openrouter
 * provider works with only `OPENROUTER_API_KEY` set).
 *
 * Bypasses the runtime registry. ALP-1703 will move this onto registry-based
 * dispatch with proper fail-fast wiring.
 */
const createHydeClient = (
  id: HydeProviderName,
  overrides?: {
    readonly baseURL?: string | undefined
    readonly apiKey?: string | undefined
  },
) => {
  const result = createGenerateTextClient(id, overrides)
  return result.pipe(
    Effect.mapError(
      (e: MissingApiKey) =>
        new ApiKeyMissingError({
          provider: e.provider,
          envVar: e.envVar,
        }),
    ),
  )
}

// ============================================================================
// Cost calculation
// ============================================================================

/**
 * Compute the dollar cost of a generateText call from token usage and the
 * pricing table. Returns 0 for unknown models — local providers (ollama,
 * lm-studio) and any custom remote model that isn't listed in pricing.json
 * report zero rather than fabricating a cost from a fallback model. Fixes
 * finding #3.
 */
const computeCost = (
  model: string,
  inputTokens: number,
  outputTokens: number,
): number => {
  const pricing = lookupPricing('generateText', model)
  if (pricing === undefined) return 0
  const outputRate = pricing.output ?? 0
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * outputRate
  )
}

// ============================================================================
// HyDE Implementation
// ============================================================================

/**
 * Generate a hypothetical document that would answer the query.
 *
 * This is the core of HyDE - we ask an LLM to write what documentation
 * answering this query would look like. The resulting text is then
 * embedded and used for similarity search.
 *
 * @param query - The user's search query
 * @param options - HyDE configuration options
 * @returns The generated hypothetical document
 *
 * @throws ApiKeyMissingError - When the resolved provider's API key env
 *                              var is unset and no explicit `apiKey` is
 *                              provided in `options`.
 * @throws EmbeddingError - When the LLM call fails (reusing the embedding
 *                          error type for CLI parity).
 */
export const generateHypotheticalDocument = (
  query: string,
  options: HydeOptions = {},
): Effect.Effect<HydeResult, ApiKeyMissingError | ConsumerEmbeddingError> =>
  Effect.gen(function* () {
    const provider = options.provider ?? DEFAULT_PROVIDER
    const model = options.model ?? DEFAULT_MODELS_BY_PROVIDER[provider]
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS
    const temperature = options.temperature ?? DEFAULT_TEMPERATURE
    const systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT

    // Unwrap an explicit apiKey override into a plain string for the
    // runtime. When unset, the runtime resolves the credential from the
    // provider's env var (OPENAI_API_KEY for openai, OPENROUTER_API_KEY
    // for openrouter, etc.) — fixes finding #1.
    const explicitApiKey =
      options.apiKey === undefined
        ? undefined
        : Redacted.isRedacted(options.apiKey)
          ? Redacted.value(options.apiKey)
          : options.apiKey

    const client = yield* createHydeClient(provider, {
      ...(options.baseURL !== undefined ? { baseURL: options.baseURL } : {}),
      ...(explicitApiKey !== undefined ? { apiKey: explicitApiKey } : {}),
    })

    const result = yield* client
      .generateText(query, {
        model,
        maxTokens,
        temperature,
        systemPrompt,
      })
      .pipe(Effect.mapError(toConsumerError))

    const inputTokens = result.usage?.inputTokens ?? 0
    const outputTokens = result.usage?.outputTokens ?? 0
    const totalTokens = inputTokens + outputTokens

    return {
      hypotheticalDocument: result.text,
      originalQuery: query,
      model: result.model,
      tokensUsed: totalTokens,
      cost: computeCost(result.model, inputTokens, outputTokens),
    }
  })

/**
 * Check if HyDE is available (any supported provider's API key is set).
 *
 * Delegates to `hasAnyRemoteApiKey` so the runtime's `PROVIDER_CONFIGS`
 * table is the single source of truth for which env vars count. Local
 * providers (ollama, lm-studio) are intentionally not considered here
 * because their availability depends on whether the local server is
 * running, which this synchronous check cannot verify. Callers that pin
 * HyDE to a local provider should rely on the call itself failing fast
 * with a connection error.
 *
 * @returns true if HyDE can be used with at least one remote provider
 */
export const isHydeAvailable = (): boolean => hasAnyRemoteApiKey()

/**
 * Detect if a query would benefit from HyDE expansion.
 *
 * HyDE works best for:
 * - Questions (who, what, where, when, why, how)
 * - Complex or ambiguous queries
 * - Queries seeking procedural information
 *
 * HyDE works poorly for:
 * - Single-word queries
 * - Exact phrase searches
 * - Very short queries (< 3 words)
 *
 * @param query - The search query
 * @returns true if HyDE would likely help
 */
export const shouldUseHyde = (query: string): boolean => {
  const normalizedQuery = query.toLowerCase().trim()
  const words = normalizedQuery.split(/\s+/)

  // Skip very short queries
  if (words.length < 3) return false

  // Skip if it looks like an exact phrase search
  if (query.startsWith('"') && query.endsWith('"')) return false

  // Questions are good candidates
  const questionPatterns = [
    /^(how|what|why|when|where|who|which)\s/i,
    /^(can|could|should|would|is|are|does|do)\s/i,
    /\?$/,
  ]
  if (questionPatterns.some((p) => p.test(normalizedQuery))) return true

  // Procedural queries are good candidates
  const proceduralPatterns = [
    /\b(setup|install|configure|implement|create|build|fix|debug|resolve)\b/i,
    /\b(step|guide|tutorial|example|documentation)\b/i,
  ]
  if (proceduralPatterns.some((p) => p.test(normalizedQuery))) return true

  // Longer queries (6+ words) often benefit
  if (words.length >= 6) return true

  return false
}
