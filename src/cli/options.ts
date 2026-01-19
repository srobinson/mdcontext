/**
 * Shared CLI Options
 *
 * Common options used across multiple commands.
 */

import { Options } from '@effect/cli'

/**
 * Output as JSON
 */
export const jsonOption = Options.boolean('json').pipe(
  Options.withDescription('Output as JSON'),
  Options.withDefault(false),
)

/**
 * Pretty-print JSON output
 */
export const prettyOption = Options.boolean('pretty').pipe(
  Options.withDescription('Pretty-print JSON output'),
  Options.withDefault(true),
)

/**
 * Force full rebuild
 */
export const forceOption = Options.boolean('force').pipe(
  Options.withDescription('Force full rebuild, ignoring cache'),
  Options.withDefault(false),
)
