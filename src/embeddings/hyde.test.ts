/**
 * HyDE (Hypothetical Document Embeddings) Tests
 *
 * Tests for HyDE query expansion functionality.
 */

import { Effect, Redacted } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_BASE_URLS_BY_PROVIDER,
  DEFAULT_ENV_VARS_BY_PROVIDER,
  DEFAULT_MODELS_BY_PROVIDER,
  generateHypotheticalDocument,
  type HydeOptions,
  type HydeProviderName,
  type HydeResult,
  isHydeAvailable,
  shouldUseHyde,
} from './hyde.js'
import type { SemanticSearchOptions } from './types.js'

// ============================================================================
// OpenAI client mock
// ============================================================================
//
// `vi.mock` calls are hoisted by vitest, so this runs before any import of
// `openai`. The mock captures the constructor args and the chat.completions
// .create payload so individual tests can introspect what hyde.ts forwards
// to the SDK without making real network calls.

interface MockChatCreatePayload {
  model: string
  messages: Array<{ role: string; content: string }>
  max_tokens: number
  temperature: number
}

type MockChatCreateResponse = {
  choices: Array<{ message: { content: string } }>
  usage: { prompt_tokens: number; completion_tokens: number }
}

interface MockChatCompletionsCreate {
  (payload: MockChatCreatePayload): Promise<MockChatCreateResponse>
  mock: { calls: MockChatCreatePayload[][] }
  mockClear: () => void
  mockImplementationOnce: (
    impl: (payload: MockChatCreatePayload) => Promise<MockChatCreateResponse>,
  ) => MockChatCompletionsCreate
}

interface MockOpenAIConstructorArgs {
  apiKey?: string
  baseURL?: string
}

const mockChatCreate = vi.fn(async (_payload: MockChatCreatePayload) => ({
  choices: [{ message: { content: 'mock hypothetical document' } }],
  usage: { prompt_tokens: 10, completion_tokens: 20 },
})) as unknown as MockChatCompletionsCreate

const mockConstructorCalls: MockOpenAIConstructorArgs[] = []

