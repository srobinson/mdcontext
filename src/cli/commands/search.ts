/**
 * SEARCH Command
 *
 * Search markdown content by meaning or heading pattern.
 */

import * as path from 'node:path'
import { Args, Command, Options } from '@effect/cli'
import { Console, Effect } from 'effect'
import { semanticSearch } from '../../embeddings/semantic-search.js'
import { search } from '../../search/searcher.js'
import { jsonOption, prettyOption } from '../options.js'
import { formatJson, hasEmbeddings, isRegexPattern } from '../utils.js'

export const searchCommand = Command.make(
  'search',
  {
    query: Args.text({ name: 'query' }).pipe(
      Args.withDescription('Search query (natural language or regex pattern)'),
    ),
    path: Args.directory({ name: 'path' }).pipe(
      Args.withDescription('Directory to search in'),
      Args.withDefault('.'),
    ),
    structural: Options.boolean('structural').pipe(
      Options.withAlias('s'),
      Options.withDescription('Force structural search (heading regex)'),
      Options.withDefault(false),
    ),
    limit: Options.integer('limit').pipe(
      Options.withAlias('n'),
      Options.withDescription('Maximum results'),
      Options.withDefault(10),
    ),
    threshold: Options.float('threshold').pipe(
      Options.withDescription('Similarity threshold for semantic search (0-1)'),
      Options.withDefault(0.5),
    ),
    json: jsonOption,
    pretty: prettyOption,
  },
  ({ query, path: dirPath, structural, limit, threshold, json, pretty }) =>
    Effect.gen(function* () {
      const resolvedDir = path.resolve(dirPath)

      // Auto-detect: structural if --structural flag, regex chars, or no embeddings
      const embedsExist = yield* Effect.promise(() =>
        hasEmbeddings(resolvedDir),
      )
      const useStructural = structural || isRegexPattern(query) || !embedsExist

      if (useStructural) {
        // Structural search (heading regex)
        const results = yield* search(resolvedDir, {
          heading: query,
          limit,
        })

        if (json) {
          const output = results.map((r) => ({
            path: r.section.documentPath,
            heading: r.section.heading,
            level: r.section.level,
            tokens: r.section.tokenCount,
            line: r.section.startLine,
          }))
          yield* Console.log(formatJson(output, pretty))
        } else {
          yield* Console.log(`Structural search: "${query}"`)
          yield* Console.log(`Results: ${results.length}`)
          yield* Console.log('')

          for (const result of results) {
            const levelMarker = '#'.repeat(result.section.level)
            yield* Console.log(
              `  ${result.section.documentPath}:${result.section.startLine}`,
            )
            yield* Console.log(
              `    ${levelMarker} ${result.section.heading} (${result.section.tokenCount} tokens)`,
            )
            yield* Console.log('')
          }
        }
      } else {
        // Semantic search
        const results = yield* semanticSearch(resolvedDir, query, {
          limit,
          threshold,
        })

        if (json) {
          yield* Console.log(formatJson(results, pretty))
        } else {
          yield* Console.log(`Semantic search: "${query}"`)
          yield* Console.log(`Results: ${results.length}`)
          yield* Console.log('')

          for (const result of results) {
            const similarity = (result.similarity * 100).toFixed(1)
            yield* Console.log(`  ${result.documentPath}`)
            yield* Console.log(`    ${result.heading} (${similarity}% match)`)
            yield* Console.log('')
          }
        }
      }
    }),
).pipe(Command.withDescription('Search by meaning or structure'))
