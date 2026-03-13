/**
 * Tests for Summarization Pipeline Module
 */

import { Effect } from 'effect'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatResultsForSummary,
  type PipelineOptions,
  runSummarizationPipeline,
  type SummarizableResult,
  summarizeResults,
} from './pipeline.js'
import type { SearchContext } from './prompts.js'
import { SummarizationError } from './types.js'

vi.mock('./provider-factory.js', () => ({
  createSummarizer: vi.fn(),
  getBestAvailableSummarizer: vi.fn(),
}))

vi.mock('./cost.js', () => ({
  estimateSummaryCost: vi.fn(),
}))

import { estimateSummaryCost } from './cost.js'
import {
  createSummarizer,
  getBestAvailableSummarizer,
} from './provider-factory.js'

const mockedCreateSummarizer = vi.mocked(createSummarizer)
const mockedGetBestAvailableSummarizer = vi.mocked(getBestAvailableSummarizer)
const mockedEstimateSummaryCost = vi.mocked(estimateSummaryCost)

describe('formatResultsForSummary', () => {
  it('should format basic results with documentPath and heading', () => {
    const results: SummarizableResult[] = [
      { documentPath: '/docs/readme.md', heading: 'Getting Started' },
      { documentPath: '/docs/api.md', heading: 'API Reference' },
    ]

    const formatted = formatResultsForSummary(results)

    expect(formatted).toContain('[1] /docs/readme.md')
    expect(formatted).toContain('Heading: Getting Started')
    expect(formatted).toContain('[2] /docs/api.md')
    expect(formatted).toContain('Heading: API Reference')
  })

  it('should include score when present', () => {
    const results: SummarizableResult[] = [
      { documentPath: '/docs/guide.md', heading: 'User Guide', score: 0.95 },
    ]

    const formatted = formatResultsForSummary(results)

    expect(formatted).toContain('Score: 95.0%')
  })

  it('should include similarity when present', () => {
    const results: SummarizableResult[] = [
      {
        documentPath: '/docs/guide.md',
        heading: 'User Guide',
        similarity: 0.87,
      },
    ]

    const formatted = formatResultsForSummary(results)

    expect(formatted).toContain('Similarity: 87.0%')
  })

  it('should include both score and similarity when present', () => {
    const results: SummarizableResult[] = [
      {
        documentPath: '/docs/guide.md',
        heading: 'User Guide',
        score: 0.95,
        similarity: 0.87,
      },
    ]

    const formatted = formatResultsForSummary(results)

    expect(formatted).toContain('Score: 95.0%')
    expect(formatted).toContain('Similarity: 87.0%')
  })

  it('should truncate long content to 500 chars', () => {
    const longContent = 'x'.repeat(600)
    const results: SummarizableResult[] = [
      {
        documentPath: '/docs/long.md',
        heading: 'Long Content',
        content: longContent,
      },
    ]

    const formatted = formatResultsForSummary(results)

    expect(formatted).toContain(`Content: ${'x'.repeat(500)}...`)
    expect(formatted).not.toContain('x'.repeat(501))
  })

  it('should include full content when under 500 chars', () => {
    const shortContent = 'This is short content'
    const results: SummarizableResult[] = [
      {
        documentPath: '/docs/short.md',
        heading: 'Short Content',
        content: shortContent,
      },
    ]

    const formatted = formatResultsForSummary(results)

    expect(formatted).toContain('Content: This is short content')
    expect(formatted).not.toContain('...')
  })

  it('should handle empty array', () => {
    const results: SummarizableResult[] = []

    const formatted = formatResultsForSummary(results)

    expect(formatted).toBe('')
  })

  it('should number results correctly', () => {
    const results: SummarizableResult[] = [
      { documentPath: '/a.md', heading: 'First' },
      { documentPath: '/b.md', heading: 'Second' },
      { documentPath: '/c.md', heading: 'Third' },
    ]

    const formatted = formatResultsForSummary(results)

    expect(formatted).toContain('[1] /a.md')
    expect(formatted).toContain('[2] /b.md')
    expect(formatted).toContain('[3] /c.md')
  })

  it('should separate results with blank lines', () => {
    const results: SummarizableResult[] = [
      { documentPath: '/a.md', heading: 'First' },
      { documentPath: '/b.md', heading: 'Second' },
    ]

    const formatted = formatResultsForSummary(results)

    expect(formatted).toContain('\n\n')
  })
})

