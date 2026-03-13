/**
 * Summarization Provider Factory
 *
 * Creates summarizer instances based on configuration.
 * CLI providers are checked first (free), then API providers (paid).
 */

import { ClaudeCLISummarizer } from './cli-providers/claude.js'
import { getCLIInfo, isCLIInstalled } from './cli-providers/detection.js'
import type {
  AISummarizationConfig,
  APIProviderName,
  CLIProviderName,
  Summarizer,
} from './types.js'
import { SummarizationError } from './types.js'

/**
 * Create a CLI-based summarizer.
 */
const createCLISummarizer = async (
  provider: CLIProviderName,
): Promise<Summarizer> => {
  // Check if CLI is installed
  const isInstalled = await isCLIInstalled(provider)
  if (!isInstalled) {
    const cliInfo = getCLIInfo(provider)
    throw new SummarizationError({
      message: `CLI tool '${cliInfo?.displayName ?? provider}' is not installed`,
      code: 'PROVIDER_NOT_AVAILABLE',
      provider,
    })
  }

  // Return appropriate summarizer based on provider
  switch (provider) {
    case 'claude':
      return new ClaudeCLISummarizer()

    // TODO: Add other CLI providers as needed
    case 'opencode':
    case 'copilot':
    case 'aider':
    case 'cline':
    case 'amp':
      throw new SummarizationError({
        message: `CLI provider '${provider}' is not yet implemented`,
        code: 'PROVIDER_NOT_FOUND',
        provider,
      })

    default:
      throw new SummarizationError({
        message: `Unknown CLI provider: ${provider}`,
        code: 'PROVIDER_NOT_FOUND',
        provider,
      })
  }
}

/**
 * Create an API-based summarizer.
 *
 * Uses Vercel AI SDK for provider abstraction.
 * Requires appropriate API keys to be configured.
 */
const createAPISummarizer = async (
  _provider: APIProviderName,
  _config: AISummarizationConfig,
): Promise<Summarizer> => {
  // TODO: Implement API providers using Vercel AI SDK
  // This will be implemented in a later issue (ALP-220)
  throw new SummarizationError({
    message:
      'API providers are not yet implemented. Use CLI providers for now.',
    code: 'PROVIDER_NOT_FOUND',
  })
}

/**
 * Create a summarizer based on configuration.
 *
 * @param config - Summarization configuration
 * @returns A configured Summarizer instance
 * @throws SummarizationError if provider is not available or configured
 */
/**
 * Type guard to check if a provider is a CLI provider
 */
const isCLIProvider = (provider: string): provider is CLIProviderName => {
  return ['claude', 'copilot', 'cline', 'aider', 'opencode', 'amp'].includes(
    provider,
  )
}

/**
 * Type guard to check if a provider is an API provider
 */
const isAPIProvider = (provider: string): provider is APIProviderName => {
  return ['deepseek', 'anthropic', 'openai', 'gemini', 'qwen'].includes(
    provider,
  )
}

export const createSummarizer = async (
  config: AISummarizationConfig,
): Promise<Summarizer> => {
  if (config.mode === 'cli') {
    if (!isCLIProvider(config.provider)) {
      throw new SummarizationError({
        message: `Invalid CLI provider: ${config.provider}`,
        code: 'PROVIDER_NOT_FOUND',
        provider: config.provider,
      })
    }
    return createCLISummarizer(config.provider)
  }

  if (config.mode === 'api') {
    if (!isAPIProvider(config.provider)) {
      throw new SummarizationError({
        message: `Invalid API provider: ${config.provider}`,
        code: 'PROVIDER_NOT_FOUND',
        provider: config.provider,
      })
    }
    return createAPISummarizer(config.provider, config)
  }

  throw new SummarizationError({
    message: `Unknown summarization mode: ${config.mode}`,
    code: 'PROVIDER_NOT_FOUND',
  })
}

/**
 * Get the best available summarizer.
 *
 * Checks CLI providers first (free), then falls back to API providers.
 * Returns null if no providers are available.
 */
export const getBestAvailableSummarizer = async (
  preferredConfig?: Partial<AISummarizationConfig>,
): Promise<{
  summarizer: Summarizer
  config: AISummarizationConfig
} | null> => {
  // If config specifies a provider, try that first
  if (preferredConfig?.provider && preferredConfig?.mode) {
    try {
      const summarizer = await createSummarizer(
        preferredConfig as AISummarizationConfig,
      )
      return {
        summarizer,
        config: preferredConfig as AISummarizationConfig,
      }
    } catch {
      // Fall through to auto-detection
    }
  }

  // Try Claude CLI first (most common)
  if (await isCLIInstalled('claude')) {
    const config: AISummarizationConfig = {
      mode: 'cli',
      provider: 'claude',
    }
    return {
      summarizer: new ClaudeCLISummarizer(),
      config,
    }
  }

  // TODO: Try other CLI providers
  // TODO: Try API providers with configured keys

  return null
}
