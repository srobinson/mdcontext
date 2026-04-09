/**
 * Error Handler for Summarization
 *
 * Provides user-friendly error messages and graceful degradation.
 * Ensures summarization failures don't crash the CLI.
 */

import {
  SummarizationError,
  type SummarizationErrorCode,
} from '../errors/index.js'

/**
 * Error message templates for different error codes.
 */
const ERROR_MESSAGES: Record<SummarizationErrorCode, string> = {
  PROVIDER_NOT_FOUND: 'Summarization provider not found.',
  PROVIDER_NOT_AVAILABLE:
    'Summarization provider is not available. Check installation.',
  CLI_EXECUTION_FAILED: 'CLI execution failed.',
  API_REQUEST_FAILED: 'API request failed.',
  RATE_LIMITED: 'Rate limit exceeded. Please try again later.',
  INVALID_RESPONSE: 'Received invalid response from provider.',
  TIMEOUT: 'Request timed out. Try again or reduce result count.',
  NO_API_KEY: 'API key not configured.',
}

/**
 * Installation URLs for CLI providers.
 */
const CLI_INSTALL_URLS: Record<string, string> = {
  claude: 'https://claude.ai/download',
  copilot: 'https://github.com/features/copilot',
  opencode: 'https://github.com/opencode-ai/opencode',
  aider: 'https://aider.chat',
  cline: 'https://github.com/cline/cline',
}

/**
 * Environment variable names for API keys.
 */
const API_KEY_ENV_VARS: Record<string, string> = {
  deepseek: 'DEEPSEEK_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GOOGLE_API_KEY',
  qwen: 'QWEN_API_KEY',
}

/**
 * Format a SummarizationError into a user-friendly message.
 */
export const formatSummarizationError = (error: unknown): string => {
  if (error instanceof SummarizationError) {
    const baseMessage = ERROR_MESSAGES[error.code] ?? error.message

    // Add provider-specific hints
    if (error.code === 'PROVIDER_NOT_AVAILABLE' && error.provider) {
      const installUrl = CLI_INSTALL_URLS[error.provider]
      if (installUrl) {
        return `${baseMessage}\n   Install ${error.provider}: ${installUrl}`
      }
    }

    if (error.code === 'NO_API_KEY' && error.provider) {
      const envVar = API_KEY_ENV_VARS[error.provider]
      if (envVar) {
        return `${baseMessage}\n   Set environment variable: ${envVar}`
      }
    }

    if (error.code === 'RATE_LIMITED') {
      return `${baseMessage}\n   Try using a CLI provider (free with subscription) instead.`
    }

    if (error.code === 'CLI_EXECUTION_FAILED' && error.message) {
      // Include the actual error message for CLI failures
      return `CLI error: ${error.message}`
    }

    return baseMessage
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unknown error occurred during summarization.'
}

/**
 * Check if an error is recoverable (can retry).
 */
export const isRecoverableError = (error: unknown): boolean => {
  if (error instanceof SummarizationError) {
    // These errors might succeed on retry
    return ['API_REQUEST_FAILED', 'TIMEOUT'].includes(error.code)
  }
  return false
}

/**
 * Create a console-friendly error display.
 */
export const displaySummarizationError = (error: unknown): void => {
  const message = formatSummarizationError(error)

  console.error('')
  console.error('Summarization failed:')
  console.error(`   ${message}`)
  console.error('')
  console.error('   Showing search results without summary.')
  console.error('')
}
