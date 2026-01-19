/**
 * STATS Command
 *
 * Show index statistics.
 */

import * as path from 'node:path'
import { Args, Command } from '@effect/cli'
import { Console, Effect } from 'effect'
import { getEmbeddingStats } from '../../embeddings/semantic-search.js'
import { jsonOption, prettyOption } from '../options.js'
import { formatJson } from '../utils.js'

export const statsCommand = Command.make(
  'stats',
  {
    path: Args.directory({ name: 'path' }).pipe(
      Args.withDescription('Directory to show stats for'),
      Args.withDefault('.'),
    ),
    json: jsonOption,
    pretty: prettyOption,
  },
  ({ path: dirPath, json, pretty }) =>
    Effect.gen(function* () {
      const resolvedRoot = path.resolve(dirPath)
      const stats = yield* getEmbeddingStats(resolvedRoot)

      if (json) {
        yield* Console.log(formatJson(stats, pretty))
      } else {
        yield* Console.log('Index statistics:')
        yield* Console.log('')
        if (stats.hasEmbeddings) {
          yield* Console.log(`  Vectors: ${stats.count}`)
          yield* Console.log(`  Provider: ${stats.provider}`)
          yield* Console.log(`  Dimensions: ${stats.dimensions}`)
          yield* Console.log(`  Total tokens: ${stats.totalTokens}`)
          yield* Console.log(`  Total cost: $${stats.totalCost.toFixed(6)}`)
        } else {
          yield* Console.log('  No embeddings found.')
          yield* Console.log(
            "  Run 'mdtldr index --embed' to build embeddings.",
          )
        }
      }
    }),
).pipe(Command.withDescription('Index statistics'))
