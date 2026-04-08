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
 */

import { Effect, Redacted } from 'effect'
import OpenAI from 'openai'
import { ApiKeyMissingError, EmbeddingError } from '../errors/index.js'

// ============================================================================
// Types
// ============================================================================

/**
 * LLM providers supported for HyDE generation.
 *
 * Voyage is intentionally excluded because Voyage AI does not expose a chat
 * completion API. When the embedding side uses voyage and HyDE is enabled
 * without an explicit provider override, the runtime falls back to openai.
 *
 * All listed providers expose OpenAI-compatible chat completion endpoints,
 * so a single OpenAI SDK client works against all of them once given the
 * correct baseURL.
 */
export type HydeProviderName = 'openai' | 'ollama' | 'lm-studio' | 'openrouter'

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
   * Falls back to OPENAI_API_KEY env var if not provided.
   */
  readonly apiKey?: string | Redacted.Redacted<string> | undefined
  /**
   * Model to use for hypothetical document generation. When unset, the
   * provider-specific default from {@link DEFAULT_MODELS_BY_PROVIDER} is used.
   */
  readonly model?: string | undefined
  /** Maximum tokens for the generated document. Default: 256 */
  readonly maxTokens?: number | undefined
  /** Temperature for generation. Lower = more focused. Default: 0.3 */
  readonly temperature?: number | undefined
  /** Custom system prompt for document generation */
  readonly systemPrompt?: string | undefined
  /**
   * Base URL for the chat completion endpoint. When unset, the provider's
   * default baseURL is used (see {@link DEFAULT_BASE_URLS_BY_PROVIDER}).
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
  /** Estimated cost of the LLM call */
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
 * Exported so tests and downstream tooling can introspect the defaults
 * without instantiating an OpenAI client.
 */
export const DEFAULT_MODELS_BY_PROVIDER: Record<HydeProviderName, string> = {
  openai: 'gpt-4o-mini',
  ollama: 'llama3.2',
  'lm-studio': 'local-model',
  openrouter: 'openai/gpt-4o-mini',
}

/**
 * Per-provider default baseURL. Mirrors PROVIDER_BASE_URLS in
 * provider-constants.ts but is duplicated here to avoid an import cycle
 * between hyde.ts and the embedding-provider plumbing. Update both maps
 * together if a new provider is added.
 *
 * - openai: undefined lets the OpenAI SDK use its built-in default.
 */
export const DEFAULT_BASE_URLS_BY_PROVIDER: Record<
  HydeProviderName,
  string | undefined
> = {
  openai: undefined,
  ollama: 'http://localhost:11434/v1',
  'lm-studio': 'http://localhost:1234/v1',
  openrouter: 'https://openrouter.ai/api/v1',
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

/**
 * Pricing data for LLM models (per 1M tokens).
 */
const LLM_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
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
 * @throws ApiKeyMissingError - When OPENAI_API_KEY is not set
 * @throws EmbeddingError - When LLM call fails (reusing error type for consistency)
 */
export const generateHypotheticalDocument = (
  query: string,
  options: HydeOptions = {},
): Effect.Effect<HydeResult, ApiKeyMissingError | EmbeddingError> =>
  Effect.gen(function* () {
    // Get API key - resolve from options or environment, normalize to Redacted
    const rawApiKey = options.apiKey ?? process.env.OPENAI_API_KEY
    if (!rawApiKey) {
      return yield* Effect.fail(
        new ApiKeyMissingError({
          provider: 'OpenAI',
          envVar: 'OPENAI_API_KEY',
        }),
      )
    }

    // Wrap in Redacted if it's a plain string
    const redactedApiKey = Redacted.isRedacted(rawApiKey)
      ? rawApiKey
      : Redacted.make(rawApiKey)

    const provider = options.provider ?? DEFAULT_PROVIDER
    const baseURL = options.baseURL ?? DEFAULT_BASE_URLS_BY_PROVIDER[provider]

    const client = new OpenAI({
      apiKey: Redacted.value(redactedApiKey), // Only expose when creating client
      baseURL,
    })

    const model = options.model ?? DEFAULT_MODELS_BY_PROVIDER[provider]
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS
    const temperature = options.temperature ?? DEFAULT_TEMPERATURE
    const systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT

    // Generate hypothetical document
    const response = yield* Effect.tryPromise({
      try: async () =>
        client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      catch: (error) =>
        new EmbeddingError({
          reason: classifyLLMError(error),
          message: error instanceof Error ? error.message : String(error),
          provider: 'openai',
          cause: error,
        }),
    })

    const content = response.choices[0]?.message?.content ?? ''
    const inputTokens = response.usage?.prompt_tokens ?? 0
    const outputTokens = response.usage?.completion_tokens ?? 0
    const totalTokens = inputTokens + outputTokens

    // Calculate cost
    const pricing = LLM_PRICING[model] ?? LLM_PRICING['gpt-4o-mini']!
    const cost =
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output

    return {
      hypotheticalDocument: content,
      originalQuery: query,
      model,
      tokensUsed: totalTokens,
      cost,
    }
  })

/**
 * Classify an LLM error into a known category.
 */
const classifyLLMError = (
  error: unknown,
): 'RateLimit' | 'QuotaExceeded' | 'Network' | 'ModelError' | 'Unknown' => {
  if (error instanceof OpenAI.RateLimitError) {
    return 'RateLimit'
  }
  if (error instanceof OpenAI.BadRequestError) {
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('model')) return 'ModelError'
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return 'Network'
  }

  if (!(error instanceof Error)) return 'Unknown'
  const msg = error.message.toLowerCase()

  if (msg.includes('429') || msg.includes('rate limit')) return 'RateLimit'
  if (msg.includes('quota') || msg.includes('billing')) return 'QuotaExceeded'
  if (msg.includes('econnrefused') || msg.includes('network')) return 'Network'
  if (msg.includes('model') && msg.includes('not found')) return 'ModelError'

  return 'Unknown'
}

/**
 * Check if HyDE is available (API key is set).
 *
 * @returns true if HyDE can be used
 */
export const isHydeAvailable = (): boolean => {
  return Boolean(process.env.OPENAI_API_KEY)
}

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
