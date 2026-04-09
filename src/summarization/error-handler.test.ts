/**
 * Tests for Error Handler Module
 */

import { describe, expect, it } from 'vitest'
import { SummarizationError } from '../errors/index.js'
import {
  formatSummarizationError,
  isRecoverableError,
} from './error-handler.js'

describe('formatSummarizationError', () => {
  describe('SummarizationError handling', () => {
    it('should format PROVIDER_NOT_AVAILABLE with install URL', () => {
      const error = new SummarizationError({
        message: 'Claude not installed',
        code: 'PROVIDER_NOT_AVAILABLE',
        provider: 'claude',
      })
      const message = formatSummarizationError(error)

      expect(message).toContain('not available')
      expect(message).toContain('https://claude.ai/download')
    })

    it('should format NO_API_KEY with env var hint', () => {
      const error = new SummarizationError({
        message: 'API key missing',
        code: 'NO_API_KEY',
        provider: 'deepseek',
      })
      const message = formatSummarizationError(error)

      expect(message).toContain('API key')
      expect(message).toContain('DEEPSEEK_API_KEY')
    })

    it('should format RATE_LIMITED with CLI suggestion', () => {
      const error = new SummarizationError({
        message: 'Rate limit hit',
        code: 'RATE_LIMITED',
        provider: 'openai',
      })
      const message = formatSummarizationError(error)

      expect(message).toContain('Rate limit')
      expect(message).toContain('CLI provider')
    })

    it('should format CLI_EXECUTION_FAILED with details', () => {
      const error = new SummarizationError({
        message: 'Process exited with code 1',
        code: 'CLI_EXECUTION_FAILED',
        provider: 'claude',
      })
      const message = formatSummarizationError(error)

      expect(message).toContain('CLI error')
      expect(message).toContain('Process exited with code 1')
    })

    it('should handle TIMEOUT errors', () => {
      const error = new SummarizationError({
        message: 'Something went wrong',
        code: 'TIMEOUT',
        provider: 'claude',
      })
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
    const error = new SummarizationError({
      message: 'Request failed',
      code: 'API_REQUEST_FAILED',
      provider: 'deepseek',
    })
    expect(isRecoverableError(error)).toBe(true)
  })

  it('should return true for TIMEOUT', () => {
    const error = new SummarizationError({
      message: 'Timed out',
      code: 'TIMEOUT',
      provider: 'claude',
    })
    expect(isRecoverableError(error)).toBe(true)
  })

  it('should return false for RATE_LIMITED', () => {
    const error = new SummarizationError({
      message: 'Rate limited',
      code: 'RATE_LIMITED',
      provider: 'openai',
    })
    expect(isRecoverableError(error)).toBe(false)
  })

  it('should return false for NO_API_KEY', () => {
    const error = new SummarizationError({
      message: 'No key',
      code: 'NO_API_KEY',
      provider: 'anthropic',
    })
    expect(isRecoverableError(error)).toBe(false)
  })

  it('should return false for non-SummarizationError', () => {
    expect(isRecoverableError(new Error('Generic'))).toBe(false)
  })
})
