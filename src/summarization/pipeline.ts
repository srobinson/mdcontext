/**
 * Summary Generation Pipeline
 *
 * Orchestrates the full summarization flow:
 * 1. Format search results for LLM input
 * 2. Estimate cost (for API providers)
 * 3. Get user consent (for paid operations)
 * 4. Generate summary via provider
 * 5. Return formatted output
 */

import { Effect } from 'effect'
import { SummarizationError } from '../errors/index.js'
import type { CostEstimate } from './cost.js'
import { estimateSummaryCost } from './cost.js'
import {
  buildPrompt,
  type PromptTemplate,
  type SearchContext,
} from './prompts.js'
import {
  createSummarizer,
  getBestAvailableSummarizer,
} from './provider-factory.js'
import type { AISummarizationConfig, SummarizationMode } from './types.js'

/**
 * Search result that can be summarized.
 */
export interface SummarizableResult {
  readonly documentPath: string
  readonly heading: string
  readonly content?: string
  readonly score?: number
  readonly similarity?: number
}

/**
 * Options for the summarization pipeline.
 */
export interface PipelineOptions {
  /** AI summarization configuration */
  readonly config?: Partial<AISummarizationConfig>
  /** Prompt template to use */
  readonly template?: PromptTemplate
  /** Enable streaming output */
  readonly stream?: boolean
  /** Callback for streaming chunks */
  readonly onChunk?: (chunk: string) => void
  /** Skip user consent for paid operations */
  readonly skipConsent?: boolean
  /** Callback for consent prompt (returns true to proceed) */
  readonly onConsentPrompt?: (estimate: CostEstimate) => Promise<boolean>
}

/**
 * Result from the summarization pipeline.
 */
export interface PipelineResult {
  /** Generated summary text */
  readonly summary: string
  /** Provider that generated the summary */
  readonly provider: string
  /** Mode used (cli or api) */
  readonly mode: SummarizationMode
  /** Cost estimate (before execution) */
  readonly estimatedCost: CostEstimate
  /** Actual cost (if available) */
  readonly actualCost?: number
  /** Time taken in milliseconds */
  readonly durationMs: number
  /** Was this a free operation? */
  readonly isFree: boolean
}

/**
 * Format search results as text for the LLM.
 */
export const formatResultsForSummary = (
  results: readonly SummarizableResult[],
): string => {
  return results
    .map((r, i) => {
      const lines: string[] = []
      lines.push(`[${i + 1}] ${r.documentPath}`)
      lines.push(`    Heading: ${r.heading}`)
      if (r.score !== undefined) {
        lines.push(`    Score: ${(r.score * 100).toFixed(1)}%`)
      }
      if (r.similarity !== undefined) {
        lines.push(`    Similarity: ${(r.similarity * 100).toFixed(1)}%`)
      }
      if (r.content) {
        // Truncate content to avoid huge inputs
        const truncated =
          r.content.length > 500 ? `${r.content.slice(0, 500)}...` : r.content
        lines.push(`    Content: ${truncated}`)
      }
      return lines.join('\n')
    })
    .join('\n\n')
}

/**
 * Run the summarization pipeline.
 *
 * This is the main entry point for generating summaries from search results.
 */
export const runSummarizationPipeline = (
  results: readonly SummarizableResult[],
  searchContext: SearchContext,
  options: PipelineOptions = {},
): Effect.Effect<PipelineResult, SummarizationError> =>
  Effect.gen(function* () {
    // Get or create summarizer
    const summarizerResult = options.config
      ? yield* Effect.tryPromise({
          try: () => {
            // Build config object conditionally to avoid undefined values
            const config: AISummarizationConfig = {
              mode: options.config?.mode ?? 'cli',
              provider: options.config?.provider ?? 'claude',
              ...(options.config?.model && { model: options.config.model }),
              ...((options.stream ?? options.config?.stream) && {
                stream: true,
              }),
              ...(options.config?.baseURL && {
                baseURL: options.config.baseURL,
              }),
              ...(options.config?.apiKey && { apiKey: options.config.apiKey }),
            }
            return createSummarizer(config)
          },
          catch: (e) =>
            e instanceof SummarizationError
              ? e
              : new SummarizationError({
                  message: `Failed to create summarizer: ${e}`,
                  code: 'PROVIDER_NOT_FOUND',
                }),
        })
      : yield* Effect.tryPromise({
          try: async () => {
            const result = await getBestAvailableSummarizer()
            if (!result) {
              throw new SummarizationError({
                message: 'No summarization providers available',
                code: 'PROVIDER_NOT_AVAILABLE',
              })
            }
            return result.summarizer
          },
          catch: (e) =>
            e instanceof SummarizationError
              ? e
              : new SummarizationError({
                  message: `Failed to find summarizer: ${e}`,
                  code: 'PROVIDER_NOT_FOUND',
                }),
        })

    const mode = options.config?.mode ?? 'cli'
    const provider = options.config?.provider ?? 'claude'

    // Format results for input
    const resultsText = formatResultsForSummary(results)

    // Estimate cost
    const costEstimate = estimateSummaryCost(resultsText, mode, provider)

    // Handle consent for paid operations
    if (costEstimate.isPaid && !options.skipConsent) {
      if (options.onConsentPrompt) {
        const consented = yield* Effect.tryPromise({
          try: () => options.onConsentPrompt!(costEstimate),
          catch: () =>
            new SummarizationError({
              message: 'Consent prompt failed',
              code: 'CLI_EXECUTION_FAILED',
            }),
        })

        if (!consented) {
          return yield* Effect.fail(
            new SummarizationError({
              message: 'User declined summarization',
              code: 'CLI_EXECUTION_FAILED',
            }),
          )
        }
      }
    }

    // Build prompt
    const prompt = buildPrompt(searchContext, options.template)

    // Generate summary
    const summaryResult = yield* Effect.tryPromise({
      try: () => summarizerResult.summarize(resultsText, prompt),
      catch: (e) =>
        e instanceof SummarizationError
          ? e
          : new SummarizationError({
              message: `Summarization failed: ${e}`,
              code: 'CLI_EXECUTION_FAILED',
            }),
    })

    return {
      summary: summaryResult.summary,
      provider: summaryResult.provider,
      mode: summaryResult.mode,
      estimatedCost: costEstimate,
      actualCost: summaryResult.estimatedCost,
      durationMs: summaryResult.durationMs,
      isFree: !costEstimate.isPaid,
    }
  })

/**
 * Quick helper to run summarization with Effect.runPromise.
 */
export const summarizeResults = async (
  results: readonly SummarizableResult[],
  searchContext: SearchContext,
  options: PipelineOptions = {},
): Promise<PipelineResult> => {
  return Effect.runPromise(
    runSummarizationPipeline(results, searchContext, options),
  )
}
