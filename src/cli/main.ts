#!/usr/bin/env node

/**
 * mdm CLI - Token-efficient markdown analysis
 *
 * SETUP
 *   mdm init                   Initialize mdm in a directory
 *
 * CORE COMMANDS
 *   mdm index [path]           Index markdown files (default: .)
 *   mdm search <query> [path]  Search by meaning or structure
 *   mdm context <files...>     Get LLM-ready summary
 *   mdm tree [path|file]       Show files or document outline
 *
 * LINK ANALYSIS
 *   mdm links <file>           What does this link to?
 *   mdm backlinks <file>       What links to this?
 *
 * INSPECTION
 *   mdm stats [path]           Index statistics
 */

import { createRequire } from 'node:module'
import * as util from 'node:util'

// Read version from package.json using createRequire for ESM compatibility
const require = createRequire(import.meta.url)
const packageJson = require('../../package.json') as { version: string }
const CLI_VERSION: string = packageJson.version

import { CliConfig, Command } from '@effect/cli'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import type { ConfigService } from '../config/service.js'
import { isMdmError } from '../errors/index.js'
import { registerDefaultProviders } from '../providers/index.js'
import { preprocessArgv } from './argv-preprocessor.js'
import {
  backlinksCommand,
  configCommand,
  contextCommand,
  duplicatesCommand,
  embeddingsCommand,
  indexCommand,
  initCommand,
  linksCommand,
  searchCommand,
  statsCommand,
  treeCommand,
} from './commands/index.js'
import { makeCliConfigLayer } from './config-layer.js'
import {
  formatEffectCliError,
  isEffectCliValidationError,
} from './effect-cli-errors.js'
import { displayError, formatError } from './error-handler.js'
import {
  checkBareSubcommandHelp,
  checkSubcommandHelp,
  shouldShowMainHelp,
  showMainHelp,
} from './help.js'

// ============================================================================
// Main CLI
// ============================================================================

const mainCommand = Command.make('mdm').pipe(
  Command.withDescription('Token-efficient markdown analysis for LLMs'),
  Command.withSubcommands([
    initCommand,
    indexCommand,
    searchCommand,
    contextCommand,
    treeCommand,
    linksCommand,
    backlinksCommand,
    duplicatesCommand,
    statsCommand,
    configCommand,
    embeddingsCommand,
  ]),
)

const cli = Command.run(mainCommand, {
  name: 'mdm',
  version: CLI_VERSION,
})

// Clean CLI config: hide built-in options from help
const cliConfigLayer = CliConfig.layer({
  showBuiltIns: false,
})

// ============================================================================
// Custom Help Handling
// ============================================================================

// Check for subcommand help before anything else
checkSubcommandHelp()

// Check for bare subcommand that has nested subcommands (e.g., "config")
checkBareSubcommandHelp()

// Check if we should show main help
if (shouldShowMainHelp()) {
  showMainHelp()
  process.exit(0)
}

// Preprocess argv to allow flexible flag positioning
const filteredArgv = preprocessArgv(process.argv)

// ============================================================================
// Config Loading & CLI Execution
// ============================================================================

const configLayer: Layer.Layer<ConfigService> = makeCliConfigLayer({
  workingDir: process.cwd(),
})

const appLayers = Layer.mergeAll(NodeContext.layer, cliConfigLayer, configLayer)

Effect.suspend(() =>
  Effect.gen(function* () {
    yield* registerDefaultProviders()
    return yield* cli(filteredArgv)
  }),
).pipe(
  Effect.provide(appLayers),
  Effect.tap(() =>
    Effect.sync(() => {
      // Force exit after successful completion to prevent hanging
      // This is necessary because some dependencies (like OpenAI SDK)
      // may keep the event loop alive with HTTP keep-alive connections
      setImmediate(() => process.exit(0))
    }),
  ),
  Effect.catchAll((error: unknown) => {
    if (isEffectCliValidationError(error)) {
      return Effect.sync(() => {
        const message = formatEffectCliError(error)
        console.error(`\nError: ${message}`)
        console.error('\nRun "mdm --help" for usage information.')
        process.exit(1)
      })
    }

    // Typed domain errors get actionable remediation via formatError +
    // displayError instead of the generic "Unexpected error" dump. This
    // is where provider runtime failures (CapabilityNotSupported,
    // ProviderNotFound) surface as user-facing messages with
    // suggestions, alongside every other MdmError variant.
    if (isMdmError(error)) {
      const formatted = formatError(error)
      return displayError(formatted).pipe(
        Effect.flatMap(() =>
          Effect.sync(() => process.exit(formatted.exitCode)),
        ),
      )
    }

    // Truly unexpected errors (non-MdmError, non-CLI-validation) fall
    // through to the diagnostic dump path.
    return Effect.sync(() => {
      console.error('\nUnexpected error:')
      if (error instanceof Error) {
        console.error(`  ${error.message}`)
        if (error.stack) {
          console.error(`\nStack trace:`)
          console.error(error.stack)
        }
      } else {
        console.error(util.inspect(error, { depth: null }))
      }
      process.exit(2)
    })
  }),
  NodeRuntime.runMain,
)
