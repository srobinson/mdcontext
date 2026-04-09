/**
 * Provider Error Detection Unit Tests
 *
 * Tests for provider-specific error detection, suggestions, and titles
 * for Ollama, LM Studio, OpenRouter, and generic network errors.
 */

import { describe, expect, it } from 'vitest'
import {
  detectProviderError,
  detectProviderFromError,
  getProviderErrorTitle,
  getProviderSuggestions,
  type ProviderError,
  RECOMMENDED_OLLAMA_MODELS,
} from './provider-errors.js'

// ============================================================================
// detectProviderError Tests
// ============================================================================

describe('detectProviderError', () => {
  // ==========================================================================
  // Ollama Provider
  // ==========================================================================

  describe('Ollama', () => {
    it('detects daemon-not-running from ECONNREFUSED on port 11434', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:11434')
      const result = detectProviderError('ollama', error)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('daemon-not-running')
      expect(result?.provider).toBe('ollama')
      expect(result?.message).toBe('Ollama daemon is not running')
      expect(result?.originalError).toBe(error)
    })

    it('detects daemon-not-running from localhost:11434', () => {
      const error = new Error('Connection refused: localhost:11434')
      const result = detectProviderError('ollama', error)

      expect(result?.type).toBe('daemon-not-running')
      expect(result?.provider).toBe('ollama')
    })

    it('detects model-not-found from "model X not found" message', () => {
      const error = new Error("model 'nomic-embed-text' not found")
      const result = detectProviderError('ollama', error)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('model-not-found')
      expect(result?.provider).toBe('ollama')
      expect(result?.model).toBe('nomic-embed-text')
      expect(result?.message).toBe(
        "Model 'nomic-embed-text' is not installed in Ollama",
      )
    })

    it('detects model-not-found from "model does not exist" message', () => {
      const error = new Error('model "bge-m3" does not exist')
      const result = detectProviderError('ollama', error)

      expect(result?.type).toBe('model-not-found')
      expect(result?.model).toBe('bge-m3')
    })

    it('detects model-not-found and extracts model name with colon pattern', () => {
      const error = new Error('model: mxbai-embed-large not found')
      const result = detectProviderError('ollama', error)

      expect(result?.type).toBe('model-not-found')
      expect(result?.model).toBe('mxbai-embed-large')
    })

    it('detects model-loading from "not ready" message', () => {
      const error = new Error("model 'nomic-embed-text' is not ready yet")
      const result = detectProviderError('ollama', error)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('model-loading')
      expect(result?.provider).toBe('ollama')
      expect(result?.model).toBe('nomic-embed-text')
      expect(result?.message).toBe("Model 'nomic-embed-text' is still loading")
    })

    it('detects model-loading from "loading" message', () => {
      const error = new Error('model is loading, please wait')
      const result = detectProviderError('ollama', error)

      expect(result?.type).toBe('model-loading')
    })

    it('detects model-loading from "initializing" message with quoted model', () => {
      const error = new Error("model 'bge-m3' is initializing")
      const result = detectProviderError('ollama', error)

      expect(result?.type).toBe('model-loading')
      expect(result?.model).toBe('bge-m3')
    })

    it('falls back to network error detection for unrecognized Ollama errors', () => {
      const error = new Error('Request timed out')
      const result = detectProviderError('ollama', error)

      expect(result?.type).toBe('connection-timeout')
      expect(result?.provider).toBe('ollama')
    })
  })

  // ==========================================================================
  // LM Studio Provider
  // ==========================================================================

  describe('LM Studio', () => {
    it('detects gui-not-running from ECONNREFUSED on port 1234', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:1234')
      const result = detectProviderError('lm-studio', error)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('gui-not-running')
      expect(result?.provider).toBe('lm-studio')
      expect(result?.message).toBe(
        'LM Studio is not running or local server is not started',
      )
    })

    it('detects gui-not-running from localhost:1234', () => {
      const error = new Error('Connection refused: localhost:1234')
      const result = detectProviderError('lm-studio', error)

      expect(result?.type).toBe('gui-not-running')
      expect(result?.provider).toBe('lm-studio')
    })

    it('detects model-not-found from "no model" message', () => {
      const error = new Error('no model is currently loaded')
      const result = detectProviderError('lm-studio', error)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('model-not-found')
      expect(result?.provider).toBe('lm-studio')
      expect(result?.message).toBe('No embedding model is loaded in LM Studio')
    })

    it('detects model-not-found from "model not loaded" message', () => {
      const error = new Error('model not loaded')
      const result = detectProviderError('lm-studio', error)

      expect(result?.type).toBe('model-not-found')
      expect(result?.provider).toBe('lm-studio')
    })

    it('detects model-not-found from "select a model" message', () => {
      const error = new Error('please select a model first')
      const result = detectProviderError('lm-studio', error)

      expect(result?.type).toBe('model-not-found')
      expect(result?.provider).toBe('lm-studio')
    })

    it('falls back to network error detection for unrecognized LM Studio errors', () => {
      const error = new Error('ETIMEDOUT')
      const result = detectProviderError('lm-studio', error)

      expect(result?.type).toBe('connection-timeout')
      expect(result?.provider).toBe('lm-studio')
    })
  })

  // ==========================================================================
  // OpenRouter Provider
  // ==========================================================================

  describe('OpenRouter', () => {
    it('detects invalid-api-key from 401 status', () => {
      const error = new Error('Request failed with status 401')
      const result = detectProviderError('openrouter', error)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('invalid-api-key')
      expect(result?.provider).toBe('openrouter')
      expect(result?.message).toBe('Invalid or missing OpenRouter API key')
    })

    it('detects invalid-api-key from "unauthorized" message', () => {
      const error = new Error('Unauthorized access')
      const result = detectProviderError('openrouter', error)

      expect(result?.type).toBe('invalid-api-key')
      expect(result?.provider).toBe('openrouter')
    })

    it('detects invalid-api-key from "invalid api key" message', () => {
      const error = new Error('invalid api key provided')
      const result = detectProviderError('openrouter', error)

      expect(result?.type).toBe('invalid-api-key')
    })

    it('detects invalid-api-key from "invalid_api_key" message', () => {
      const error = new Error('error: invalid_api_key')
      const result = detectProviderError('openrouter', error)

      expect(result?.type).toBe('invalid-api-key')
    })

    it('detects rate-limited from 429 status', () => {
      const error = new Error('Request failed with status 429')
      const result = detectProviderError('openrouter', error)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('rate-limited')
      expect(result?.provider).toBe('openrouter')
      expect(result?.message).toBe('OpenRouter rate limit reached')
    })

    it('detects rate-limited from "rate limit" message', () => {
      const error = new Error('rate limit exceeded')
      const result = detectProviderError('openrouter', error)

      expect(result?.type).toBe('rate-limited')
      expect(result?.provider).toBe('openrouter')
    })

    it('detects quota-exceeded from "quota" message', () => {
      const error = new Error('your quota has been exceeded')
      const result = detectProviderError('openrouter', error)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('quota-exceeded')
      expect(result?.provider).toBe('openrouter')
      expect(result?.message).toBe('OpenRouter quota exceeded')
    })

    it('detects quota-exceeded from "insufficient" message', () => {
      const error = new Error('insufficient credits')
      const result = detectProviderError('openrouter', error)

      expect(result?.type).toBe('quota-exceeded')
      expect(result?.provider).toBe('openrouter')
    })

    it('detects model-unavailable from "model not available" message', () => {
      const error = new Error("model 'gpt-4-turbo' is not available")
      const result = detectProviderError('openrouter', error)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('model-unavailable')
      expect(result?.provider).toBe('openrouter')
      expect(result?.model).toBe('gpt-4-turbo')
      expect(result?.message).toBe(
        "Model 'gpt-4-turbo' is not available via OpenRouter",
      )
    })

    it('detects model-unavailable from "model not found" message', () => {
      const error = new Error('model not found in available models')
      const result = detectProviderError('openrouter', error)

      expect(result?.type).toBe('model-unavailable')
      expect(result?.provider).toBe('openrouter')
    })

    it('detects model-unavailable from "model not supported" message', () => {
      const error = new Error('this model is not supported')
      const result = detectProviderError('openrouter', error)

      expect(result?.type).toBe('model-unavailable')
    })

    it('detects model-unavailable with model name extraction from quotes', () => {
      const error = new Error("model 'claude-3-opus' not available")
      const result = detectProviderError('openrouter', error)

      expect(result?.type).toBe('model-unavailable')
      expect(result?.model).toBe('claude-3-opus')
      expect(result?.message).toBe(
        "Model 'claude-3-opus' is not available via OpenRouter",
      )
    })

    it('falls back to network error detection for unrecognized OpenRouter errors', () => {
      const error = new Error('ENOTFOUND openrouter.ai')
      const result = detectProviderError('openrouter', error)

      expect(result?.type).toBe('network-error')
      expect(result?.provider).toBe('openrouter')
    })
  })

  // ==========================================================================
  // Generic Network Errors
  // ==========================================================================

  describe('Generic Network Errors', () => {
    it('detects connection-timeout from "timeout" message', () => {
      const error = new Error('Connection timeout')
      const result = detectProviderError('openai', error)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('connection-timeout')
      expect(result?.provider).toBe('openai')
      expect(result?.message).toBe('Connection to openai timed out')
    })

    it('detects connection-timeout from ETIMEDOUT', () => {
      const error = new Error('connect ETIMEDOUT')
      const result = detectProviderError('openai', error)

      expect(result?.type).toBe('connection-timeout')
    })

    it('detects connection-timeout from "timed out" message', () => {
      const error = new Error('request timed out')
      const result = detectProviderError('openai', error)

      expect(result?.type).toBe('connection-timeout')
    })

    it('detects network-error from ENOTFOUND', () => {
      const error = new Error('getaddrinfo ENOTFOUND api.openai.com')
      const result = detectProviderError('openai', error)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('network-error')
      expect(result?.provider).toBe('openai')
      expect(result?.message).toBe('Network error connecting to openai')
    })

    it('detects network-error from "dns" message', () => {
      const error = new Error('DNS resolution failed')
      const result = detectProviderError('openai', error)

      expect(result?.type).toBe('network-error')
    })

    it('detects network-error from "network" message', () => {
      const error = new Error('Network unreachable')
      const result = detectProviderError('openai', error)

      expect(result?.type).toBe('network-error')
    })

    it('detects connection-refused for generic provider', () => {
      const error = new Error('ECONNREFUSED 192.168.1.100:8080')
      const result = detectProviderError('openai', error)

      expect(result?.type).toBe('connection-refused')
      expect(result?.message).toBe('Cannot connect to openai server')
    })

    it('returns null for unrecognized errors', () => {
      const error = new Error('Some random error that does not match patterns')
      const result = detectProviderError('openai', error)

      expect(result).toBeNull()
    })

    it('returns null for non-Error types', () => {
      const result = detectProviderError('openai', 'string error')
      expect(result).toBeNull()

      const result2 = detectProviderError('openai', {
        message: 'object error',
      })
      expect(result2).toBeNull()

      const result3 = detectProviderError('openai', null)
      expect(result3).toBeNull()
    })
  })

  // ==========================================================================
  // OpenAI Provider (fallback to network errors)
  // ==========================================================================

  describe('OpenAI', () => {
    it('falls through to network error detection', () => {
      const error = new Error('Connection timeout')
      const result = detectProviderError('openai', error)

      expect(result?.type).toBe('connection-timeout')
      expect(result?.provider).toBe('openai')
    })

    it('returns null for unrecognized errors', () => {
      const error = new Error('Unknown OpenAI SDK error')
      const result = detectProviderError('openai', error)

      expect(result).toBeNull()
    })
  })

  // ==========================================================================
  // Model Name Extraction
  // ==========================================================================

  describe('Model Name Extraction', () => {
    it('extracts model name from single-quoted pattern', () => {
      const error = new Error("model 'test-model' not found")
      const result = detectProviderError('ollama', error)

      expect(result?.model).toBe('test-model')
    })

    it('extracts model name from double-quoted pattern', () => {
      const error = new Error('model "another-model" does not exist')
      const result = detectProviderError('ollama', error)

      expect(result?.model).toBe('another-model')
    })

    it('extracts model name from colon pattern', () => {
      const error = new Error('model: some-model not found')
      const result = detectProviderError('ollama', error)

      expect(result?.model).toBe('some-model')
    })

    it('extracts model name from space pattern', () => {
      const error = new Error('model my-model does not exist')
      const result = detectProviderError('ollama', error)

      expect(result?.model).toBe('my-model')
    })
  })
})

