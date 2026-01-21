/**
 * INDEX Command
 *
 * Index markdown files for fast searching.
 */

import * as readline from 'node:readline'
import * as path from 'node:path'
import { Args, Command, Options } from '@effect/cli'
import { Console, Effect } from 'effect'
import { MissingApiKeyError } from '../../embeddings/openai-provider.js'
import {
  buildEmbeddings,
  estimateEmbeddingCost,
} from '../../embeddings/semantic-search.js'
import { buildIndex } from '../../index/indexer.js'
import { watchDirectory } from '../../index/watcher.js'
import { forceOption, jsonOption, prettyOption } from '../options.js'
import { formatJson, hasEmbeddings } from '../utils.js'

const promptUser = (message: string): Promise<string> => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question(message, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

export const indexCommand = Command.make(
  'index',
  {
    path: Args.directory({ name: 'path' }).pipe(
      Args.withDescription('Directory to index'),
      Args.withDefault('.'),
    ),
    embed: Options.boolean('embed').pipe(
      Options.withAlias('e'),
      Options.withDescription('Also build semantic embeddings'),
      Options.withDefault(false),
    ),
    noEmbed: Options.boolean('no-embed').pipe(
      Options.withDescription('Skip semantic search prompt'),
      Options.withDefault(false),
    ),
    exclude: Options.text('exclude').pipe(
      Options.withAlias('x'),
      Options.withDescription(
        'Exclude files matching patterns (comma-separated globs)',
      ),
      Options.optional,
    ),
    watch: Options.boolean('watch').pipe(
      Options.withAlias('w'),
      Options.withDescription('Watch for changes'),
      Options.withDefault(false),
    ),
    force: forceOption,
    json: jsonOption,
    pretty: prettyOption,
  },
  ({ path: dirPath, embed, noEmbed, exclude, watch: watchMode, force, json, pretty }) =>
    Effect.gen(function* () {
      const resolvedDir = path.resolve(dirPath)

      // Parse exclude patterns
      const excludePatterns = exclude._tag === 'Some'
        ? exclude.value.split(',').map((p) => p.trim())
        : undefined

      if (watchMode) {
        yield* Console.log(`Watching ${resolvedDir} for changes...`)
        yield* Console.log('Press Ctrl+C to stop.')
        yield* Console.log('')

        const watcher = yield* watchDirectory(resolvedDir, {
          force,
          onIndex: (result) => {
            if (json) {
              console.log(formatJson(result, pretty))
            } else {
              console.log(
                `Re-indexed ${result.documentsIndexed} documents (${result.duration}ms)`,
              )
            }
          },
          onError: (error) => {
            console.error(`Watch error: ${error.message}`)
          },
        })

        yield* Effect.async<never, never>(() => {
          process.on('SIGINT', () => {
            watcher.stop()
            console.log('\nStopped watching.')
            process.exit(0)
          })
        })
      } else {
        yield* Console.log(`Indexing ${resolvedDir}...`)

        const result = yield* buildIndex(resolvedDir, { force })

        if (!json) {
          yield* Console.log('')
          // Show totals, with "newly indexed" count if incremental
          const newlyIndexed =
            result.documentsIndexed < result.totalDocuments
              ? ` (${result.documentsIndexed} updated)`
              : ''
          yield* Console.log(
            `Indexed ${result.totalDocuments} documents${newlyIndexed}`,
          )
          yield* Console.log(`  Sections: ${result.totalSections}`)
          yield* Console.log(`  Links: ${result.totalLinks}`)
          yield* Console.log(`  Duration: ${result.duration}ms`)

          if (result.errors.length > 0) {
            yield* Console.log('')
            yield* Console.log(`Errors (${result.errors.length}):`)
            for (const error of result.errors) {
              yield* Console.log(`  ${error.path}: ${error.message}`)
            }
          }
        }

        // Check if we should prompt for semantic search
        const embedsExist = yield* Effect.promise(() => hasEmbeddings(resolvedDir))

        // Build embeddings if requested or after user prompt
        if (embed) {
          yield* Console.log('')

          // Show cost estimate first
          const estimate = yield* estimateEmbeddingCost(resolvedDir, {
            excludePatterns,
          }).pipe(
            Effect.catchIf(
              (e): e is MissingApiKeyError => e instanceof MissingApiKeyError,
              () =>
                Effect.gen(function* () {
                  yield* Console.error('')
                  yield* Console.error('Error: OPENAI_API_KEY not set')
                  yield* Console.error('')
                  yield* Console.error(
                    'To use semantic search, set your OpenAI API key:',
                  )
                  yield* Console.error('  export OPENAI_API_KEY=sk-...')
                  yield* Console.error('')
                  yield* Console.error('Or add to .env file in project root.')
                  return yield* Effect.fail(new Error('Missing API key'))
                }),
            ),
          )

          if (!json) {
            yield* Console.log(`Found ${estimate.totalFiles} files to embed:`)
            for (const dir of estimate.byDirectory) {
              const costStr = dir.estimatedCost < 0.001
                ? '<$0.001'
                : `~$${dir.estimatedCost.toFixed(4)}`
              yield* Console.log(
                `  ${dir.directory.padEnd(20)} ${String(dir.fileCount).padStart(3)} files   ${costStr}`,
              )
            }
            yield* Console.log('')
            yield* Console.log(
              `Total: ~${estimate.totalTokens.toLocaleString()} tokens, ~$${estimate.totalCost.toFixed(4)}, ~${estimate.estimatedTimeSeconds}s`,
            )
            yield* Console.log('')
          }

          if (!force) {
            yield* Console.log('Checking embeddings...')
          } else {
            yield* Console.log('Rebuilding embeddings (--force specified)...')
          }

          const embedResult = yield* buildEmbeddings(resolvedDir, {
            force,
            excludePatterns,
            onFileProgress: (progress) => {
              if (!json) {
                process.stdout.write(
                  `\r  [${progress.fileIndex}/${progress.totalFiles}] ${progress.filePath} (${progress.sectionCount} sections)...`,
                )
              }
            },
          }).pipe(
            Effect.catchIf(
              (e): e is MissingApiKeyError => e instanceof MissingApiKeyError,
              () =>
                Effect.gen(function* () {
                  yield* Console.error('')
                  yield* Console.error('Error: OPENAI_API_KEY not set')
                  yield* Console.error('')
                  yield* Console.error(
                    'To use semantic search, set your OpenAI API key:',
                  )
                  yield* Console.error('  export OPENAI_API_KEY=sk-...')
                  yield* Console.error('')
                  yield* Console.error('Or add to .env file in project root.')
                  return yield* Effect.fail(new Error('Missing API key'))
                }),
            ),
          )

          if (!json) {
            // Clear the progress line
            process.stdout.write('\r' + ' '.repeat(80) + '\r')
            yield* Console.log('')

            if (embedResult.cacheHit) {
              // Cache hit - embeddings already exist
              yield* Console.log(`Embeddings already exist (${embedResult.existingVectors} vectors)`)
              yield* Console.log('  Use --force to rebuild')
              yield* Console.log('')
              yield* Console.log(`Skipped embedding generation (saved ~$${(embedResult.estimatedSavings ?? 0).toFixed(4)})`)
            } else {
              // New embeddings were created
              yield* Console.log(`Completed in ${(embedResult.duration / 1000).toFixed(1)}s`)
              yield* Console.log(`  Files: ${embedResult.filesProcessed}`)
              yield* Console.log(
                `  Sections: ${embedResult.sectionsEmbedded}`,
              )
              yield* Console.log(`  Tokens: ${embedResult.tokensUsed.toLocaleString()}`)
              yield* Console.log(`  Cost: $${embedResult.cost.toFixed(6)}`)
            }
          }
        } else if (!noEmbed && !embedsExist && !json) {
          // Prompt user to enable semantic search
          yield* Console.log('')
          yield* Console.log('Enable semantic search? This allows natural language queries like:')
          yield* Console.log('  "how does authentication work" instead of exact keyword matches')
          yield* Console.log('')

          // Get cost estimate for the prompt
          const estimate = yield* estimateEmbeddingCost(resolvedDir).pipe(
            Effect.catchAll(() => Effect.succeed(null)),
          )

          if (estimate) {
            yield* Console.log(`Cost: ~$${estimate.totalCost.toFixed(4)} for this corpus (~${estimate.estimatedTimeSeconds}s)`)
          }
          yield* Console.log('Requires: OPENAI_API_KEY environment variable')
          yield* Console.log('')

          const answer = yield* Effect.promise(() => promptUser('Create semantic index? [y/N]: '))

          if (answer === 'y' || answer === 'yes') {
            // Check for API key
            if (!process.env.OPENAI_API_KEY) {
              yield* Console.log('')
              yield* Console.log('OPENAI_API_KEY not set.')
              yield* Console.log('')
              yield* Console.log('To enable semantic search, set your OpenAI API key:')
              yield* Console.log('  export OPENAI_API_KEY=sk-...')
              yield* Console.log('')
              yield* Console.log('Or add to .env file in project root.')
            } else {
              yield* Console.log('')
              yield* Console.log('Building embeddings...')

              const embedResult = yield* buildEmbeddings(resolvedDir, {
                force: false,
                onFileProgress: (progress) => {
                  process.stdout.write(
                    `\r  [${progress.fileIndex}/${progress.totalFiles}] ${progress.filePath} (${progress.sectionCount} sections)...`,
                  )
                },
              }).pipe(
                Effect.catchIf(
                  (e): e is MissingApiKeyError => e instanceof MissingApiKeyError,
                  () =>
                    Effect.gen(function* () {
                      yield* Console.error('')
                      yield* Console.error('Error: OPENAI_API_KEY not set')
                      yield* Console.error('')
                      yield* Console.error(
                        'To use semantic search, set your OpenAI API key:',
                      )
                      yield* Console.error('  export OPENAI_API_KEY=sk-...')
                      yield* Console.error('')
                      yield* Console.error('Or add to .env file in project root.')
                      return yield* Effect.fail(new Error('Missing API key'))
                    }),
                ),
                Effect.catchAll(() => Effect.succeed(null)),
              )

              if (embedResult) {
                // Clear the progress line
                process.stdout.write('\r' + ' '.repeat(80) + '\r')
                yield* Console.log('')
                yield* Console.log(`Completed in ${(embedResult.duration / 1000).toFixed(1)}s`)
                yield* Console.log(`  Files: ${embedResult.filesProcessed}`)
                yield* Console.log(`  Sections: ${embedResult.sectionsEmbedded}`)
                yield* Console.log(`  Tokens: ${embedResult.tokensUsed.toLocaleString()}`)
                yield* Console.log(`  Cost: $${embedResult.cost.toFixed(6)}`)
              }
            }
          }
        }

        if (json) {
          yield* Console.log(formatJson(result, pretty))
        }
      }
    }),
).pipe(Command.withDescription('Index markdown files'))
