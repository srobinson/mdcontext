/**
 * Summarization Module
 *
 * AI-powered summarization of search results using CLI tools (free)
 * or API providers (pay-per-use via Vercel AI SDK).
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createSummarizer, buildPrompt } from './summarization/index.js'
 *
 * // Create a summarizer from config
 * const summarizer = await createSummarizer({
 *   mode: 'cli',
 *   provider: 'claude',
 * })
 *
 * // Build prompt with context
 * const prompt = buildPrompt({
 *   query: 'authentication',
 *   resultCount: 10,
 *   searchMode: 'hybrid',
 * })
 *
 * // Generate summary
 * const result = await summarizer.summarize(searchResultsText, prompt)
 * console.log(result.summary)
 * ```
 *
 * ## Architecture
 *
 * - **CLI Providers**: Free with subscription (Claude Code, Copilot, etc.)
 * - **API Providers**: Pay-per-use via Vercel AI SDK (DeepSeek, OpenAI, etc.)
 * - **Detection**: Auto-detect installed CLI tools
 * - **Factory**: Create providers from config
 */

// CLI providers
export {
  ClaudeCLISummarizer,
  detectInstalledCLIs,
  getCLIInfo,
  isCLIInstalled,
  KNOWN_CLIS,
} from './cli-providers/index.js'
// Cost estimation
export type { CostEstimate } from './cost.js'
export {
  API_PRICING,
  estimateSummaryCost,
  estimateTokens,
  formatCostDisplay,
} from './cost.js'
// Error handling
export {
  displaySummarizationError,
  formatSummarizationError,
  isRecoverableError,
} from './error-handler.js'
// Pipeline
export type {
  PipelineOptions,
  PipelineResult,
  SummarizableResult,
} from './pipeline.js'
export {
  formatResultsForSummary,
  runSummarizationPipeline,
  summarizeResults,
} from './pipeline.js'
// Prompts
export type { PromptTemplate, SearchContext } from './prompts.js'
export {
  ACTIONABLE_PROMPT,
  buildPrompt,
  CONCISE_PROMPT,
  DEFAULT_PROMPT,
  DETAILED_PROMPT,
  getPromptTemplate,
  TECHNICAL_PROMPT,
} from './prompts.js'
// Provider factory
export {
  createSummarizer,
  getBestAvailableSummarizer,
} from './provider-factory.js'
// Core types
export type {
  AISummarizationConfig,
  APIProviderName,
  APIProviderPricing,
  CLIInfo,
  CLIProviderName,
  StreamingSummarizer,
  StreamOptions,
  SummarizationMode,
  Summarizer,
  SummarizerFactory,
  SummaryResult,
} from './types.js'