describe('runSummarizationPipeline', () => {
  const mockSearchContext: SearchContext = {
    query: 'test query',
    resultCount: 3,
    searchMode: 'hybrid',
  }

  const mockResults: SummarizableResult[] = [
    { documentPath: '/docs/test.md', heading: 'Test', content: 'Test content' },
  ]

  const mockSummarizer = {
    summarize: vi.fn(),
    isAvailable: vi.fn().mockResolvedValue(true),
  }

  const mockCostEstimate = {
    inputTokens: 100,
    outputTokens: 500,
    estimatedCost: 0,
    provider: 'claude',
    isPaid: false,
    formattedCost: 'FREE (subscription)',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockedEstimateSummaryCost.mockReturnValue(mockCostEstimate)
    mockSummarizer.summarize.mockResolvedValue({
      summary: 'Test summary',
      provider: 'claude',
      mode: 'cli',
      estimatedCost: 0,
      durationMs: 1000,
    })
  })

  it('should get summarizer from config when provided', async () => {
    mockedCreateSummarizer.mockResolvedValue(mockSummarizer)

    const options: PipelineOptions = {
      config: { mode: 'cli', provider: 'claude' },
    }

    const result = await Effect.runPromise(
      runSummarizationPipeline(mockResults, mockSearchContext, options),
    )

    expect(mockedCreateSummarizer).toHaveBeenCalled()
    expect(mockedGetBestAvailableSummarizer).not.toHaveBeenCalled()
    expect(result.summary).toBe('Test summary')
  })

  it('should fall back to auto-detection when no config', async () => {
    mockedGetBestAvailableSummarizer.mockResolvedValue({
      summarizer: mockSummarizer,
      config: { mode: 'cli', provider: 'claude' },
    })

    const result = await Effect.runPromise(
      runSummarizationPipeline(mockResults, mockSearchContext),
    )

    expect(mockedGetBestAvailableSummarizer).toHaveBeenCalled()
    expect(mockedCreateSummarizer).not.toHaveBeenCalled()
    expect(result.summary).toBe('Test summary')
  })

  it('should estimate cost and include in result', async () => {
    mockedCreateSummarizer.mockResolvedValue(mockSummarizer)

    const options: PipelineOptions = {
      config: { mode: 'cli', provider: 'claude' },
    }

    const result = await Effect.runPromise(
      runSummarizationPipeline(mockResults, mockSearchContext, options),
    )

    expect(mockedEstimateSummaryCost).toHaveBeenCalled()
    expect(result.estimatedCost).toEqual(mockCostEstimate)
    expect(result.isFree).toBe(true)
  })

  it('should check consent for paid providers when not skipped', async () => {
    mockedCreateSummarizer.mockResolvedValue(mockSummarizer)

    const paidCostEstimate = {
      ...mockCostEstimate,
      isPaid: true,
      estimatedCost: 0.01,
      formattedCost: '$0.0100',
    }
    mockedEstimateSummaryCost.mockReturnValue(paidCostEstimate)

    const onConsentPrompt = vi.fn().mockResolvedValue(true)

    const options: PipelineOptions = {
      config: { mode: 'api', provider: 'deepseek' },
      onConsentPrompt,
    }

    const result = await Effect.runPromise(
      runSummarizationPipeline(mockResults, mockSearchContext, options),
    )

    expect(onConsentPrompt).toHaveBeenCalledWith(paidCostEstimate)
    expect(result.isFree).toBe(false)
  })

  it('should fail when consent is declined for paid providers', async () => {
    mockedCreateSummarizer.mockResolvedValue(mockSummarizer)

    const paidCostEstimate = {
      ...mockCostEstimate,
      isPaid: true,
      estimatedCost: 0.01,
    }
    mockedEstimateSummaryCost.mockReturnValue(paidCostEstimate)

    const onConsentPrompt = vi.fn().mockResolvedValue(false)

    const options: PipelineOptions = {
      config: { mode: 'api', provider: 'deepseek' },
      onConsentPrompt,
    }

    await expect(
      Effect.runPromise(
        runSummarizationPipeline(mockResults, mockSearchContext, options),
      ),
    ).rejects.toThrow('User declined summarization')
  })

  it('should skip consent when skipConsent is true', async () => {
    mockedCreateSummarizer.mockResolvedValue(mockSummarizer)

    const paidCostEstimate = {
      ...mockCostEstimate,
      isPaid: true,
      estimatedCost: 0.01,
    }
    mockedEstimateSummaryCost.mockReturnValue(paidCostEstimate)

    const onConsentPrompt = vi.fn()

    const options: PipelineOptions = {
      config: { mode: 'api', provider: 'deepseek' },
      skipConsent: true,
      onConsentPrompt,
    }

    await Effect.runPromise(
      runSummarizationPipeline(mockResults, mockSearchContext, options),
    )

    expect(onConsentPrompt).not.toHaveBeenCalled()
  })

  it('should return complete PipelineResult with all fields', async () => {
    mockedCreateSummarizer.mockResolvedValue(mockSummarizer)
    mockSummarizer.summarize.mockResolvedValue({
      summary: 'Complete summary',
      provider: 'claude',
      mode: 'cli',
      estimatedCost: 0,
      durationMs: 1234,
    })

    const options: PipelineOptions = {
      config: { mode: 'cli', provider: 'claude' },
    }

    const result = await Effect.runPromise(
      runSummarizationPipeline(mockResults, mockSearchContext, options),
    )

    expect(result).toEqual({
      summary: 'Complete summary',
      provider: 'claude',
      mode: 'cli',
      estimatedCost: mockCostEstimate,
      actualCost: 0,
      durationMs: 1234,
      isFree: true,
    })
  })

  it('should handle errors from createSummarizer gracefully', async () => {
    mockedCreateSummarizer.mockRejectedValue(
      new SummarizationError({
        message: 'Provider not found',
        code: 'PROVIDER_NOT_FOUND',
      }),
    )

    const options: PipelineOptions = {
      config: { mode: 'cli', provider: 'claude' },
    }

    await expect(
      Effect.runPromise(
        runSummarizationPipeline(mockResults, mockSearchContext, options),
      ),
    ).rejects.toThrow('Provider not found')
  })

  it('should handle errors from getBestAvailableSummarizer gracefully', async () => {
    mockedGetBestAvailableSummarizer.mockResolvedValue(null)

    await expect(
      Effect.runPromise(
        runSummarizationPipeline(mockResults, mockSearchContext),
      ),
    ).rejects.toThrow('No summarization providers available')
  })

  it('should handle errors from summarize gracefully', async () => {
    mockedCreateSummarizer.mockResolvedValue(mockSummarizer)
    mockSummarizer.summarize.mockRejectedValue(
      new Error('Summarization failed'),
    )

    const options: PipelineOptions = {
      config: { mode: 'cli', provider: 'claude' },
    }

    await expect(
      Effect.runPromise(
        runSummarizationPipeline(mockResults, mockSearchContext, options),
      ),
    ).rejects.toThrow('Summarization failed')
  })

  it('should pass stream option to config', async () => {
    mockedCreateSummarizer.mockResolvedValue(mockSummarizer)

    const options: PipelineOptions = {
      config: { mode: 'cli', provider: 'claude' },
      stream: true,
    }

    await Effect.runPromise(
      runSummarizationPipeline(mockResults, mockSearchContext, options),
    )

    expect(mockedCreateSummarizer).toHaveBeenCalledWith(
      expect.objectContaining({ stream: true }),
    )
  })

  it('should build prompt with provided template', async () => {
    mockedCreateSummarizer.mockResolvedValue(mockSummarizer)

    const options: PipelineOptions = {
      config: { mode: 'cli', provider: 'claude' },
      template: 'concise',
    }

    await Effect.runPromise(
      runSummarizationPipeline(mockResults, mockSearchContext, options),
    )

    expect(mockSummarizer.summarize).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Query: "test query"'),
    )
  })
})

