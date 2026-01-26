/**
 * Tests for Error Handler Module
 */

import { describe, expect, it } from 'vitest'
import {
  formatSummarizationError,
  isRecoverableError,
} from './error-handler.js'
import { SummarizationError } from './types.js'

describe('formatSummarizationError', () => {
  describe('SummarizationError handling', () => {
    it('should format PROVIDER_NOT_AVAILABLE with install URL', () => {
      const error = new SummarizationError(
        'Claude not installed',
        'PROVIDER_NOT_AVAILABLE',
        'claude',
      )
      const message = formatSummarizationError(error)

      expect(message).toContain('not available')
      expect(message).toContain('https://claude.ai/download')
    })

    it('should format NO_API_KEY with env var hint', () => {
      const error = new SummarizationError(
        'API key missing',
        'NO_API_KEY',
        'deepseek',
      )
      const message = formatSummarizationError(error)

      expect(message).toContain('API key')
      expect(message).toContain('DEEPSEEK_API_KEY')
    })

    it('should format RATE_LIMITED with CLI suggestion', () => {
      const error = new SummarizationError(
        'Rate limit hit',
        'RATE_LIMITED',
        'openai',
      )
      const message = formatSummarizationError(error)

      expect(message).toContain('Rate limit')
      expect(message).toContain('CLI provider')
    })

    it('should format CLI_EXECUTION_FAILED with details', () => {
      const error = new SummarizationError(
        'Process exited with code 1',
        'CLI_EXECUTION_FAILED',
        'claude',
      )
      const message = formatSummarizationError(error)

      expect(message).toContain('CLI error')
      expect(message).toContain('Process exited with code 1')
    })

    it('should handle TIMEOUT errors', () => {
      const error = new SummarizationError(
        'Something went wrong',
        'TIMEOUT',
        'claude',
      )
      const message = formatSummarizationError(error)

      expect(message).toContain('timed out')
    })
  })

  describe('generic Error handling', () => {
    it('should extract message from regular Error', () => {
      const error = new Error('Network failed')
      const message = formatSummarizationError(error)

      expect(message).toBe('Network failed')
    })
  })

  describe('unknown error handling', () => {
    it('should handle null/undefined', () => {
      expect(formatSummarizationError(null)).toBe(
        'An unknown error occurred during summarization.',
      )
      expect(formatSummarizationError(undefined)).toBe(
        'An unknown error occurred during summarization.',
      )
    })
  })
})

describe('isRecoverableError', () => {
  it('should return true for API_REQUEST_FAILED', () => {
    const error = new SummarizationError(
      'Request failed',
      'API_REQUEST_FAILED',
      'deepseek',
    )
    expect(isRecoverableError(error)).toBe(true)
  })

  it('should return true for TIMEOUT', () => {
    const error = new SummarizationError('Timed out', 'TIMEOUT', 'claude')
    expect(isRecoverableError(error)).toBe(true)
  })

  it('should return false for RATE_LIMITED', () => {
    const error = new SummarizationError(
      'Rate limited',
      'RATE_LIMITED',
      'openai',
    )
    expect(isRecoverableError(error)).toBe(false)
  })

  it('should return false for NO_API_KEY', () => {
    const error = new SummarizationError('No key', 'NO_API_KEY', 'anthropic')
    expect(isRecoverableError(error)).toBe(false)
  })

  it('should return false for non-SummarizationError', () => {
    expect(isRecoverableError(new Error('Generic'))).toBe(false)
  })
})
