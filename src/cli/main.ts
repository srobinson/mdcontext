#!/usr/bin/env node

/**
 * md-tldr CLI - Token-efficient markdown analysis
 *
 * CORE COMMANDS
 *   mdtldr index [path]           Index markdown files (default: .)
 *   mdtldr search <query> [path]  Search by meaning or structure
 *   mdtldr context <files...>     Get LLM-ready summary
 *   mdtldr tree [path|file]       Show files or document outline
 *
 * LINK ANALYSIS
 *   mdtldr links <file>           What does this link to?
 *   mdtldr backlinks <file>       What links to this?
 *
 * INSPECTION
 *   mdtldr stats [path]           Index statistics
 */

import { CliConfig, Command } from '@effect/cli'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { preprocessArgv } from './argv-preprocessor.js'
import {
  backlinksCommand,
  contextCommand,
  indexCommand,
  linksCommand,
  searchCommand,
  statsCommand,
  treeCommand,
} from './commands/index.js'
import {
  checkSubcommandHelp,
  shouldShowMainHelp,
  showMainHelp,
} from './help.js'

// ============================================================================
// Main CLI
// ============================================================================

const mainCommand = Command.make('mdtldr').pipe(
  Command.withDescription('Token-efficient markdown analysis for LLMs'),
  Command.withSubcommands([
    indexCommand,
    searchCommand,
    contextCommand,
    treeCommand,
    linksCommand,
    backlinksCommand,
    statsCommand,
  ]),
)

const cli = Command.run(mainCommand, {
  name: 'mdtldr',
  version: '0.1.0',
})

// Clean CLI config: hide built-in options from help
const cliConfigLayer = CliConfig.layer({
  showBuiltIns: false,
})

// ============================================================================
// Error Handling
// ============================================================================

// Custom error formatter
const formatCliError = (error: unknown): string => {
  if (error && typeof error === 'object') {
    // Handle Effect CLI validation errors
    const err = error as Record<string, unknown>
    if (err._tag === 'ValidationError' && err.error) {
      const validationError = err.error as Record<string, unknown>
      // Extract the actual error message
      if (validationError._tag === 'Paragraph' && validationError.value) {
        const paragraph = validationError.value as Record<string, unknown>
        if (paragraph._tag === 'Text' && typeof paragraph.value === 'string') {
          return paragraph.value
        }
      }
    }
    // Handle MissingValue errors
    if (err._tag === 'MissingValue' && err.error) {
      const missingError = err.error as Record<string, unknown>
      if (missingError._tag === 'Paragraph' && missingError.value) {
        const paragraph = missingError.value as Record<string, unknown>
        if (paragraph._tag === 'Text' && typeof paragraph.value === 'string') {
          return paragraph.value
        }
      }
    }
  }
  return String(error)
}

// Check if error is a CLI validation error (should show friendly message)
const isValidationError = (error: unknown): boolean => {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    return (
      err._tag === 'ValidationError' ||
      err._tag === 'MissingValue' ||
      err._tag === 'InvalidValue'
    )
  }
  return false
}

// ============================================================================
// Custom Help Handling
// ============================================================================

// Check for subcommand help before anything else
checkSubcommandHelp()

// Check if we should show main help
if (shouldShowMainHelp()) {
  showMainHelp()
  process.exit(0)
}

// Preprocess argv to allow flexible flag positioning
const processedArgv = preprocessArgv(process.argv)

// Run with clean config and friendly errors
Effect.suspend(() => cli(processedArgv)).pipe(
  Effect.provide(Layer.merge(NodeContext.layer, cliConfigLayer)),
  Effect.catchAll((error) =>
    Effect.sync(() => {
      // Only show friendly error for validation errors
      if (isValidationError(error)) {
        const message = formatCliError(error)
        console.error(`\nError: ${message}`)
        console.error('\nRun "mdtldr --help" for usage information.')
        process.exit(1)
      }
      // Re-throw other errors to be handled normally
      throw error
    }),
  ),
  NodeRuntime.runMain,
)
