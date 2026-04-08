/**
 * Text generation capability contract.
 *
 * Providers that expose chat/completion register a `TextClient`
 * under `ProviderRuntime.capabilities.generateText`.
 */

import { Data, type Effect } from 'effect'

export interface GenerateTextOptions {
  readonly model?: string
  readonly maxTokens?: number
  readonly temperature?: number
  readonly systemPrompt?: string
  readonly signal?: AbortSignal
}

export interface TextGenerationResult {
  readonly text: string
  readonly model: string
  readonly usage?: {
    readonly inputTokens: number
    readonly outputTokens: number
  }
  readonly cost?: number
}

export class TextGenerationError extends Data.TaggedError(
  'TextGenerationError',
)<{
  readonly provider: string
  readonly message: string
  readonly cause?: unknown
}> {}

export interface TextClient {
  generateText(
    prompt: string,
    options?: GenerateTextOptions,
  ): Effect.Effect<TextGenerationResult, TextGenerationError>
}
