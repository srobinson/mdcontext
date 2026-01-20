/**
 * SEARCH Command
 *
 * Search markdown content by meaning or heading pattern.
 */

import * as path from 'node:path'
import { Args, Command, Options } from '@effect/cli'
import { Console, Effect, Option } from 'effect'
import { semanticSearch } from '../../embeddings/semantic-search.js'
import { search, searchContent } from '../../search/searcher.js'
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
      Options.withDescription('Force structural search (headings only)'),
      Options.withDefault(false),
    ),
    headingOnly: Options.boolean('heading-only').pipe(
      Options.withAlias('H'),
      Options.withDescription('Search headings only (not content)'),
      Options.withDefault(false),
    ),
    mode: Options.choice('mode', ['semantic', 'structural']).pipe(
      Options.withAlias('m'),
      Options.withDescription('Force search mode: semantic or structural'),
      Options.optional,
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
  ({
    query,
    path: dirPath,
    structural,
    headingOnly,
    mode,
    limit,
    threshold,
    json,
    pretty,
  }) =>
    Effect.gen(function* () {
      const resolvedDir = path.resolve(dirPath)

      // Check for embeddings
      const embedsExist = yield* Effect.promise(() =>
        hasEmbeddings(resolvedDir),
      )

      // Determine search mode
      // Priority: --mode flag > --structural flag > regex pattern > embeddings availability
      let useStructural: boolean
      let modeReason: string

      const modeValue = Option.getOrUndefined(mode)

      if (modeValue === 'semantic') {
        if (!embedsExist) {
          yield* Effect.fail(
            new Error(
              'Semantic search requires embeddings. Run "mdtldr index --embed" first.',
            ),
          )
        }
        useStructural = false
        modeReason = '--mode semantic'
      } else if (modeValue === 'structural') {
        useStructural = true
        modeReason = '--mode structural'
      } else if (structural) {
        useStructural = true
        modeReason = '--structural flag'
      } else if (isRegexPattern(query)) {
        useStructural = true
        modeReason = 'regex pattern detected'
      } else if (!embedsExist) {
        useStructural = true
        modeReason = 'no embeddings'
      } else {
        useStructural = false
        modeReason = 'embeddings available'
      }

      const modeIndicator = useStructural ? '[structural]' : '[semantic]'

      if (useStructural) {
        // Structural search - content by default, heading-only if flag set
        const results = headingOnly
          ? yield* search(resolvedDir, { heading: query, limit })
          : yield* searchContent(resolvedDir, { content: query, limit })

        if (json) {
          const output = {
            mode: 'structural',
            modeReason,
            query,
            results: results.map((r) => ({
              path: r.section.documentPath,
              heading: r.section.heading,
              level: r.section.level,
              tokens: r.section.tokenCount,
              line: r.section.startLine,
              matches: r.matches?.map((m) => ({
                lineNumber: m.lineNumber,
                line: m.line,
              })),
            })),
          }
          yield* Console.log(formatJson(output, pretty))
        } else {
          const searchType = headingOnly ? 'Heading' : 'Content'
          yield* Console.log(
            `${modeIndicator} ${searchType} search: "${query}"`,
          )
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

            // Show match snippets with line numbers
            if (result.matches && result.matches.length > 0) {
              yield* Console.log('')
              for (const match of result.matches.slice(0, 3)) {
                // Show first 3 matches per section
                yield* Console.log(`    Line ${match.lineNumber}:`)
                // Indent snippet lines
                const snippetLines = match.snippet.split('\n')
                for (const line of snippetLines) {
                  yield* Console.log(`      ${line}`)
                }
              }
              if (result.matches.length > 3) {
                yield* Console.log(
                  `    ... and ${result.matches.length - 3} more matches`,
                )
              }
            }
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
          const output = {
            mode: 'semantic',
            modeReason,
            query,
            results,
          }
          yield* Console.log(formatJson(output, pretty))
        } else {
          yield* Console.log(`${modeIndicator} Semantic search: "${query}"`)
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
