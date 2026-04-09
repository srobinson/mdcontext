/**
 * Tests for `createEmbeddingClient` override forwarding.
 *
 * The consumer-side bridge exposes two code paths:
 *
 *  1. Fast path (no overrides): look up the pre-registered embed
 *     client via the runtime registry. Guarantees a single static
 *     client for the common case and pins the invariant that
 *     `createEmbedClient` is NOT called — otherwise we'd rebuild the
 *     OpenAI SDK instance on every call.
 *  2. Override path (baseURL or apiKey present, non-voyage): bypass
 *     the registered client and call `createEmbedClient(id, overrides)`
 *     directly so caller-supplied endpoint / credential reach the
 *     transport. Voyage is excluded because the override contract is
 *     OpenAI-compatible only.
 *
 * Tests install a mock `createEmbedClient` via `vi.mock` against the
 * providers barrel and drive `createEmbeddingClient` through both
 * paths. Error mapping (`MissingApiKey` → `ApiKeyMissingError`) is
 * exercised via a failing mock so the override path's error surface
 * matches the registry path's.
 */

import { Effect } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiKeyMissingError } from '../errors/index.js'
import {
  type EmbeddingClient,
  type EmbeddingResult,
  MissingApiKey,
  type OpenAICompatibleProviderId,
} from '../providers/index.js'
import { createEmbeddingClient } from './embed-batched.js'

// ============================================================================
// Runtime fixture: mocked createEmbedClient + fake EmbeddingClient
// ============================================================================
//
// `vi.mock` is hoisted, so the providers barrel is replaced before any
// import that transitively depends on it (including `embed-batched.ts`).
// Only `createEmbedClient` is stubbed; the error classes and the
// registry dispatch come from `importActual` so both the override path
// (which calls the mock) and the registry path (which uses the real
// registered clients) can be exercised from the same test file.

vi.mock('../providers/index.js', async () => {
  const actual = await vi.importActual<typeof import('../providers/index.js')>(
    '../providers/index.js',
  )
  return {
    ...actual,
    createEmbedClient: vi.fn(),
  }
})

const { createEmbedClient: mockCreateEmbedClient, registerDefaultProviders } =
  await import('../providers/index.js')
const createEmbedClientMock = vi.mocked(mockCreateEmbedClient)

interface EmbedConstructionCall {
  readonly id: OpenAICompatibleProviderId
  readonly overrides:
    | Readonly<{
        baseURL?: string | undefined
        apiKey?: string | undefined
      }>
    | undefined
}

const constructionCalls: EmbedConstructionCall[] = []

const fakeEmbedClient: EmbeddingClient = {
  embed: (_texts, options) =>
    Effect.succeed({
      embeddings: [[0, 0, 0]],
      model: options?.model ?? 'mock',
    } satisfies EmbeddingResult),
}

const installFakeClient = (): void => {
  createEmbedClientMock.mockImplementation((id, overrides) => {
    constructionCalls.push({ id, overrides })
    return Effect.succeed(fakeEmbedClient)
  })
}

const REMOTE_KEYS = [
  'OPENAI_API_KEY',
  'OPENROUTER_API_KEY',
  'VOYAGE_API_KEY',
] as const

