/**
 * Voyage AI transport.
 *
 * Voyage is not OpenAI-compatible: its REST contract takes `input_type`
 * and does not speak the `/chat/completions` shape. This transport
 * wraps the Voyage `/embeddings` endpoint directly with `fetch` and
 * exposes an `EmbeddingClient`. The runtime never registers a
 * `TextClient` for Voyage, so asking for `generateText` on voyage
 * fails with `CapabilityNotSupported` at lookup time.
 */

import { Effect } from 'effect'
import type { EmbeddingClient, EmbeddingResult } from '../capabilities/embed.js'
import { EmbeddingError } from '../capabilities/embed.js'
import { MissingApiKey } from '../errors.js'

const VOYAGE_BASE_URL = 'https://api.voyageai.com/v1'
const VOYAGE_ENV_VAR = 'VOYAGE_API_KEY'

interface VoyageEmbeddingResponse {
  readonly data: ReadonlyArray<{
    readonly embedding: readonly number[]
    readonly index: number
  }>
  readonly model: string
  readonly usage?: { readonly total_tokens?: number }
}

const resolveVoyageApiKey = (): Effect.Effect<string, MissingApiKey> => {
  const value = process.env[VOYAGE_ENV_VAR]
  if (value === undefined || value === '') {
    return Effect.fail(
      new MissingApiKey({
        provider: 'voyage',
        envVar: VOYAGE_ENV_VAR,
      }),
    )
  }
  return Effect.succeed(value)
}

const VOYAGE_REQUEST_TIMEOUT_MS = 30_000

/**
 * Construct an `EmbeddingClient` that speaks the Voyage REST contract.
 *
 * Fails with `MissingApiKey` when `VOYAGE_API_KEY` is unset.
 *
 * The `embed` call enforces a 30s request timeout via `AbortController`
 * so a hung connection cannot stall an indexing run indefinitely. If the
 * caller passes its own `signal`, aborting it also cancels the request.
 *
 * A non-OK response is surfaced as `EmbeddingError` with the status code
 * in the message (`Voyage API 401: ...`). The batch path in
 * `src/embeddings/embed-batched.ts` already classifies 401-shaped messages
 * into `ApiKeyInvalidError` via string matching, so the signal is
 * preserved end to end without widening the capability interface.
 */
export const createVoyageEmbedClient = (): Effect.Effect<
  EmbeddingClient,
  MissingApiKey
> =>
  Effect.map(resolveVoyageApiKey(), (apiKey) => ({
    embed: (texts, options) =>
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
              'voyage embed call requires options.model. The runtime does not default the embedding model — callers resolve it from config.',
            )
          }
          const controller = new AbortController()
          const timeoutId = setTimeout(
            () => controller.abort(),
            VOYAGE_REQUEST_TIMEOUT_MS,
          )
          if (options?.signal !== undefined) {
            if (options.signal.aborted) {
              controller.abort()
            } else {
              options.signal.addEventListener(
                'abort',
                () => controller.abort(),
                { once: true },
              )
            }
          }
          let response: Response
          try {
            response = await fetch(`${VOYAGE_BASE_URL}/embeddings`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                input: texts,
                input_type: 'document',
              }),
              signal: controller.signal,
            })
          } finally {
            clearTimeout(timeoutId)
          }
          if (!response.ok) {
            const body = await response.text()
            throw new Error(`Voyage API ${response.status}: ${body}`)
          }
          const json = (await response.json()) as VoyageEmbeddingResponse
          const inputTokens = json.usage?.total_tokens ?? 0
          const result: EmbeddingResult = {
            embeddings: json.data.map((d) => d.embedding),
            model: json.model,
            ...(json.usage ? { usage: { inputTokens } } : {}),
          }
          return result
        },
        catch: (cause) =>
          new EmbeddingError({
            provider: 'voyage',
            message: cause instanceof Error ? cause.message : String(cause),
            cause,
          }),
      }),
  }))

/**
 * Voyage base URL. Exposed so consumers can mirror it without having
 * to hardcode the string.
 */
export const getVoyageBaseURL = (): string => VOYAGE_BASE_URL
