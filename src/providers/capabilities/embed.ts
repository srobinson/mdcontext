/**
 * Embedding capability contract.
 *
 * Providers that expose text embeddings register an `EmbeddingClient`
 * under `ProviderRuntime.capabilities.embed`.
 */

import { Data, type Effect } from 'effect'

export interface EmbedOptions {
  readonly model?: string
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
