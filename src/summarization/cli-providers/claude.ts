/**
 * Claude CLI Summarizer
 *
 * Uses Claude Code CLI for AI summarization.
 * FREE for users with Claude Code subscriptions.
 *
 * SECURITY: Uses spawn() with argument arrays - NEVER exec() with string interpolation.
 */

import { spawn } from 'node:child_process'
import { SummarizationError } from '../../errors/index.js'
import type {
  StreamingSummarizer,
  StreamOptions,
  SummaryResult,
} from '../types.js'

/**
 * Claude CLI provider for summarization.
 *
 * Uses the `claude` CLI tool in non-interactive mode with text output.
 * Requires Claude Code installation and authentication.
 *
 * @security Uses spawn() with argument arrays to prevent shell injection.
 *           User input is passed as array elements, never interpolated.
 *
 * @cost Free (uses existing Claude subscription)
 *
 * @example
 * ```typescript
 * const summarizer = new ClaudeCLISummarizer()
 *
 * // Check availability
 * if (await summarizer.isAvailable()) {
 *   const result = await summarizer.summarize(searchResults, prompt)
 *   console.log(result.summary)
 *   // result.estimatedCost is always 0 (free)
 * }
 *
 * // Streaming output
 * await summarizer.summarizeStream(searchResults, prompt, {
 *   onChunk: (chunk) => process.stdout.write(chunk),
 *   onComplete: (result) => console.log(`Done in ${result.durationMs}ms`),
 * })
 * ```
 */
export class ClaudeCLISummarizer implements StreamingSummarizer {
  private readonly command = 'claude'

  async summarize(input: string, prompt: string): Promise<SummaryResult> {
    const startTime = Date.now()
    const fullPrompt = `${prompt}\n\n${input}`

    return new Promise((resolve, reject) => {
      // SECURITY: spawn() with argument array - safe from shell injection
      const proc = spawn(
        this.command,
        ['-p', fullPrompt, '--output-format', 'text'],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      )

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      proc.on('close', (code: number | null) => {
        const durationMs = Date.now() - startTime

        if (code !== 0) {
          reject(
            new SummarizationError({
              message: `Claude CLI exited with code ${code}: ${stderr}`,
              code: 'CLI_EXECUTION_FAILED',
              provider: 'claude',
            }),
          )
          return
        }

        resolve({
          summary: stdout.trim(),
          provider: 'claude',
          mode: 'cli',
          estimatedCost: 0,
          durationMs,
        })
      })

      proc.on('error', (error: Error) => {
        reject(
          new SummarizationError({
            message: `Failed to spawn Claude CLI: ${error.message}`,
            code: 'CLI_EXECUTION_FAILED',
            provider: 'claude',
            cause: error,
          }),
        )
      })
    })
  }

  async summarizeStream(
    input: string,
    prompt: string,
    options: StreamOptions,
  ): Promise<void> {
    const startTime = Date.now()
    const fullPrompt = `${prompt}\n\n${input}`

    return new Promise((resolve, reject) => {
      // SECURITY: spawn() with argument array - safe from shell injection
      const proc = spawn(
        this.command,
        ['-p', fullPrompt, '--output-format', 'text'],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      )

      let fullOutput = ''
      let stderr = ''

      proc.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString()
        fullOutput += chunk
        options.onChunk(chunk)
      })

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      proc.on('close', (code: number | null) => {
        const durationMs = Date.now() - startTime

        if (code !== 0) {
          const error = new SummarizationError({
            message: `Claude CLI exited with code ${code}: ${stderr}`,
            code: 'CLI_EXECUTION_FAILED',
            provider: 'claude',
          })
          options.onError?.(error)
          reject(error)
          return
        }

        const result: SummaryResult = {
          summary: fullOutput.trim(),
          provider: 'claude',
          mode: 'cli',
          estimatedCost: 0,
          durationMs,
        }

        options.onComplete?.(result)
        resolve()
      })

      proc.on('error', (error: Error) => {
        const sumError = new SummarizationError({
          message: `Failed to spawn Claude CLI: ${error.message}`,
          code: 'CLI_EXECUTION_FAILED',
          provider: 'claude',
          cause: error,
        })
        options.onError?.(sumError)
        reject(sumError)
      })
    })
  }

  estimateCost(_inputTokens: number): number {
    // CLI providers are free with subscription
    return 0
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const checkCommand = process.platform === 'win32' ? 'where' : 'which'
      const proc = spawn(checkCommand, [this.command], {
        stdio: ['ignore', 'ignore', 'ignore'],
      })

      proc.on('close', (code) => {
        resolve(code === 0)
      })

      proc.on('error', () => {
        resolve(false)
      })
    })
  }
}