describe('createEmbeddingClient override forwarding', () => {
  const originalEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of REMOTE_KEYS) {
      originalEnv[key] = process.env[key]
    }
    // Pin a deterministic env: remote keys present so the registry path
    // does not fail on `MissingApiKey` for openai / openrouter / voyage.
    process.env.OPENAI_API_KEY = 'sk-test'
    process.env.OPENROUTER_API_KEY = 'sk-or-test'
    process.env.VOYAGE_API_KEY = 'pa-test'

    constructionCalls.length = 0
    createEmbedClientMock.mockReset()
    installFakeClient()

    // The registry path uses the default-registered clients; ensure
    // they exist for this test file's registry-path assertions.
    Effect.runSync(registerDefaultProviders())
  })

  afterEach(() => {
    for (const key of REMOTE_KEYS) {
      const value = originalEnv[key]
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })

  it('forwards an explicit baseURL override for ollama', async () => {
    await Effect.runPromise(
      createEmbeddingClient('ollama', {
        baseURL: 'http://my-private-ollama:9999/v1',
      }),
    )

    expect(createEmbedClientMock).toHaveBeenCalledTimes(1)
    expect(constructionCalls[0]?.id).toBe('ollama')
    expect(constructionCalls[0]?.overrides?.baseURL).toBe(
      'http://my-private-ollama:9999/v1',
    )
  })

  it('forwards an explicit baseURL override for lm-studio', async () => {
    await Effect.runPromise(
      createEmbeddingClient('lm-studio', {
        baseURL: 'http://my-workstation:1234/v1',
      }),
    )

    expect(constructionCalls[0]?.id).toBe('lm-studio')
    expect(constructionCalls[0]?.overrides?.baseURL).toBe(
      'http://my-workstation:1234/v1',
    )
  })

  it('forwards an explicit baseURL override for openrouter', async () => {
    await Effect.runPromise(
      createEmbeddingClient('openrouter', {
        baseURL: 'https://my-openrouter-proxy.example/v1',
      }),
    )

    expect(constructionCalls[0]?.id).toBe('openrouter')
    expect(constructionCalls[0]?.overrides?.baseURL).toBe(
      'https://my-openrouter-proxy.example/v1',
    )
  })

  it('takes the registry fast path when no overrides are supplied', async () => {
    // Invariant: the override path is strictly opt-in. Unchanged callers
    // continue to hit the registered static client and do not pay the
    // cost of reconstructing an OpenAI SDK instance.
    await Effect.runPromise(createEmbeddingClient('openai'))

    expect(createEmbedClientMock).not.toHaveBeenCalled()
  })

  it('takes the registry fast path when overrides is an empty object', async () => {
    await Effect.runPromise(createEmbeddingClient('openai', {}))

    expect(createEmbedClientMock).not.toHaveBeenCalled()
  })

  it('takes the registry fast path when baseURL is explicitly undefined', async () => {
    // Consumers pass `{ baseURL: providerConfig.baseURL }` unconditionally,
    // so `{ baseURL: undefined }` is the normal shape when the caller
    // has not overridden anything. The bridge must treat that as
    // "no override", not construct a fresh client.
    await Effect.runPromise(
      createEmbeddingClient('openai', { baseURL: undefined }),
    )

    expect(createEmbedClientMock).not.toHaveBeenCalled()
  })

  it('takes the registry fast path for voyage even when baseURL is supplied', async () => {
    // Voyage is excluded from the override contract: it has no
    // custom-host concept so the override path would be meaningless.
    // The registry path is used unchanged, and the override is
    // silently dropped at the consumer bridge.
    await Effect.runPromise(
      createEmbeddingClient('voyage', { baseURL: 'http://ignored' }),
    )

    expect(createEmbedClientMock).not.toHaveBeenCalled()
  })

  it('remaps MissingApiKey into ApiKeyMissingError on the override path', async () => {
    createEmbedClientMock.mockReturnValueOnce(
      Effect.fail(
        new MissingApiKey({
          provider: 'openrouter',
          envVar: 'OPENROUTER_API_KEY',
        }),
      ),
    )

    const result = await Effect.runPromise(
      createEmbeddingClient('openrouter', {
        baseURL: 'https://my-proxy.example/v1',
      }).pipe(Effect.either),
    )

    expect(result._tag).toBe('Left')
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(ApiKeyMissingError)
      if (result.left instanceof ApiKeyMissingError) {
        expect(result.left.provider).toBe('openrouter')
        expect(result.left.envVar).toBe('OPENROUTER_API_KEY')
      }
    }
  })

  it('forwards an apiKey override alongside baseURL', async () => {
    // Symmetry guard: createEmbedClient accepts the same ClientOverrides
    // shape as createGenerateTextClient, so an apiKey override must
    // also reach the mock when both fields are present.
    await Effect.runPromise(
      createEmbeddingClient('ollama', {
        baseURL: 'http://ollama:11434/v1',
        apiKey: 'custom-token',
      }),
    )

    expect(constructionCalls[0]?.overrides?.apiKey).toBe('custom-token')
    expect(constructionCalls[0]?.overrides?.baseURL).toBe(
      'http://ollama:11434/v1',
    )
  })
})