// ============================================================================
// detectProviderFromError Tests
// ============================================================================

describe('detectProviderFromError', () => {
  it('detects Ollama from port 11434 in error', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:11434')
    const result = detectProviderFromError(error)

    expect(result).toBe('ollama')
  })

  it('detects LM Studio from port 1234 in error', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:1234')
    const result = detectProviderFromError(error)

    expect(result).toBe('lm-studio')
  })

  it('returns undefined for errors without recognized port', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:8080')
    const result = detectProviderFromError(error)

    expect(result).toBeUndefined()
  })

  it('returns undefined for non-Error types', () => {
    expect(detectProviderFromError('string error')).toBeUndefined()
    expect(detectProviderFromError({ message: 'object' })).toBeUndefined()
    expect(detectProviderFromError(null)).toBeUndefined()
  })
})

// ============================================================================
// getProviderSuggestions Tests
// ============================================================================

describe('getProviderSuggestions', () => {
  describe('Ollama suggestions', () => {
    it('returns correct suggestions for daemon-not-running', () => {
      const error: ProviderError = {
        type: 'daemon-not-running',
        provider: 'ollama',
        message: 'Ollama daemon is not running',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain('Start the Ollama daemon: ollama serve')
      expect(suggestions).toContain(
        'Install Ollama: https://ollama.com/download',
      )
    })

    it('returns model-specific suggestions for model-not-found with model name', () => {
      const error: ProviderError = {
        type: 'model-not-found',
        provider: 'ollama',
        message: "Model 'nomic-embed-text' is not installed",
        model: 'nomic-embed-text',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain(
        'Download the model: ollama pull nomic-embed-text',
      )
      expect(suggestions).toContain('Recommended embedding models:')
    })

    it('returns generic download suggestion when model name not available', () => {
      const error: ProviderError = {
        type: 'model-not-found',
        provider: 'ollama',
        message: 'Model not installed',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain('Download an embedding model')
    })

    it('includes recommended models in suggestions', () => {
      const error: ProviderError = {
        type: 'model-not-found',
        provider: 'ollama',
        message: 'Model not installed',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions.some((s) => s.includes('nomic-embed-text'))).toBe(true)
      expect(suggestions.some((s) => s.includes('mxbai-embed-large'))).toBe(
        true,
      )
      expect(suggestions.some((s) => s.includes('bge-m3'))).toBe(true)
    })

    it('returns model-specific suggestions for model-loading with model name', () => {
      const error: ProviderError = {
        type: 'model-loading',
        provider: 'ollama',
        message: "Model 'nomic-embed-text' is loading",
        model: 'nomic-embed-text',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain('Wait for the model to finish loading')
      expect(suggestions).toContain(
        'Or pre-load it: ollama run nomic-embed-text',
      )
    })

    it('returns generic suggestions for model-loading without model name', () => {
      const error: ProviderError = {
        type: 'model-loading',
        provider: 'ollama',
        message: 'Model is loading',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain('Wait for the model to finish loading')
      expect(suggestions).toContain(
        'First request may be slow while model loads',
      )
    })

    it('returns Ollama-specific suggestions for connection-refused', () => {
      const error: ProviderError = {
        type: 'connection-refused',
        provider: 'ollama',
        message: 'Cannot connect',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain('Start the Ollama daemon: ollama serve')
    })
  })

  describe('LM Studio suggestions', () => {
    it('returns correct suggestions for gui-not-running', () => {
      const error: ProviderError = {
        type: 'gui-not-running',
        provider: 'lm-studio',
        message: 'LM Studio is not running',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain('Open LM Studio application')
      expect(suggestions).toContain(
        'Go to Developer tab and start the local server',
      )
      expect(suggestions).toContain('Ensure an embedding model is loaded')
      expect(suggestions).toContain(
        'Note: LM Studio requires GUI - consider Ollama for automation',
      )
    })

    it('returns correct suggestions for model-not-found', () => {
      const error: ProviderError = {
        type: 'model-not-found',
        provider: 'lm-studio',
        message: 'No model loaded',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain('Load an embedding model in LM Studio')
      expect(suggestions).toContain(
        'Go to Models tab and download an embedding model',
      )
      expect(suggestions).toContain('Then load it in the Home tab')
    })

    it('returns LM Studio-specific suggestions for connection-refused', () => {
      const error: ProviderError = {
        type: 'connection-refused',
        provider: 'lm-studio',
        message: 'Cannot connect',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain('Open LM Studio and start the local server')
    })
  })

  describe('OpenRouter suggestions', () => {
    it('returns correct suggestions for invalid-api-key', () => {
      const error: ProviderError = {
        type: 'invalid-api-key',
        provider: 'openrouter',
        message: 'Invalid API key',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain(
        'Get an API key: https://openrouter.ai/keys',
      )
      expect(suggestions).toContain(
        'Set the key: export OPENROUTER_API_KEY=sk-or-...',
      )
      expect(suggestions.join('|')).not.toContain('OPENAI_API_KEY')
      expect(suggestions).toContain('Note: OpenRouter keys start with sk-or-')
    })

    it('returns correct suggestions for rate-limited', () => {
      const error: ProviderError = {
        type: 'rate-limited',
        provider: 'openrouter',
        message: 'Rate limit exceeded',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain('Wait a moment and try again')
      expect(suggestions).toContain(
        'OpenRouter shares rate limits across all users',
      )
      expect(suggestions).toContain(
        'Consider using Ollama for unlimited local inference',
      )
      expect(suggestions).toContain(
        'Or use OpenAI directly for higher rate limits',
      )
    })

    it('returns correct suggestions for quota-exceeded', () => {
      const error: ProviderError = {
        type: 'quota-exceeded',
        provider: 'openrouter',
        message: 'Quota exceeded',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain(
        'Check your OpenRouter balance: https://openrouter.ai/credits',
      )
      expect(suggestions).toContain('Add credits to continue using OpenRouter')
      expect(suggestions).toContain('Or switch to a free provider like Ollama')
    })

    it('returns correct suggestions for model-unavailable', () => {
      const error: ProviderError = {
        type: 'model-unavailable',
        provider: 'openrouter',
        message: 'Model not available',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain(
        'Check available models: https://openrouter.ai/models',
      )
      expect(suggestions).toContain(
        'Try: text-embedding-3-small or text-embedding-3-large',
      )
    })

    it('returns correct suggestions for model-not-found on OpenRouter', () => {
      const error: ProviderError = {
        type: 'model-not-found',
        provider: 'openrouter',
        message: 'Model not found',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain(
        'Check available models: https://openrouter.ai/models',
      )
      expect(suggestions).toContain(
        'Common embedding models: text-embedding-3-small, text-embedding-3-large',
      )
    })
  })

  describe('Generic error suggestions', () => {
    it('returns correct suggestions for connection-timeout', () => {
      const error: ProviderError = {
        type: 'connection-timeout',
        provider: 'openai',
        message: 'Connection timed out',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain('Check your network connection')
      expect(suggestions).toContain(
        'The server may be overloaded, try again later',
      )
      expect(suggestions).toContain('Consider increasing timeout in config')
    })

    it('returns correct suggestions for network-error', () => {
      const error: ProviderError = {
        type: 'network-error',
        provider: 'openai',
        message: 'Network error',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain('Check your internet connection')
      expect(suggestions).toContain('Check if the server is reachable')
      expect(suggestions).toContain('Try again later')
    })

    it('returns generic suggestions for connection-refused on unknown provider', () => {
      const error: ProviderError = {
        type: 'connection-refused',
        provider: 'openai',
        message: 'Cannot connect',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain('Check that the server is running')
    })

    it('returns generic suggestions for unknown error type', () => {
      const error: ProviderError = {
        type: 'unknown',
        provider: 'openai',
        message: 'Unknown error',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain('Check the error details above')
    })

    it('returns generic suggestion for model-not-found on unknown provider', () => {
      const error: ProviderError = {
        type: 'model-not-found',
        provider: 'openai',
        message: 'Model not found',
        originalError: new Error(),
      }
      const suggestions = getProviderSuggestions(error)

      expect(suggestions).toContain('Check that the model name is correct')
    })
  })
})

// ============================================================================
// getProviderErrorTitle Tests
// ============================================================================

describe('getProviderErrorTitle', () => {
  it('returns correct title for daemon-not-running', () => {
    const error: ProviderError = {
      type: 'daemon-not-running',
      provider: 'ollama',
      message: 'Test',
      originalError: new Error(),
    }
    expect(getProviderErrorTitle(error)).toBe('Ollama is not running')
  })

  it('returns correct title for gui-not-running', () => {
    const error: ProviderError = {
      type: 'gui-not-running',
      provider: 'lm-studio',
      message: 'Test',
      originalError: new Error(),
    }
    expect(getProviderErrorTitle(error)).toBe('LM Studio is not running')
  })

  it('returns correct title for model-not-found with model name', () => {
    const error: ProviderError = {
      type: 'model-not-found',
      provider: 'ollama',
      message: 'Test',
      model: 'nomic-embed-text',
      originalError: new Error(),
    }
    expect(getProviderErrorTitle(error)).toBe(
      "Model 'nomic-embed-text' not found",
    )
  })

  it('returns correct title for model-not-found without model name', () => {
    const error: ProviderError = {
      type: 'model-not-found',
      provider: 'ollama',
      message: 'Test',
      originalError: new Error(),
    }
    expect(getProviderErrorTitle(error)).toBe('Model not found')
  })

  it('returns correct title for model-loading with model name', () => {
    const error: ProviderError = {
      type: 'model-loading',
      provider: 'ollama',
      message: 'Test',
      model: 'bge-m3',
      originalError: new Error(),
    }
    expect(getProviderErrorTitle(error)).toBe("Model 'bge-m3' is still loading")
  })

  it('returns correct title for model-loading without model name', () => {
    const error: ProviderError = {
      type: 'model-loading',
      provider: 'ollama',
      message: 'Test',
      originalError: new Error(),
    }
    expect(getProviderErrorTitle(error)).toBe('Model is still loading')
  })

  it('returns correct title for invalid-api-key', () => {
    const error: ProviderError = {
      type: 'invalid-api-key',
      provider: 'openrouter',
      message: 'Test',
      originalError: new Error(),
    }
    expect(getProviderErrorTitle(error)).toBe('Invalid API key')
  })

  it('returns correct title for rate-limited', () => {
    const error: ProviderError = {
      type: 'rate-limited',
      provider: 'openrouter',
      message: 'Test',
      originalError: new Error(),
    }
    expect(getProviderErrorTitle(error)).toBe('Rate limit exceeded')
  })

  it('returns correct title for quota-exceeded', () => {
    const error: ProviderError = {
      type: 'quota-exceeded',
      provider: 'openrouter',
      message: 'Test',
      originalError: new Error(),
    }
    expect(getProviderErrorTitle(error)).toBe('Quota exceeded')
  })

  it('returns correct title for model-unavailable', () => {
    const error: ProviderError = {
      type: 'model-unavailable',
      provider: 'openrouter',
      message: 'Test',
      originalError: new Error(),
    }
    expect(getProviderErrorTitle(error)).toBe('Model not available')
  })

  it('returns correct title for connection-refused with provider', () => {
    const error: ProviderError = {
      type: 'connection-refused',
      provider: 'ollama',
      message: 'Test',
      originalError: new Error(),
    }
    expect(getProviderErrorTitle(error)).toBe('Cannot connect to ollama')
  })

  it('returns correct title for connection-timeout with provider', () => {
    const error: ProviderError = {
      type: 'connection-timeout',
      provider: 'openai',
      message: 'Test',
      originalError: new Error(),
    }
    expect(getProviderErrorTitle(error)).toBe('Connection to openai timed out')
  })

  it('returns correct title for network-error', () => {
    const error: ProviderError = {
      type: 'network-error',
      provider: 'openai',
      message: 'Test',
      originalError: new Error(),
    }
    expect(getProviderErrorTitle(error)).toBe('Network error')
  })

  it('returns correct title for unknown error type', () => {
    const error: ProviderError = {
      type: 'unknown',
      provider: 'openai',
      message: 'Test',
      originalError: new Error(),
    }
    expect(getProviderErrorTitle(error)).toBe('Embedding error')
  })
})

// ============================================================================
// RECOMMENDED_OLLAMA_MODELS Tests
// ============================================================================

describe('RECOMMENDED_OLLAMA_MODELS', () => {
  it('contains the expected recommended models', () => {
    expect(RECOMMENDED_OLLAMA_MODELS).toHaveLength(3)

    const names = RECOMMENDED_OLLAMA_MODELS.map((m) => m.name)
    expect(names).toContain('nomic-embed-text')
    expect(names).toContain('mxbai-embed-large')
    expect(names).toContain('bge-m3')
  })

  it('has correct dimensions for nomic-embed-text', () => {
    const model = RECOMMENDED_OLLAMA_MODELS.find(
      (m) => m.name === 'nomic-embed-text',
    )
    expect(model?.dims).toBe(768)
    expect(model?.note).toBe('recommended, fast')
  })

  it('has correct dimensions for mxbai-embed-large', () => {
    const model = RECOMMENDED_OLLAMA_MODELS.find(
      (m) => m.name === 'mxbai-embed-large',
    )
    expect(model?.dims).toBe(1024)
    expect(model?.note).toBe('higher quality')
  })

  it('has correct dimensions for bge-m3', () => {
    const model = RECOMMENDED_OLLAMA_MODELS.find((m) => m.name === 'bge-m3')
    expect(model?.dims).toBe(1024)
    expect(model?.note).toBe('multilingual')
  })
})
