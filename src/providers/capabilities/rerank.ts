/**
 * Rerank capability contract.
 *
 * Typed slot only at this stage. No provider ships a `RerankClient`
 * implementation yet; the slot exists so consumers can depend on the
 * contract without a second migration when rerank lands.
 */

import { Data, type Effect } from 'effect'

export interface RerankOptions {
  readonly model?: string
  readonly topK?: number
  readonly signal?: AbortSignal
}

export interface RerankScore {
  readonly index: number
  readonly score: number
}

export interface RerankResult {
  readonly results: readonly RerankScore[]
  readonly model: string
  readonly cost?: number
}

export class RerankError extends Data.TaggedError('RerankError')<{
  readonly provider: string
  readonly message: string
  readonly cause?: unknown
}> {}

export interface RerankClient {
  rerank(
    query: string,
    documents: readonly string[],
    options?: RerankOptions,
  ): Effect.Effect<RerankResult, RerankError>
}
