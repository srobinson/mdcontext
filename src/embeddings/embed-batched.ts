/**
 * Batching + retry helper for the embedding capability of the runtime.
 *
 * The runtime's `EmbeddingClient` is intentionally use-case agnostic: a
 * single `embed(texts)` call goes to the API as one request. Indexing a
 * large document set, however, needs to chunk into smaller batches and
 * retry on transient failures. That logic lives here, in the consumer
 * layer, so the runtime stays minimal.
 *
 * Behavior preserved from the previous `OpenAIProvider.embed` path:
 *  - Batch size defaults to 100 documents per request.
 *  - Retry up to 5 attempts on RateLimit/Network errors with exponential
 *    backoff (1s, 2s, 4s, 8s, 16s) plus 0-1s random jitter.
 *  - Per-batch progress callback fires after each successful batch.
 *  - Aggregated `inputTokens` across batches.
 *  - Maps the runtime's generic `EmbeddingError` into the centralized
 *    `EmbeddingError` from `src/errors/index.ts` (with a `reason` field
 *    consumed by the CLI error handler) and surfaces 401-style failures
 *    as `ApiKeyInvalidError`.
 */

import { Effect } from 'effect'
import {
  ApiKeyInvalidError,
  ApiKeyMissingError,
  EmbeddingError as ConsumerEmbeddingError,
  type EmbeddingErrorCause,
} from '../errors/index.js'
import {
  createEmbedClient,
  type EmbeddingClient,
  type EmbeddingResult,
  type MissingApiKey,
  type ProviderId,
  type EmbeddingError as RuntimeEmbeddingError,
} from '../providers/index.js'
import { createVoyageEmbedClient } from '../providers/transports/voyage.js'

// ============================================================================
// Types
// ============================================================================

export interface BatchProgress {
  readonly batchIndex: number
  readonly totalBatches: number
  readonly processedTexts: number
  readonly totalTexts: number
}

