/**
 * HyDE (Hypothetical Document Embeddings) Tests
 *
 * Tests for HyDE query expansion functionality. Runtime-forwarding
 * tests drive `generateHypotheticalDocument` through fake `TextClient`
 * instances installed at both the registry (fast path) and at the
 * transport-factory mock (override path). HyDE calls with no overrides
 * go through the registry, so tests populate the registry in
 * `beforeEach` with a per-provider fake client that records the
 * provider id via closure. HyDE calls with a `baseURL` or `apiKey`
 * override bypass the registry and invoke the mocked
 * `createGenerateTextClient` directly; those tests assert against
 * `clientConstructionCalls`.
 *
 * The tests operate at the runtime boundary — the `TextClient`
 * interface — rather than the OpenAI SDK boundary, so a refactor of
 * the transport cannot silently regress HyDE's contract.
 *
 * Tests that exercise the pure HyDE logic (query pattern detection,
 * options types, exports) do not interact with the mock and continue
 * to run unchanged.
 */

import { Effect, Redacted } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearRegistry,
  type GenerateTextOptions,
  MissingApiKey,
  type OpenAICompatibleProviderId,
  registerProvider,
  type TextClient,
  type TextGenerationResult,
} from '../providers/index.js'
import {
  generateHypotheticalDocument,
  type HydeOptions,
  type HydeResult,
  isHydeAvailable,
  shouldUseHyde,
} from './hyde.js'
import { resolveHydeOptions } from './hyde-options.js'
import type { SemanticSearchOptions } from './types.js'

// ============================================================================
// Runtime fixture: mocked createGenerateTextClient + fake TextClient
// ============================================================================
//
// `vi.mock` is hoisted, so the openai-compatible transport module is
// replaced before any import that transitively depends on it. The mock
// target is the transport module itself because `resolve-client.ts`
// (under `src/providers/`) imports `createGenerateTextClient` directly
// from `./transports/openai-compatible.js` — the providers barrel is
// NOT in that import path, so mocking the barrel would leave the real
// factory in place. Only `createGenerateTextClient` is stubbed; the
// type exports and `PROVIDER_CONFIGS` come from `importActual` so
// HyDE's pure logic still exercises the real code.

vi.mock('../providers/transports/openai-compatible.js', async () => {
  const actual = await vi.importActual<
    typeof import('../providers/transports/openai-compatible.js')
  >('../providers/transports/openai-compatible.js')
  return {
    ...actual,
    createGenerateTextClient: vi.fn(),
  }
})

const { createGenerateTextClient: mockCreateGenerateTextClient } = await import(
  '../providers/transports/openai-compatible.js'
)
const createGenerateTextClientMock = vi.mocked(mockCreateGenerateTextClient)

interface ClientConstructionCall {
  readonly id: OpenAICompatibleProviderId
  readonly overrides:
    | Readonly<{
        baseURL?: string | undefined
        apiKey?: string | undefined
      }>
    | undefined
}

interface GenerateTextCall {
  readonly provider: OpenAICompatibleProviderId
  readonly prompt: string
  readonly options: Readonly<GenerateTextOptions> | undefined
}

const clientConstructionCalls: ClientConstructionCall[] = []
const generateTextCalls: GenerateTextCall[] = []

// Build a fake `TextClient` that tags each call with the provider id
// via closure. Per-provider tagging lets fast-path tests verify that
// HyDE dispatched through the correct registry entry without relying
// on the transport factory mock (which the fast path does not touch).
// Token counts are fixed across every call so assertions on
// `tokensUsed` and `cost` stay deterministic, and the model is echoed
// back so HyDE's cost calculation runs against the real model name
// the caller pinned.
const makeFakeTextClient = (
  provider: OpenAICompatibleProviderId,
): TextClient => ({
  generateText: (prompt, options) => {
    generateTextCalls.push({ provider, prompt, options })
    return Effect.succeed({
      text: 'mock hypothetical document',
      model: options?.model ?? 'unknown',
      usage: { inputTokens: 10, outputTokens: 20 },
    } satisfies TextGenerationResult)
  },
})

