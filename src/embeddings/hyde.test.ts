/**
 * HyDE (Hypothetical Document Embeddings) Tests
 *
 * Tests for HyDE query expansion functionality.
 */

import { Effect, Redacted } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
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

interface MockChatCompletionsCreate {
  (
    payload: MockChatCreatePayload,
  ): Promise<{
    model: string
    choices: Array<{ message: { content: string } }>
    usage: { prompt_tokens: number; completion_tokens: number }
  }>
  mock: { calls: MockChatCreatePayload[][] }
  mockClear: () => void
}

interface MockOpenAIConstructorArgs {
  apiKey?: string
  baseURL?: string
}

// Echo the requested model back in the response so the runtime's
// `result.model` matches what the consumer asked for. Real OpenAI
// responses always include a `model` field.
const mockChatCreate = vi.fn(async (payload: MockChatCreatePayload) => ({
  model: payload.model,
  choices: [{ message: { content: 'mock hypothetical document' } }],
  usage: { prompt_tokens: 10, completion_tokens: 20 },
})) as unknown as MockChatCompletionsCreate

const mockConstructorCalls: MockOpenAIConstructorArgs[] = []

vi.mock('openai', () => {
  // Minimal stub of the OpenAI client surface that the runtime's
  // `openai-compatible` transport touches when HyDE goes through it.
  class MockOpenAI {
    chat: { completions: { create: MockChatCompletionsCreate } }
    embeddings: { create: () => Promise<unknown> }
    constructor(args: MockOpenAIConstructorArgs) {
      mockConstructorCalls.push(args)
      this.chat = { completions: { create: mockChatCreate } }
      // Embeddings is unused by HyDE but the transport's surface expects
      // both clients to exist on the same OpenAI instance.
      this.embeddings = { create: async () => ({ data: [] }) }
    }
  }

  // Static error classes are exposed for any caller that still relies on
  // `instanceof OpenAI.RateLimitError`. The runtime catches errors via
  // string-matching on `error.message`, so an empty subclass is enough.
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
    it('should check if OPENAI_API_KEY is set', () => {
      // This test reflects the actual environment state
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
    it('should fail with ApiKeyMissingError when no API key', async () => {
      // Save and clear the environment variable
      const originalKey = process.env.OPENAI_API_KEY
      delete process.env.OPENAI_API_KEY

      try {
        const result = await Effect.runPromise(
          generateHypotheticalDocument('test query').pipe(Effect.either),
        )

        expect(result._tag).toBe('Left')
        if (result._tag === 'Left') {
          expect(result.left._tag).toBe('ApiKeyMissingError')
        }
      } finally {
        // Restore the environment variable
        if (originalKey) {
          process.env.OPENAI_API_KEY = originalKey
        }
      }
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
  let originalOpenAiKey: string | undefined
  let originalOpenrouterKey: string | undefined

  beforeEach(() => {
    mockChatCreate.mockClear()
    mockConstructorCalls.length = 0
    originalOpenAiKey = process.env.OPENAI_API_KEY
    originalOpenrouterKey = process.env.OPENROUTER_API_KEY
    process.env.OPENAI_API_KEY = 'sk-env-fallback'
    process.env.OPENROUTER_API_KEY = 'sk-or-env-fallback'
  })

  afterEach(() => {
    if (originalOpenAiKey === undefined) {
      delete process.env.OPENAI_API_KEY
    } else {
      process.env.OPENAI_API_KEY = originalOpenAiKey
    }
    if (originalOpenrouterKey === undefined) {
      delete process.env.OPENROUTER_API_KEY
    } else {
      process.env.OPENROUTER_API_KEY = originalOpenrouterKey
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

  it('uses OPENROUTER_API_KEY for openrouter without needing OPENAI_API_KEY (finding #1)', async () => {
    // Finding #1: HyDE used to read OPENAI_API_KEY unconditionally, so a
    // caller running with provider=openrouter and only OPENROUTER_API_KEY
    // set would crash with ApiKeyMissingError pointing at the wrong env var.
    // The runtime now resolves the credential from the provider's actual
    // env var.
    delete process.env.OPENAI_API_KEY
    process.env.OPENROUTER_API_KEY = 'sk-or-only'

    await Effect.runPromise(
      generateHypotheticalDocument('routed via openrouter', {
        provider: 'openrouter',
      }),
    )

    expect(mockConstructorCalls[0]?.apiKey).toBe('sk-or-only')
    expect(mockConstructorCalls[0]?.baseURL).toBe(
      'https://openrouter.ai/api/v1',
    )
  })

  it('fails with ApiKeyMissingError pointing at OPENROUTER_API_KEY when openrouter has no key', async () => {
    delete process.env.OPENROUTER_API_KEY

    const result = await Effect.runPromise(
      generateHypotheticalDocument('no key for openrouter', {
        provider: 'openrouter',
      }).pipe(Effect.either),
    )

    expect(result._tag).toBe('Left')
    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('ApiKeyMissingError')
      if (result.left._tag === 'ApiKeyMissingError') {
        expect(result.left.envVar).toBe('OPENROUTER_API_KEY')
      }
    }
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
    // The token counts still come back from the mock, so the consumer
    // sees real usage data alongside the zero cost.
    expect(result.tokensUsed).toBe(30)
  })

  it('reports cost: 0 for the local ollama provider', async () => {
    // Local providers are absent from the pricing table by design. The
    // computeCost path returns 0 cleanly rather than throwing.
    const result = await Effect.runPromise(
      generateHypotheticalDocument('local ollama query', {
        provider: 'ollama',
      }),
    )

    expect(result.cost).toBe(0)
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
