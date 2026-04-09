/**
 * Embedding capability contract.
 *
 * Providers that expose text embeddings register an `EmbeddingClient`
 * under `ProviderRuntime.capabilities.embed`.
 */

import { Data, type Effect } from 'effect'

export interface EmbedOptions {
  readonly model?: string
  /**
   * Output embedding dimensions. Only honored by providers whose models
   * support dimension reduction (e.g. OpenAI's Matryoshka-compatible
   * `text-embedding-3-*` models). Transports that do not support reduction
   * ignore this field. The decision of *when* to pass dimensions belongs
   * to the consumer; the runtime is use-case agnostic about which models
   * support which reductions.
   */
  readonly dimensions?: number
  readonly signal?: AbortSignal
}

export interface EmbeddingResult {
  readonly embeddings: readonly (readonly number[])[]
  readonly model: string
  readonly usage?: { readonly inputTokens: number }
  readonly cost?: number
}

export class EmbeddingError extends Data.TaggedError('EmbeddingError')<{
  readonly provider: string
  readonly message: string
  readonly cause?: unknown
}> {}

export interface EmbeddingClient {
  embed(
    texts: readonly string[],
    options?: EmbedOptions,
  ): Effect.Effect<EmbeddingResult, EmbeddingError>
}