const ALL_HYDE_PROVIDERS: readonly OpenAICompatibleProviderId[] = [
  'openai',
  'ollama',
  'lm-studio',
  'openrouter',
]

const installFakeClient = (): void => {
  createGenerateTextClientMock.mockImplementation((id, overrides) => {
    clientConstructionCalls.push({ id, overrides })
    return Effect.succeed(makeFakeTextClient(id))
  })
}

// Populate the registry with a fake runtime per HyDE provider. The
// fast path (no overrides) reads from the registry, so tests need a
// deterministic fake client there. Uses `clearRegistry` first to
// drop any state leaked from other test files sharing the same
// module-level registry Map.
const registerFakeRuntimes = (): void => {
  clearRegistry()
  for (const id of ALL_HYDE_PROVIDERS) {
    registerProvider({
      id,
      capabilities: { generateText: makeFakeTextClient(id) },
    })
  }
}

describe('HyDE Query Expansion', () => {
  describe('shouldUseHyde detection', () => {
    it('should recommend HyDE for question queries', () => {
      expect(shouldUseHyde('How do I configure authentication?')).toBe(true)
      expect(shouldUseHyde('What is the best way to handle errors?')).toBe(true)
      expect(shouldUseHyde('Why is my build failing?')).toBe(true)
      expect(shouldUseHyde('When should I use caching?')).toBe(true)
      expect(shouldUseHyde('Where are the configuration files?')).toBe(true)
    })

    it('should recommend HyDE for procedural queries', () => {
      expect(shouldUseHyde('setup react project with typescript')).toBe(true)
      expect(shouldUseHyde('install dependencies for the project')).toBe(true)
      expect(shouldUseHyde('configure webpack for production')).toBe(true)
      expect(shouldUseHyde('implement user authentication flow')).toBe(true)
    })

    it('should recommend HyDE for longer queries (6+ words)', () => {
      expect(
        shouldUseHyde('user login flow with oauth and refresh tokens'),
      ).toBe(true)
      expect(
        shouldUseHyde(
          'database connection pooling configuration options for mysql',
        ),
      ).toBe(true)
    })

    it('should not recommend HyDE for short queries', () => {
      expect(shouldUseHyde('api')).toBe(false)
      expect(shouldUseHyde('config')).toBe(false)
      expect(shouldUseHyde('user auth')).toBe(false)
    })

    it('should not recommend HyDE for exact phrase searches', () => {
      expect(shouldUseHyde('"exact phrase match"')).toBe(false)
    })

    it('should recommend HyDE for queries ending with question mark', () => {
      expect(shouldUseHyde('database configuration options?')).toBe(true)
    })

    it('should handle edge cases gracefully', () => {
      expect(shouldUseHyde('')).toBe(false)
      expect(shouldUseHyde('   ')).toBe(false)
      expect(shouldUseHyde('a')).toBe(false)
    })
  })

  describe('isHydeAvailable', () => {
    it('should report whether any remote provider credential is set', () => {
      // Delegates to hasAnyRemoteApiKey, so any of OPENAI_API_KEY or
      // OPENROUTER_API_KEY being set flips this to true. This test
      // reflects the actual environment state.
      const result = isHydeAvailable()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('HydeOptions interface', () => {
    it('should accept all configuration options', () => {
      const options: HydeOptions = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        maxTokens: 256,
        temperature: 0.3,
        systemPrompt: 'Custom prompt',
        baseURL: 'http://localhost:1234/v1',
      }

      expect(options.provider).toBe('openai')
      expect(options.apiKey).toBe('test-key')
      expect(options.model).toBe('gpt-4o-mini')
      expect(options.maxTokens).toBe(256)
      expect(options.temperature).toBe(0.3)
      expect(options.systemPrompt).toBe('Custom prompt')
      expect(options.baseURL).toBe('http://localhost:1234/v1')
    })

    it('should accept each supported provider', () => {
      // Compile-time assertion: each provider name is assignable to the
      // public union. The runtime expect just keeps vitest happy.
      const providers: OpenAICompatibleProviderId[] = [
        'openai',
        'ollama',
        'lm-studio',
        'openrouter',
      ]
      for (const provider of providers) {
        const options: HydeOptions = { provider }
        expect(options.provider).toBe(provider)
      }
    })

    it('should reject voyage at the type level', () => {
      // Voyage AI has no chat completions API. The HydeOptions.provider
      // type (OpenAICompatibleProviderId) must keep voyage out so callers
      // cannot pin HyDE to voyage.
      // @ts-expect-error voyage is intentionally excluded from OpenAICompatibleProviderId
      const _options: HydeOptions = { provider: 'voyage' }
      // Reference _options to silence noUnusedLocals.
      expect(_options.provider).toBe('voyage')
    })

    it('should accept Redacted apiKey', () => {
      const options: HydeOptions = {
        apiKey: Redacted.make('sk-test'),
      }
      expect(Redacted.isRedacted(options.apiKey)).toBe(true)
    })

    it('should allow partial options', () => {
      const options: HydeOptions = {
        model: 'gpt-4o',
      }
      expect(options.model).toBe('gpt-4o')
      expect(options.apiKey).toBeUndefined()
      expect(options.provider).toBeUndefined()
    })

    it('should allow empty options', () => {
      const options: HydeOptions = {}
      expect(options).toEqual({})
    })
  })

  describe('HydeResult interface', () => {
    it('should have required fields', () => {
      const result: HydeResult = {
        hypotheticalDocument: 'Generated content about authentication...',
        originalQuery: 'How do I configure authentication?',
        model: 'gpt-4o-mini',
        tokensUsed: 150,
        cost: 0.00003,
      }

      expect(result.hypotheticalDocument).toBeDefined()
      expect(result.originalQuery).toBeDefined()
      expect(result.model).toBeDefined()
      expect(result.tokensUsed).toBeDefined()
      expect(result.cost).toBeDefined()
    })
  })

  describe('SemanticSearchOptions hyde integration', () => {
    it('should accept hyde option in SemanticSearchOptions', () => {
      const options: SemanticSearchOptions = {
        hyde: true,
      }
      expect(options.hyde).toBe(true)
    })

    it('should default to undefined (HyDE disabled)', () => {
      const options: SemanticSearchOptions = {}
      expect(options.hyde).toBeUndefined()
    })

    it('should accept hydeOptions when hyde is enabled', () => {
      const options: SemanticSearchOptions = {
        hyde: true,
        hydeOptions: {
          model: 'gpt-4o',
          maxTokens: 512,
          temperature: 0.5,
        },
      }
      expect(options.hyde).toBe(true)
      expect(options.hydeOptions?.model).toBe('gpt-4o')
      expect(options.hydeOptions?.maxTokens).toBe(512)
      expect(options.hydeOptions?.temperature).toBe(0.5)
    })

    it('should accept hyde with other search options', () => {
      const options: SemanticSearchOptions = {
        limit: 10,
        threshold: 0.35,
        quality: 'thorough',
        hyde: true,
        hydeOptions: {
          model: 'gpt-4o-mini',
        },
      }
      expect(options.limit).toBe(10)
      expect(options.threshold).toBe(0.35)
      expect(options.quality).toBe('thorough')
      expect(options.hyde).toBe(true)
    })
  })

  describe('Query pattern detection', () => {
    describe('question patterns', () => {
      it('should detect "how" questions', () => {
        expect(shouldUseHyde('how to implement feature X')).toBe(true)
        expect(shouldUseHyde('how does the build system work')).toBe(true)
      })

      it('should detect "what" questions', () => {
        expect(shouldUseHyde('what is the recommended approach')).toBe(true)
        expect(shouldUseHyde('what are the configuration options')).toBe(true)
      })

      it('should detect "can/could/should" questions', () => {
        expect(shouldUseHyde('can I use custom validators here')).toBe(true)
        expect(shouldUseHyde('should I enable caching for this')).toBe(true)
      })

      it('should detect "is/are/does/do" questions', () => {
        expect(shouldUseHyde('is there a way to override this')).toBe(true)
        expect(shouldUseHyde('are there any known issues with')).toBe(true)
        expect(shouldUseHyde('does the API support pagination')).toBe(true)
      })
    })

    describe('procedural patterns', () => {
      it('should detect setup/install queries', () => {
        expect(shouldUseHyde('setup local development environment')).toBe(true)
        expect(shouldUseHyde('install required dependencies for testing')).toBe(
          true,
        )
      })

      it('should detect configure/implement queries', () => {
        expect(shouldUseHyde('configure database connection pooling')).toBe(
          true,
        )
        expect(shouldUseHyde('implement user session management')).toBe(true)
      })

      it('should detect fix/debug/resolve queries', () => {
        expect(shouldUseHyde('fix the authentication issue with tokens')).toBe(
          true,
        )
        expect(shouldUseHyde('debug memory leak in the application')).toBe(true)
        expect(shouldUseHyde('resolve dependency conflicts in package')).toBe(
          true,
        )
      })

      it('should detect guide/tutorial/example queries', () => {
        expect(shouldUseHyde('guide for setting up CI CD')).toBe(true)
        expect(shouldUseHyde('tutorial for building REST APIs')).toBe(true)
        expect(shouldUseHyde('example of using custom hooks')).toBe(true)
      })
    })
  })
})

describe('generateHypotheticalDocument runtime forwarding', () => {
  beforeEach(() => {
    clientConstructionCalls.length = 0
    generateTextCalls.length = 0
    createGenerateTextClientMock.mockReset()
    installFakeClient()
    registerFakeRuntimes()
  })

  afterEach(() => {
    createGenerateTextClientMock.mockReset()
    clearRegistry()
  })

  it('dispatches through the registered openai runtime by default', async () => {
    const result = await Effect.runPromise(
      generateHypotheticalDocument('how do I configure auth'),
    )

    expect(result.hypotheticalDocument).toBe('mock hypothetical document')
    // Fast path: the transport factory mock is NOT invoked; the
    // registered openai runtime is reused from the registry.
    expect(clientConstructionCalls).toHaveLength(0)
    expect(generateTextCalls).toHaveLength(1)
    expect(generateTextCalls[0]?.provider).toBe('openai')
    expect(generateTextCalls[0]?.options?.model).toBe('gpt-4o-mini')
  })

  it('routes through ollama defaults when provider=ollama', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('configure ollama', { provider: 'ollama' }),
    )

    expect(clientConstructionCalls).toHaveLength(0)
    expect(generateTextCalls[0]?.provider).toBe('ollama')
    expect(generateTextCalls[0]?.options?.model).toBe('llama3.2')
  })

  it('routes through lm-studio defaults when provider=lm-studio', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('local model query', {
        provider: 'lm-studio',
      }),
    )

    expect(clientConstructionCalls).toHaveLength(0)
    expect(generateTextCalls[0]?.provider).toBe('lm-studio')
    expect(generateTextCalls[0]?.options?.model).toBe('local-model')
  })

  it('routes through openrouter defaults when provider=openrouter', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('openrouter query', {
        provider: 'openrouter',
      }),
    )

    expect(clientConstructionCalls).toHaveLength(0)
    expect(generateTextCalls[0]?.provider).toBe('openrouter')
    expect(generateTextCalls[0]?.options?.model).toBe('openai/gpt-4o-mini')
  })

  it('forwards an explicit baseURL override to the runtime factory', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('custom host query', {
        provider: 'ollama',
        baseURL: 'http://my-private-ollama:9999/v1',
      }),
    )

    expect(clientConstructionCalls[0]?.overrides).toEqual({
      baseURL: 'http://my-private-ollama:9999/v1',
    })
  })

  it('explicit model overrides the per-provider default', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('custom model query', {
        provider: 'ollama',
        model: 'qwen2.5:7b',
      }),
    )

    expect(generateTextCalls[0]?.options?.model).toBe('qwen2.5:7b')
  })

  it('forwards a custom systemPrompt to the runtime generateText call', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('what is x', {
        systemPrompt: 'You are a strict reviewer who answers in one sentence.',
      }),
    )

    expect(generateTextCalls[0]?.options?.systemPrompt).toBe(
      'You are a strict reviewer who answers in one sentence.',
    )
  })

  it('forwards maxTokens and temperature to the runtime generateText call', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('tuned generation', {
        maxTokens: 512,
        temperature: 0.7,
      }),
    )

    expect(generateTextCalls[0]?.options?.maxTokens).toBe(512)
    expect(generateTextCalls[0]?.options?.temperature).toBe(0.7)
  })

  it('uses an explicit string apiKey when provided', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('explicit key', {
        apiKey: 'sk-explicit-string',
      }),
    )

    expect(clientConstructionCalls[0]?.overrides?.apiKey).toBe(
      'sk-explicit-string',
    )
  })

  it('unwraps a Redacted apiKey before passing it to the runtime factory', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('redacted key', {
        apiKey: Redacted.make('sk-redacted'),
      }),
    )

    expect(clientConstructionCalls[0]?.overrides?.apiKey).toBe('sk-redacted')
  })

  it('dispatches to the registered openrouter runtime without fabricating credentials (finding #1)', async () => {
    // Finding #1: HyDE used to read OPENAI_API_KEY unconditionally, so
    // a caller running with provider=openrouter and only
    // OPENROUTER_API_KEY set would crash with an error pointing at the
    // wrong env var. The new path dispatches through the registry when
    // no apiKey/baseURL override is supplied, so HyDE never fabricates
    // a credential at call time; credential resolution happens exactly
    // once, at `registerDefaultProviders` time, via the transport's
    // per-provider env-var lookup.
    await Effect.runPromise(
      generateHypotheticalDocument('routed via openrouter', {
        provider: 'openrouter',
      }),
    )

    expect(generateTextCalls).toHaveLength(1)
    expect(generateTextCalls[0]?.provider).toBe('openrouter')
    // Fast path: the transport factory is NOT invoked at call time, so
    // no ad-hoc apiKey or baseURL can leak in from the consumer side.
    expect(clientConstructionCalls).toHaveLength(0)
  })

  it('remaps runtime MissingApiKey into ApiKeyMissingError labeled with the pinned provider (finding #1)', async () => {
    // Finding #1 error-labeling regression guard. When the runtime
    // factory fails with MissingApiKey for openrouter, HyDE must
    // surface the CLI-facing `ApiKeyMissingError` carrying the
    // openrouter label and OPENROUTER_API_KEY env var — never the
    // openai fallback.
    //
    // Forces the override path via `baseURL` because the registry
    // fast path cannot raise a transport-level `MissingApiKey` at call
    // time (the registered client was already constructed at
    // bootstrap). The error-remapping logic lives in
    // `src/providers/resolve-client.ts` and is identical on both paths.
    createGenerateTextClientMock.mockReturnValueOnce(
      Effect.fail(
        new MissingApiKey({
          provider: 'openrouter',
          envVar: 'OPENROUTER_API_KEY',
        }),
      ),
    )

    const result = await Effect.runPromise(
      generateHypotheticalDocument('no key for openrouter', {
        provider: 'openrouter',
        baseURL: 'https://openrouter.ai/api/v1',
      }).pipe(Effect.either),
    )

    expect(result._tag).toBe('Left')
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('ApiKeyMissingError')
      if (result.left._tag === 'ApiKeyMissingError') {
        expect(result.left.provider).toBe('openrouter')
        expect(result.left.envVar).toBe('OPENROUTER_API_KEY')
      }
    }
  })

  it('forwards a custom baseURL through the full resolveHydeOptions pipeline (finding #2)', async () => {
    // Finding #2: the embedding side is pointed at a custom ollama host
    // via providerConfig.baseURL, and the caller pins hydeOptions.provider
    // to the same provider. The old resolver gated baseURL inheritance on
    // `hydeOptions?.provider === undefined`, silently dropping the custom
    // host the moment the caller named the provider. The new resolver
    // inherits the baseURL when the providers match, and HyDE forwards it
    // verbatim to `createGenerateTextClient`. End-to-end: the runtime
    // factory receives the custom host, not localhost.
    const options: SemanticSearchOptions = {
      providerConfig: {
        provider: 'ollama',
        baseURL: 'http://my-host:11434/v1',
      },
      hydeOptions: { provider: 'ollama' },
    }

    const resolved = await Effect.runPromise(resolveHydeOptions(options))
    await Effect.runPromise(
      generateHypotheticalDocument('finding #2 query', resolved),
    )

    expect(clientConstructionCalls[0]?.id).toBe('ollama')
    expect(clientConstructionCalls[0]?.overrides?.baseURL).toBe(
      'http://my-host:11434/v1',
    )
  })

  it('reports cost: 0 for a model that is not in the pricing table (finding #3)', async () => {
    // Finding #3: the previous LLM_PRICING fallback fabricated a cost
    // from gpt-4o-mini's rates whenever the requested model was unknown.
    // The new path looks up pricing per model and reports 0 on a miss,
    // so local providers and custom models do not get charged a fake
    // dollar value.
    const result = await Effect.runPromise(
      generateHypotheticalDocument('unknown model query', {
        model: 'completely-unknown-custom-model',
      }),
    )

    expect(result.cost).toBe(0)
    expect(result.model).toBe('completely-unknown-custom-model')
    // The token counts still come back from the fake client, so the
    // consumer sees real usage data alongside the zero cost.
    expect(result.tokensUsed).toBe(30)
  })

  it('reports cost: 0 for the local ollama provider with its default model (finding #3)', async () => {
    // Finding #3 companion test for the local-provider path. The
    // per-provider default model for ollama (`llama3.2`) is absent from
    // the pricing table by design — local models have zero hosted cost.
    // The computeCost path returns 0 cleanly rather than throwing or
    // fabricating a cost from a remote model's rates.
    const result = await Effect.runPromise(
      generateHypotheticalDocument('local ollama query', {
        provider: 'ollama',
      }),
    )

    expect(result.cost).toBe(0)
    expect(result.model).toBe('llama3.2')
  })

  it('reports cost: 0 for the local lm-studio provider with its default model (finding #3)', async () => {
    const result = await Effect.runPromise(
      generateHypotheticalDocument('local lm-studio query', {
        provider: 'lm-studio',
      }),
    )

    expect(result.cost).toBe(0)
    expect(result.model).toBe('local-model')
  })
})

describe('Export verification', () => {
  it('should export HyDE functions from types module', async () => {
    const { generateHypotheticalDocument, isHydeAvailable, shouldUseHyde } =
      await import('./hyde.js')
    expect(generateHypotheticalDocument).toBeDefined()
    expect(typeof generateHypotheticalDocument).toBe('function')
    expect(isHydeAvailable).toBeDefined()
    expect(typeof isHydeAvailable).toBe('function')
    expect(shouldUseHyde).toBeDefined()
    expect(typeof shouldUseHyde).toBe('function')
  })

  it('should export HyDE functions from main embeddings module', async () => {
    const { generateHypotheticalDocument, isHydeAvailable, shouldUseHyde } =
      await import('./index.js')
    expect(generateHypotheticalDocument).toBeDefined()
    expect(isHydeAvailable).toBeDefined()
    expect(shouldUseHyde).toBeDefined()
  })
})