export interface EmbedInBatchesOptions {
  readonly model: string
  /**
   * Output dimensions, only set when the model supports Matryoshka
   * reduction. The runtime forwards this to providers that honor it
   * (OpenAI text-embedding-3-*) and ignores it elsewhere.
   */
  readonly dimensions?: number | undefined
  readonly batchSize?: number | undefined
  readonly onBatchProgress?: ((progress: BatchProgress) => void) | undefined
  readonly signal?: AbortSignal | undefined
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_BATCH_SIZE = 100
const MAX_RETRY_ATTEMPTS = 5

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Classify a runtime `EmbeddingError` into a `reason` for the centralized
 * `EmbeddingError`. Mirrors the fallback string-matching path of the
 * previous `OpenAIProvider.classifyError` so the CLI keeps producing the
 * same suggestions for the same failures.
 */
const classifyEmbeddingError = (
  error: RuntimeEmbeddingError,
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

const isRetryable = (reason: EmbeddingErrorCause): boolean =>
  reason === 'RateLimit' || reason === 'Network'

const isInvalidApiKey = (error: RuntimeEmbeddingError): boolean => {
  const msg = error.message.toLowerCase()
  return (
    msg.includes('401') ||
    msg.includes('unauthorized') ||
    msg.includes('invalid api key') ||
    msg.includes('invalid_api_key')
  )
}

/**
 * Convert a terminal runtime `EmbeddingError` into the consumer-facing
 * `EmbeddingError` (or `ApiKeyInvalidError` for 401-style failures).
 */
const toConsumerError = (
  error: RuntimeEmbeddingError,
): ApiKeyInvalidError | ConsumerEmbeddingError => {
  if (isInvalidApiKey(error)) {
    return new ApiKeyInvalidError({
      provider: error.provider,
      details: error.message,
    })
  }
  return new ConsumerEmbeddingError({
    reason: classifyEmbeddingError(error),
    message: error.message,
    provider: error.provider,
    cause: error.cause,
  })
}

// ============================================================================
// Retry Wrapper
// ============================================================================

/**
 * Call `client.embed` with up to 5 attempts, retrying on RateLimit and
 * Network categories with exponential backoff + jitter. The OpenAI SDK
 * already retries internally (maxRetries: 2); this loop covers cases
 * that slip through during long batch runs.
 */
const embedBatchWithRetry = (
  client: EmbeddingClient,
  texts: readonly string[],
  options: {
    readonly model: string
    readonly dimensions?: number | undefined
    readonly signal?: AbortSignal | undefined
  },
): Effect.Effect<
  EmbeddingResult,
  ApiKeyInvalidError | ConsumerEmbeddingError
> =>
  Effect.gen(function* () {
    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      const result = yield* Effect.either(
        client.embed(texts, {
          model: options.model,
          ...(options.dimensions !== undefined
            ? { dimensions: options.dimensions }
            : {}),
          ...(options.signal !== undefined ? { signal: options.signal } : {}),
        }),
      )

      if (result._tag === 'Right') {
        return result.right
      }

      const error = result.left

      if (isInvalidApiKey(error)) {
        return yield* Effect.fail(toConsumerError(error))
      }

      const reason = classifyEmbeddingError(error)
      const isLastAttempt = attempt === MAX_RETRY_ATTEMPTS - 1

      if (!isRetryable(reason) || isLastAttempt) {
        return yield* Effect.fail(toConsumerError(error))
      }

      const baseDelay = 2 ** attempt * 1000
      const jitter = Math.random() * 1000
      const delay = Math.round(baseDelay + jitter)

      console.info(
        `[mdm] Embedding API ${reason} error, retry ${attempt + 1}/${MAX_RETRY_ATTEMPTS} after ${delay}ms`,
      )

      yield* Effect.sleep(`${delay} millis`)
    }

    // Loop exits via return/fail; the compiler needs an explicit terminus.
    return yield* Effect.fail(
      new ConsumerEmbeddingError({
        reason: 'Unknown',
        message: 'embedBatchWithRetry: unreachable',
      }),
    )
  })

// ============================================================================
// Client Factory
// ============================================================================

/**
 * Construct an `EmbeddingClient` for the given provider id.
 *
 * Bridges the runtime's per-transport factories (`createEmbedClient` for
 * OpenAI-compatible providers, `createVoyageEmbedClient` for Voyage) and
 * remaps `MissingApiKey` into the centralized `ApiKeyMissingError` so the
 * CLI error handler keeps producing the same exit codes and suggestions
 * it produced under the old `provider-factory.ts` path.
 *
 * Bypasses the runtime registry. ALP-1703 will move this onto
 * registry-based dispatch with proper fail-fast wiring; until then the
 * direct factory call gives a clean 1:1 error story without depending
 * on `registerDefaultProviders` having been called at bootstrap.
 */
export const createEmbeddingClient = (
  id: ProviderId,
): Effect.Effect<EmbeddingClient, ApiKeyMissingError> => {
  const result: Effect.Effect<EmbeddingClient, MissingApiKey> =
    id === 'voyage' ? createVoyageEmbedClient() : createEmbedClient(id)
  return result.pipe(
    Effect.mapError(
      (e) =>
        new ApiKeyMissingError({
          provider: e.provider,
          envVar: e.envVar,
        }),
    ),
  )
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Embed `texts` through the runtime client in batches of `batchSize`,
 * retrying on transient errors and emitting progress per batch.
 *
 * Returns a single aggregated `EmbeddingResult` whose `embeddings` array
 * preserves input order and whose `usage.inputTokens` is the sum of
 * per-batch token counts. `cost` is left unset; consumers compute cost
 * from the token count + `lookupPricing('embed', model)`.
 */
export const embedInBatches = (
  client: EmbeddingClient,
  texts: readonly string[],
  options: EmbedInBatchesOptions,
): Effect.Effect<
  EmbeddingResult,
  ApiKeyInvalidError | ConsumerEmbeddingError
> =>
  Effect.gen(function* () {
    if (texts.length === 0) {
      return {
        embeddings: [],
        model: options.model,
        usage: { inputTokens: 0 },
      } satisfies EmbeddingResult
    }

    const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE
    const totalBatches = Math.ceil(texts.length / batchSize)
    const allEmbeddings: (readonly number[])[] = []
    let totalTokens = 0
    let resolvedModel = options.model

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const batchIndex = Math.floor(i / batchSize)

      const result = yield* embedBatchWithRetry(client, batch, {
        model: options.model,
        dimensions: options.dimensions,
        signal: options.signal,
      })

      for (const embedding of result.embeddings) {
        allEmbeddings.push(embedding)
      }
      totalTokens += result.usage?.inputTokens ?? 0
      resolvedModel = result.model

      if (options.onBatchProgress) {
        options.onBatchProgress({
          batchIndex: batchIndex + 1,
          totalBatches,
          processedTexts: Math.min(i + batchSize, texts.length),
          totalTexts: texts.length,
        })
      }
    }

    return {
      embeddings: allEmbeddings,
      model: resolvedModel,
      usage: { inputTokens: totalTokens },
    } satisfies EmbeddingResult
  })