vi.mock('openai', () => {
  // Minimal stub of the OpenAI client surface that hyde.ts touches.
  class MockOpenAI {
    chat: { completions: { create: MockChatCompletionsCreate } }
    constructor(args: MockOpenAIConstructorArgs) {
      mockConstructorCalls.push(args)
      this.chat = { completions: { create: mockChatCreate } }
    }
  }

  // Static error classes referenced by classifyLLMError. The runtime code
  // uses `instanceof` checks; an empty class is enough to keep those
  // branches reachable without triggering false positives.
  class MockBaseError extends Error {}

  return {
    default: Object.assign(MockOpenAI, {
      RateLimitError: MockBaseError,
      BadRequestError: MockBaseError,
      APIConnectionError: MockBaseError,
    }),
  }
})

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
    // Save/restore env so individual assertions can manipulate keys without
    // leaking into sibling tests. Each assertion sets exactly the env vars
    // it cares about and lets the shared cleanup put things back.
    const savedEnv = {
      openai: process.env.OPENAI_API_KEY,
      openrouter: process.env.OPENROUTER_API_KEY,
    }

    afterEach(() => {
      if (savedEnv.openai === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = savedEnv.openai
      if (savedEnv.openrouter === undefined)
        delete process.env.OPENROUTER_API_KEY
      else process.env.OPENROUTER_API_KEY = savedEnv.openrouter
    })

    it('returns a boolean regardless of env state', () => {
      const result = isHydeAvailable()
      expect(typeof result).toBe('boolean')
    })

    it('returns true for openai when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      expect(isHydeAvailable('openai')).toBe(true)
    })

    it('returns false for openai when OPENAI_API_KEY is unset', () => {
      delete process.env.OPENAI_API_KEY
      expect(isHydeAvailable('openai')).toBe(false)
    })

    it('returns true for openrouter when OPENROUTER_API_KEY is set', () => {
      delete process.env.OPENAI_API_KEY
      process.env.OPENROUTER_API_KEY = 'sk-or-test'
      expect(isHydeAvailable('openrouter')).toBe(true)
    })

    it('returns true for openrouter via OPENAI_API_KEY compat fallback', () => {
      // Mirrors the embedding-side resolver: some operators reuse a single
      // key across both endpoints rather than rotating two.
      delete process.env.OPENROUTER_API_KEY
      process.env.OPENAI_API_KEY = 'sk-test'
      expect(isHydeAvailable('openrouter')).toBe(true)
    })

    it('returns false for openrouter when neither key is set', () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.OPENROUTER_API_KEY
      expect(isHydeAvailable('openrouter')).toBe(false)
    })

    it('returns true for ollama regardless of env (local, no auth)', () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.OPENROUTER_API_KEY
      expect(isHydeAvailable('ollama')).toBe(true)
    })

    it('returns true for lm-studio regardless of env (local, no auth)', () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.OPENROUTER_API_KEY
      expect(isHydeAvailable('lm-studio')).toBe(true)
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
      const providers: HydeProviderName[] = [
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
      // Voyage AI has no chat completions API. The type system must keep
      // it out of HydeProviderName so callers cannot pin HyDE to voyage.
      // @ts-expect-error voyage is intentionally excluded from HydeProviderName
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

  describe('per-provider defaults', () => {
    it('exposes a default model for every supported provider', () => {
      expect(DEFAULT_MODELS_BY_PROVIDER.openai).toBe('gpt-4o-mini')
      expect(DEFAULT_MODELS_BY_PROVIDER.ollama).toBe('llama3.2')
      expect(DEFAULT_MODELS_BY_PROVIDER['lm-studio']).toBe('local-model')
      expect(DEFAULT_MODELS_BY_PROVIDER.openrouter).toBe('openai/gpt-4o-mini')
    })

    it('exposes a default baseURL for every supported provider', () => {
      // openai is intentionally undefined so the OpenAI SDK default applies.
      expect(DEFAULT_BASE_URLS_BY_PROVIDER.openai).toBeUndefined()
      expect(DEFAULT_BASE_URLS_BY_PROVIDER.ollama).toBe(
        'http://localhost:11434/v1',
      )
      expect(DEFAULT_BASE_URLS_BY_PROVIDER['lm-studio']).toBe(
        'http://localhost:1234/v1',
      )
      expect(DEFAULT_BASE_URLS_BY_PROVIDER.openrouter).toBe(
        'https://openrouter.ai/api/v1',
      )
    })

    it('keeps model, baseURL, and env-var maps in sync on provider keys', () => {
      // Belt-and-suspenders: any provider added to HydeProviderName must be
      // covered by every default map. Compare the key sets directly.
      const modelKeys = Object.keys(DEFAULT_MODELS_BY_PROVIDER).sort()
      const baseURLKeys = Object.keys(DEFAULT_BASE_URLS_BY_PROVIDER).sort()
      const envKeys = Object.keys(DEFAULT_ENV_VARS_BY_PROVIDER).sort()
      expect(modelKeys).toEqual(baseURLKeys)
      expect(modelKeys).toEqual(envKeys)
    })

    it('maps openai and openrouter to their native env vars', () => {
      expect(DEFAULT_ENV_VARS_BY_PROVIDER.openai).toBe('OPENAI_API_KEY')
      expect(DEFAULT_ENV_VARS_BY_PROVIDER.openrouter).toBe('OPENROUTER_API_KEY')
    })

    it('leaves local-provider env vars undefined (no auth required)', () => {
      expect(DEFAULT_ENV_VARS_BY_PROVIDER.ollama).toBeUndefined()
      expect(DEFAULT_ENV_VARS_BY_PROVIDER['lm-studio']).toBeUndefined()
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

  describe('generateHypotheticalDocument error handling', () => {
    let originalOpenAIKey: string | undefined
    let originalOpenRouterKey: string | undefined

    beforeEach(() => {
      originalOpenAIKey = process.env.OPENAI_API_KEY
      originalOpenRouterKey = process.env.OPENROUTER_API_KEY
      delete process.env.OPENAI_API_KEY
      delete process.env.OPENROUTER_API_KEY
    })

    afterEach(() => {
      if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = originalOpenAIKey
      if (originalOpenRouterKey === undefined)
        delete process.env.OPENROUTER_API_KEY
      else process.env.OPENROUTER_API_KEY = originalOpenRouterKey
    })

    it('fails with ApiKeyMissingError for openai when no key is set', async () => {
      const result = await Effect.runPromise(
        generateHypotheticalDocument('test query').pipe(Effect.either),
      )

      expect(result._tag).toBe('Left')
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('ApiKeyMissingError')
        if (result.left._tag === 'ApiKeyMissingError') {
          expect(result.left.provider).toBe('OpenAI')
          expect(result.left.envVar).toBe('OPENAI_API_KEY')
        }
      }
    })

    it('fails with ApiKeyMissingError for openrouter citing the right env var', async () => {
      // Previously the error always said OPENAI_API_KEY; a user running
      // purely on OpenRouter would hit an error that pointed at the wrong
      // var and waste time debugging credentials they never configured.
      const result = await Effect.runPromise(
        generateHypotheticalDocument('openrouter query', {
          provider: 'openrouter',
        }).pipe(Effect.either),
      )

      expect(result._tag).toBe('Left')
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('ApiKeyMissingError')
        if (result.left._tag === 'ApiKeyMissingError') {
          expect(result.left.provider).toBe('OpenRouter')
          expect(result.left.envVar).toBe('OPENROUTER_API_KEY')
        }
      }
    })

    it('does not fail for ollama when no api key is set (local provider)', async () => {
      // Sanity check that local providers do not raise ApiKeyMissingError.
      // The mocked OpenAI client still responds successfully.
      const result = await Effect.runPromise(
        generateHypotheticalDocument('local query', {
          provider: 'ollama',
        }).pipe(Effect.either),
      )

      expect(result._tag).toBe('Right')
    })

    it('does not fail for lm-studio when no api key is set (local provider)', async () => {
      const result = await Effect.runPromise(
        generateHypotheticalDocument('local query', {
          provider: 'lm-studio',
        }).pipe(Effect.either),
      )

      expect(result._tag).toBe('Right')
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
  let originalEnvKey: string | undefined

  beforeEach(() => {
    mockChatCreate.mockClear()
    mockConstructorCalls.length = 0
    originalEnvKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'sk-env-fallback'
  })

  afterEach(() => {
    if (originalEnvKey === undefined) {
      delete process.env.OPENAI_API_KEY
    } else {
      process.env.OPENAI_API_KEY = originalEnvKey
    }
  })

  it('uses openai defaults when no provider override is set', async () => {
    const result = await Effect.runPromise(
      generateHypotheticalDocument('how do I configure auth'),
    )

    expect(result.hypotheticalDocument).toBe('mock hypothetical document')
    expect(mockConstructorCalls).toHaveLength(1)
    // openai default baseURL is undefined so the SDK uses its built-in.
    expect(mockConstructorCalls[0]?.baseURL).toBeUndefined()
    expect(mockConstructorCalls[0]?.apiKey).toBe('sk-env-fallback')

    expect(mockChatCreate.mock.calls).toHaveLength(1)
    const payload = mockChatCreate.mock.calls[0]?.[0]
    expect(payload?.model).toBe('gpt-4o-mini')
  })

  it('routes through ollama defaults when provider=ollama', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('configure ollama', { provider: 'ollama' }),
    )

    expect(mockConstructorCalls[0]?.baseURL).toBe('http://localhost:11434/v1')
    expect(mockChatCreate.mock.calls[0]?.[0]?.model).toBe('llama3.2')
  })

  it('routes through lm-studio defaults when provider=lm-studio', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('local model query', {
        provider: 'lm-studio',
      }),
    )

    expect(mockConstructorCalls[0]?.baseURL).toBe('http://localhost:1234/v1')
    expect(mockChatCreate.mock.calls[0]?.[0]?.model).toBe('local-model')
  })

  it('routes through openrouter defaults when provider=openrouter', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('openrouter query', {
        provider: 'openrouter',
      }),
    )

    expect(mockConstructorCalls[0]?.baseURL).toBe(
      'https://openrouter.ai/api/v1',
    )
    expect(mockChatCreate.mock.calls[0]?.[0]?.model).toBe('openai/gpt-4o-mini')
  })

  it('explicit baseURL overrides the per-provider default', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('custom host query', {
        provider: 'ollama',
        baseURL: 'http://my-private-ollama:9999/v1',
      }),
    )

    expect(mockConstructorCalls[0]?.baseURL).toBe(
      'http://my-private-ollama:9999/v1',
    )
  })

  it('explicit model overrides the per-provider default', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('custom model query', {
        provider: 'ollama',
        model: 'qwen2.5:7b',
      }),
    )

    expect(mockChatCreate.mock.calls[0]?.[0]?.model).toBe('qwen2.5:7b')
  })

  it('forwards a custom systemPrompt to the chat call', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('what is x', {
        systemPrompt: 'You are a strict reviewer who answers in one sentence.',
      }),
    )

    const payload = mockChatCreate.mock.calls[0]?.[0]
    expect(payload?.messages?.[0]?.role).toBe('system')
    expect(payload?.messages?.[0]?.content).toBe(
      'You are a strict reviewer who answers in one sentence.',
    )
  })

  it('forwards maxTokens and temperature to the chat call', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('tuned generation', {
        maxTokens: 512,
        temperature: 0.7,
      }),
    )

    const payload = mockChatCreate.mock.calls[0]?.[0]
    expect(payload?.max_tokens).toBe(512)
    expect(payload?.temperature).toBe(0.7)
  })

  it('uses an explicit string apiKey when provided', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('explicit key', {
        apiKey: 'sk-explicit-string',
      }),
    )

    expect(mockConstructorCalls[0]?.apiKey).toBe('sk-explicit-string')
  })

  it('unwraps a Redacted apiKey before passing it to OpenAI', async () => {
    await Effect.runPromise(
      generateHypotheticalDocument('redacted key', {
        apiKey: Redacted.make('sk-redacted'),
      }),
    )

    expect(mockConstructorCalls[0]?.apiKey).toBe('sk-redacted')
  })

  it('falls back to OPENAI_API_KEY env var when apiKey is unset', async () => {
    process.env.OPENAI_API_KEY = 'sk-env-only'

    await Effect.runPromise(generateHypotheticalDocument('no explicit key'))

    expect(mockConstructorCalls[0]?.apiKey).toBe('sk-env-only')
  })

  it('reads OPENROUTER_API_KEY when provider=openrouter', async () => {
    const originalOpenRouter = process.env.OPENROUTER_API_KEY
    try {
      process.env.OPENROUTER_API_KEY = 'sk-or-specific'
      // Clear OPENAI_API_KEY so we know the env var the resolver picked.
      delete process.env.OPENAI_API_KEY

      await Effect.runPromise(
        generateHypotheticalDocument('openrouter env query', {
          provider: 'openrouter',
        }),
      )

      expect(mockConstructorCalls[0]?.apiKey).toBe('sk-or-specific')
      expect(mockConstructorCalls[0]?.baseURL).toBe(
        'https://openrouter.ai/api/v1',
      )
    } finally {
      if (originalOpenRouter === undefined)
        delete process.env.OPENROUTER_API_KEY
      else process.env.OPENROUTER_API_KEY = originalOpenRouter
    }
  })

  it('falls back to OPENAI_API_KEY for openrouter when OPENROUTER_API_KEY is unset', async () => {
    const originalOpenRouter = process.env.OPENROUTER_API_KEY
    try {
      delete process.env.OPENROUTER_API_KEY
      process.env.OPENAI_API_KEY = 'sk-shared-key'

      await Effect.runPromise(
        generateHypotheticalDocument('openrouter compat query', {
          provider: 'openrouter',
        }),
      )

      expect(mockConstructorCalls[0]?.apiKey).toBe('sk-shared-key')
    } finally {
      if (originalOpenRouter === undefined)
        delete process.env.OPENROUTER_API_KEY
      else process.env.OPENROUTER_API_KEY = originalOpenRouter
    }
  })

  it('passes a placeholder apiKey to the SDK for ollama with no env key', async () => {
    // The OpenAI SDK rejects an empty apiKey at construction time, so local
    // providers need a sentinel. The exact value is not public contract but
    // it must be a non-empty string; we assert both.
    delete process.env.OPENAI_API_KEY

    await Effect.runPromise(
      generateHypotheticalDocument('local ollama query', {
        provider: 'ollama',
      }),
    )

    expect(typeof mockConstructorCalls[0]?.apiKey).toBe('string')
    expect(mockConstructorCalls[0]?.apiKey?.length).toBeGreaterThan(0)
    // A key that literally says sk-env-fallback would mean we leaked the
    // OPENAI default into a local call. Placeholder must be distinct.
    expect(mockConstructorCalls[0]?.apiKey).not.toBe('sk-env-fallback')
  })

  it('passes a placeholder apiKey to the SDK for lm-studio with no env key', async () => {
    delete process.env.OPENAI_API_KEY

    await Effect.runPromise(
      generateHypotheticalDocument('local lm-studio query', {
        provider: 'lm-studio',
      }),
    )

    expect(typeof mockConstructorCalls[0]?.apiKey).toBe('string')
    expect(mockConstructorCalls[0]?.apiKey?.length).toBeGreaterThan(0)
  })

  it('honours an explicit apiKey even for local providers', async () => {
    delete process.env.OPENAI_API_KEY

    await Effect.runPromise(
      generateHypotheticalDocument('local with auth', {
        provider: 'ollama',
        apiKey: 'explicit-ollama-token',
      }),
    )

    expect(mockConstructorCalls[0]?.apiKey).toBe('explicit-ollama-token')
  })

  it('reports cost=0 for local providers (free inference)', async () => {
    // The previous implementation fell back to gpt-4o-mini pricing for
    // every unknown model, fabricating a cost for local inference. The
    // new behaviour returns 0 because local providers are free.
    const result = await Effect.runPromise(
      generateHypotheticalDocument('free local query', {
        provider: 'ollama',
      }),
    )

    expect(result.cost).toBe(0)
    // Sanity: we still account for tokens even when cost is zero.
    expect(result.tokensUsed).toBeGreaterThan(0)
  })

  it('reports cost=0 for lm-studio', async () => {
    const result = await Effect.runPromise(
      generateHypotheticalDocument('lm-studio query', {
        provider: 'lm-studio',
      }),
    )

    expect(result.cost).toBe(0)
  })

  it('reports cost=0 for unknown OpenRouter models', async () => {
    // OpenRouter can serve any of hundreds of models. We do not track
    // pricing for them because the catalog is too fluid; returning 0
    // rather than fabricating gpt-4o-mini pricing keeps the report
    // trustworthy.
    const result = await Effect.runPromise(
      generateHypotheticalDocument('openrouter custom', {
        provider: 'openrouter',
        model: 'anthropic/claude-3.5-sonnet',
        apiKey: 'sk-or-anything',
      }),
    )

    expect(result.cost).toBe(0)
  })

  it('still computes cost for known OpenAI models', async () => {
    // Regression check: fixing the non-OpenAI path must not break the
    // OpenAI pricing path. gpt-4o-mini: input=$0.15/M, output=$0.60/M.
    // Mock returns prompt_tokens=10, completion_tokens=20, so the
    // expected cost is 10*0.15/1e6 + 20*0.60/1e6 = 0.0000135.
    const result = await Effect.runPromise(
      generateHypotheticalDocument('known model query'),
    )

    expect(result.cost).toBeCloseTo(0.0000135, 10)
  })

  it('carries the actual provider into EmbeddingError metadata', async () => {
    // The old implementation hardcoded `provider: 'openai'` on every
    // EmbeddingError, so a user debugging a failed OpenRouter call would
    // see a misleading label. Assert the resolved provider survives the
    // catch block instead.
    mockChatCreate.mockImplementationOnce(async () => {
      throw new Error('openrouter: service unavailable')
    })

    const result = await Effect.runPromise(
      generateHypotheticalDocument('failing openrouter call', {
        provider: 'openrouter',
        apiKey: 'sk-or-any',
      }).pipe(Effect.either),
    )

    expect(result._tag).toBe('Left')
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('EmbeddingError')
      if (result.left._tag === 'EmbeddingError') {
        expect(result.left.provider).toBe('openrouter')
      }
    }
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
