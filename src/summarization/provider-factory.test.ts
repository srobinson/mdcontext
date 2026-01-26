/**
 * Tests for Provider Factory Module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createSummarizer,
  getBestAvailableSummarizer,
} from './provider-factory.js'
import type { AISummarizationConfig } from './types.js'
import { SummarizationError } from './types.js'

vi.mock('./cli-providers/detection.js', () => ({
  isCLIInstalled: vi.fn(),
  getCLIInfo: vi.fn((name: string) => ({
    name,
    displayName: name.charAt(0).toUpperCase() + name.slice(1),
    command: name,
    args: [],
    useStdin: false,
  })),
}))

vi.mock('./cli-providers/claude.js', () => {
  return {
    ClaudeCLISummarizer: class MockClaudeCLISummarizer {
      summarize = vi.fn()
      isAvailable = vi.fn().mockResolvedValue(true)
    },
  }
})

import { isCLIInstalled } from './cli-providers/detection.js'

const mockIsCLIInstalled = vi.mocked(isCLIInstalled)

describe('createSummarizer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CLI mode', () => {
    it('should return ClaudeCLISummarizer for CLI mode with claude provider', async () => {
      mockIsCLIInstalled.mockResolvedValue(true)

      const config: AISummarizationConfig = {
        mode: 'cli',
        provider: 'claude',
      }

      const summarizer = await createSummarizer(config)

      expect(mockIsCLIInstalled).toHaveBeenCalledWith('claude')
      expect(summarizer).toBeDefined()
      expect(summarizer.summarize).toBeDefined()
      expect(summarizer.isAvailable).toBeDefined()
    })

    it('should throw PROVIDER_NOT_FOUND for unimplemented CLI providers', async () => {
      mockIsCLIInstalled.mockResolvedValue(true)

      const unimplementedProviders = [
        'opencode',
        'copilot',
        'aider',
        'cline',
        'amp',
      ] as const

      for (const provider of unimplementedProviders) {
        const config: AISummarizationConfig = {
          mode: 'cli',
          provider,
        }

        await expect(createSummarizer(config)).rejects.toThrow(
          SummarizationError,
        )

        try {
          await createSummarizer(config)
        } catch (error) {
          expect(error).toBeInstanceOf(SummarizationError)
          expect((error as SummarizationError).code).toBe('PROVIDER_NOT_FOUND')
          expect((error as SummarizationError).message).toContain(
            'not yet implemented',
          )
          expect((error as SummarizationError).provider).toBe(provider)
        }
      }
    })

    it('should throw PROVIDER_NOT_AVAILABLE if CLI not installed', async () => {
      mockIsCLIInstalled.mockResolvedValue(false)

      const config: AISummarizationConfig = {
        mode: 'cli',
        provider: 'claude',
      }

      await expect(createSummarizer(config)).rejects.toThrow(SummarizationError)

      try {
        await createSummarizer(config)
      } catch (error) {
        expect(error).toBeInstanceOf(SummarizationError)
        expect((error as SummarizationError).code).toBe(
          'PROVIDER_NOT_AVAILABLE',
        )
        expect((error as SummarizationError).message).toContain('not installed')
      }
    })

    it('should throw PROVIDER_NOT_FOUND for invalid CLI provider', async () => {
      const config = {
        mode: 'cli',
        provider: 'invalid-provider',
      } as unknown as AISummarizationConfig

      await expect(createSummarizer(config)).rejects.toThrow(SummarizationError)

      try {
        await createSummarizer(config)
      } catch (error) {
        expect(error).toBeInstanceOf(SummarizationError)
        expect((error as SummarizationError).code).toBe('PROVIDER_NOT_FOUND')
        expect((error as SummarizationError).message).toContain(
          'Invalid CLI provider',
        )
      }
    })
  })

  describe('API mode', () => {
    it('should throw PROVIDER_NOT_FOUND for API providers (not yet implemented)', async () => {
      const apiProviders = [
        'deepseek',
        'anthropic',
        'openai',
        'gemini',
        'qwen',
      ] as const

      for (const provider of apiProviders) {
        const config: AISummarizationConfig = {
          mode: 'api',
          provider,
        }

        await expect(createSummarizer(config)).rejects.toThrow(
          SummarizationError,
        )

        try {
          await createSummarizer(config)
        } catch (error) {
          expect(error).toBeInstanceOf(SummarizationError)
          expect((error as SummarizationError).code).toBe('PROVIDER_NOT_FOUND')
          expect((error as SummarizationError).message).toContain(
            'not yet implemented',
          )
        }
      }
    })

    it('should throw PROVIDER_NOT_FOUND for invalid API provider', async () => {
      const config = {
        mode: 'api',
        provider: 'not-a-real-api',
      } as unknown as AISummarizationConfig

      await expect(createSummarizer(config)).rejects.toThrow(SummarizationError)

      try {
        await createSummarizer(config)
      } catch (error) {
        expect(error).toBeInstanceOf(SummarizationError)
        expect((error as SummarizationError).code).toBe('PROVIDER_NOT_FOUND')
        expect((error as SummarizationError).message).toContain(
          'Invalid API provider',
        )
      }
    })
  })

  describe('unknown mode', () => {
    it('should throw PROVIDER_NOT_FOUND for unknown mode', async () => {
      const config = {
        mode: 'unknown',
        provider: 'claude',
      } as unknown as AISummarizationConfig

      await expect(createSummarizer(config)).rejects.toThrow(SummarizationError)

      try {
        await createSummarizer(config)
      } catch (error) {
        expect(error).toBeInstanceOf(SummarizationError)
        expect((error as SummarizationError).code).toBe('PROVIDER_NOT_FOUND')
        expect((error as SummarizationError).message).toContain(
          'Unknown summarization mode',
        )
      }
    })
  })

  describe('type guards', () => {
    it('isCLIProvider should accept valid CLI providers', async () => {
      mockIsCLIInstalled.mockResolvedValue(true)

      const validProviders = [
        'claude',
        'copilot',
        'cline',
        'aider',
        'opencode',
        'amp',
      ]

      for (const provider of validProviders) {
        const config: AISummarizationConfig = {
          mode: 'cli',
          provider: provider as AISummarizationConfig['provider'],
        }

        // Valid providers should not throw "Invalid CLI provider"
        try {
          await createSummarizer(config)
        } catch (error) {
          // May throw for other reasons (not installed, not implemented)
          // but should NOT throw "Invalid CLI provider"
          expect((error as SummarizationError).message).not.toContain(
            'Invalid CLI provider',
          )
        }
      }
    })

    it('isAPIProvider should accept valid API providers', async () => {
      const validProviders = [
        'deepseek',
        'anthropic',
        'openai',
        'gemini',
        'qwen',
      ]

      for (const provider of validProviders) {
        const config: AISummarizationConfig = {
          mode: 'api',
          provider: provider as AISummarizationConfig['provider'],
        }

        try {
          await createSummarizer(config)
        } catch (error) {
          // May throw "not yet implemented" but should NOT throw "Invalid API provider"
          expect((error as SummarizationError).message).not.toContain(
            'Invalid API provider',
          )
        }
      }
    })

    it('isCLIProvider should reject invalid providers', async () => {
      const config = {
        mode: 'cli',
        provider: 'not-valid',
      } as unknown as AISummarizationConfig

      try {
        await createSummarizer(config)
      } catch (error) {
        expect((error as SummarizationError).message).toContain(
          'Invalid CLI provider',
        )
      }
    })

    it('isAPIProvider should reject invalid providers', async () => {
      const config = {
        mode: 'api',
        provider: 'not-valid',
      } as unknown as AISummarizationConfig

      try {
        await createSummarizer(config)
      } catch (error) {
        expect((error as SummarizationError).message).toContain(
          'Invalid API provider',
        )
      }
    })
  })
})

describe('getBestAvailableSummarizer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null when no providers are available', async () => {
    mockIsCLIInstalled.mockResolvedValue(false)

    const result = await getBestAvailableSummarizer()

    expect(result).toBeNull()
  })

  it('should return ClaudeCLISummarizer when claude CLI is available', async () => {
    mockIsCLIInstalled.mockResolvedValue(true)

    const result = await getBestAvailableSummarizer()

    expect(result).not.toBeNull()
    expect(result?.config.mode).toBe('cli')
    expect(result?.config.provider).toBe('claude')
    expect(result?.summarizer).toBeDefined()
    expect(result?.summarizer.summarize).toBeDefined()
  })

  it('should respect preferredConfig when provider is available', async () => {
    mockIsCLIInstalled.mockResolvedValue(true)

    const preferredConfig: AISummarizationConfig = {
      mode: 'cli',
      provider: 'claude',
    }

    const result = await getBestAvailableSummarizer(preferredConfig)

    expect(result).not.toBeNull()
    expect(result?.config.mode).toBe('cli')
    expect(result?.config.provider).toBe('claude')
  })

  it('should fall back to auto-detection when preferredConfig fails', async () => {
    // First call for preferred config fails, second call for auto-detection succeeds
    mockIsCLIInstalled
      .mockResolvedValueOnce(false) // preferred config check fails
      .mockResolvedValueOnce(true) // auto-detection finds claude

    const preferredConfig: AISummarizationConfig = {
      mode: 'cli',
      provider: 'claude',
    }

    const result = await getBestAvailableSummarizer(preferredConfig)

    expect(result).not.toBeNull()
    expect(result?.config.provider).toBe('claude')
  })

  it('should return null when preferredConfig fails and no auto-detection succeeds', async () => {
    mockIsCLIInstalled.mockResolvedValue(false)

    const preferredConfig: AISummarizationConfig = {
      mode: 'cli',
      provider: 'claude',
    }

    const result = await getBestAvailableSummarizer(preferredConfig)

    expect(result).toBeNull()
  })

  it('should handle partial preferredConfig without mode', async () => {
    mockIsCLIInstalled.mockResolvedValue(true)

    const partialConfig = {
      provider: 'claude',
    } as Partial<AISummarizationConfig>

    const result = await getBestAvailableSummarizer(partialConfig)

    // Should fall through to auto-detection since mode is missing
    expect(result).not.toBeNull()
    expect(result?.config.mode).toBe('cli')
    expect(result?.config.provider).toBe('claude')
  })

  it('should handle partial preferredConfig without provider', async () => {
    mockIsCLIInstalled.mockResolvedValue(true)

    const partialConfig = {
      mode: 'cli',
    } as Partial<AISummarizationConfig>

    const result = await getBestAvailableSummarizer(partialConfig)

    // Should fall through to auto-detection since provider is missing
    expect(result).not.toBeNull()
    expect(result?.config.mode).toBe('cli')
    expect(result?.config.provider).toBe('claude')
  })
})