describe('summarizeResults', () => {
  const mockSearchContext: SearchContext = {
    query: 'test query',
    resultCount: 1,
    searchMode: 'semantic',
  }

  const mockResults: SummarizableResult[] = [
    { documentPath: '/docs/test.md', heading: 'Test' },
  ]

  const mockSummarizer = {
    summarize: vi.fn().mockResolvedValue({
      summary: 'Promise summary',
      provider: 'claude',
      mode: 'cli',
      estimatedCost: 0,
      durationMs: 500,
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
  }

  const mockCostEstimate = {
    inputTokens: 50,
    outputTokens: 500,
    estimatedCost: 0,
    provider: 'claude',
    isPaid: false,
    formattedCost: 'FREE (subscription)',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockedEstimateSummaryCost.mockReturnValue(mockCostEstimate)
    mockedGetBestAvailableSummarizer.mockResolvedValue({
      summarizer: mockSummarizer,
      config: { mode: 'cli', provider: 'claude' },
    })
  })

  it('should return a Promise that resolves to PipelineResult', async () => {
    const result = await summarizeResults(mockResults, mockSearchContext)

    expect(result).toEqual({
      summary: 'Promise summary',
      provider: 'claude',
      mode: 'cli',
      estimatedCost: mockCostEstimate,
      actualCost: 0,
      durationMs: 500,
      isFree: true,
    })
  })

  it('should pass options to underlying pipeline', async () => {
    mockedCreateSummarizer.mockResolvedValue(mockSummarizer)

    const options: PipelineOptions = {
      config: { mode: 'cli', provider: 'claude' },
      template: 'detailed',
    }

    await summarizeResults(mockResults, mockSearchContext, options)

    expect(mockedCreateSummarizer).toHaveBeenCalled()
  })

  it('should reject with error when pipeline fails', async () => {
    mockedGetBestAvailableSummarizer.mockResolvedValue(null)

    await expect(
      summarizeResults(mockResults, mockSearchContext),
    ).rejects.toThrow('No summarization providers available')
  })
})
