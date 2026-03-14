/**
 * CONFIG Command
 *
 * Configuration management commands: init, check, etc.
 */

import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { Command, Options } from '@effect/cli'
import { Console, Effect, Option } from 'effect'
import {
  defaultConfig,
  loadConfigFile,
  type PartialMdmConfig,
  readEnvVarsMap,
} from '../../config/index.js'
import { jsonOption, prettyOption } from '../options.js'
import { formatJson } from '../utils.js'

/**
 * Config init subcommand - creates a starter .mdm.toml config file.
 */
const initCommand = Command.make(
  'init',
  {
    force: Options.boolean('force').pipe(
      Options.withDescription('Overwrite existing config file'),
      Options.withDefault(false),
    ),
    global: Options.boolean('global').pipe(
      Options.withAlias('g'),
      Options.withDescription('Write to ~/.mdm/.mdm.toml instead of PWD'),
      Options.withDefault(false),
    ),
    json: jsonOption,
    pretty: prettyOption,
  },
  ({ force, global: useGlobal, json, pretty }) =>
    Effect.gen(function* () {
      const targetDir = useGlobal
        ? path.join(os.homedir(), '.mdm')
        : process.cwd()

      // Ensure target dir exists for global
      if (useGlobal && !fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      const filepath = path.join(targetDir, '.mdm.toml')

      // Check if a config file already exists
      if (fs.existsSync(filepath) && !force) {
        if (json) {
          yield* Console.log(
            formatJson(
              {
                error: 'Config file already exists',
                path: filepath,
                hint: 'Use --force to overwrite',
              },
              pretty,
            ),
          )
        } else {
          yield* Console.error(`Config file already exists: ${filepath}`)
          yield* Console.error('')
          yield* Console.error('Use --force to overwrite.')
        }
        return
      }

      // Generate TOML content from defaults
      const { generateDefaultToml } = yield* Effect.tryPromise({
        try: () => import('./init-toml.js'),
        catch: (e) => new Error(`Failed to load TOML generator: ${e}`),
      })
      const content = generateDefaultToml()

      // Write the file
      yield* Effect.try({
        try: () => fs.writeFileSync(filepath, content, 'utf-8'),
        catch: (e) => new Error(`Failed to write config file: ${e}`),
      })

      if (json) {
        yield* Console.log(
          formatJson(
            {
              created: filepath,
              format: 'toml',
            },
            pretty,
          ),
        )
      } else {
        yield* Console.log(`Created ${filepath}`)
        yield* Console.log('')
        yield* Console.log('Edit the file to customize mdm for your project.')
      }
    }),
).pipe(Command.withDescription('Create a starter .mdm.toml config file'))

/**
 * Config show subcommand - displays current config.
 */
const showCommand = Command.make(
  'show',
  {
    json: jsonOption,
    pretty: prettyOption,
  },
  ({ json, pretty }) =>
    Effect.gen(function* () {
      const cwd = process.cwd()

      // Find existing config file
      const configResult = loadConfigFile(cwd)

      if (!configResult) {
        if (json) {
          yield* Console.log(
            formatJson(
              {
                error: 'No config file found',
                searchedIn: cwd,
                searchedFor: ['.mdm.toml'],
              },
              pretty,
            ),
          )
        } else {
          yield* Console.log('No config file found.')
          yield* Console.log('')
          yield* Console.log('Searched for:')
          yield* Console.log('  - .mdm.toml (project-local)')
          yield* Console.log('  - ~/.mdm/.mdm.toml (global)')
          yield* Console.log('')
          yield* Console.log("Run 'mdm config init' to create one.")
        }
        return
      }

      if (json) {
        yield* Console.log(
          formatJson(
            {
              configFile: configResult.path,
            },
            pretty,
          ),
        )
      } else {
        yield* Console.log(`Config file: ${configResult.path}`)
      }
    }),
).pipe(Command.withDescription('Show config file location'))

// ============================================================================
// Config Check Types
// ============================================================================

type ConfigSource = 'default' | 'file' | 'env'

interface ConfigValueWithSource<T> {
  value: T
  source: ConfigSource
}

type ConfigSectionWithSources<T> = {
  [K in keyof T]: ConfigValueWithSource<T[K]>
}

interface ConfigWithSources {
  index: ConfigSectionWithSources<typeof defaultConfig.index>
  search: ConfigSectionWithSources<typeof defaultConfig.search>
  embeddings: ConfigSectionWithSources<typeof defaultConfig.embeddings>
  summarization: ConfigSectionWithSources<typeof defaultConfig.summarization>
  output: ConfigSectionWithSources<typeof defaultConfig.output>
  paths: ConfigSectionWithSources<typeof defaultConfig.paths>
}

interface CheckResultJson {
  valid: boolean
  sourceFile: string | null
  errors?: string[]
  config: ConfigWithSources
}

// ============================================================================
// Config Check Helpers
// ============================================================================

/**
 * Determine the source of a config value by checking env, file, and defaults.
 */
const getValueSource = <T>(
  key: string,
  envConfig: Map<string, string>,
  fileValue: T | undefined,
  _defaultValue: T,
): ConfigSource => {
  if (envConfig.has(key)) {
    return 'env'
  }
  if (fileValue !== undefined) {
    return 'file'
  }
  return 'default'
}

/**
 * Get effective value from the precedence chain.
 */
const getEffectiveValue = <T>(
  key: string,
  envConfig: Map<string, string>,
  fileValue: T | undefined,
  defaultValue: T,
): T => {
  const envValue = envConfig.get(key)
  if (envValue !== undefined) {
    // Parse env value based on type of default
    if (typeof defaultValue === 'boolean') {
      return (envValue === 'true') as unknown as T
    }
    if (typeof defaultValue === 'number') {
      return Number(envValue) as unknown as T
    }
    if (Array.isArray(defaultValue)) {
      return envValue.split(',') as unknown as T
    }
    return envValue as unknown as T
  }
  if (fileValue !== undefined) {
    return fileValue
  }
  return defaultValue
}

/**
 * Build config section with source annotations.
 */
const buildSectionWithSources = <T extends object>(
  sectionName: string,
  defaultSection: T,
  fileSection: Partial<T> | undefined,
  envConfig: Map<string, string>,
): ConfigSectionWithSources<T> => {
  const result: Record<string, ConfigValueWithSource<unknown>> = {}
  const defaults = defaultSection as unknown as Record<string, unknown>
  const file = fileSection as unknown as Record<string, unknown> | undefined

  for (const [key, defaultValue] of Object.entries(defaults)) {
    const envKey = `${sectionName}.${key}`
    const fileValue = file?.[key]

    result[key] = {
      value: getEffectiveValue(envKey, envConfig, fileValue, defaultValue),
      source: getValueSource(envKey, envConfig, fileValue, defaultValue),
    }
  }

  return result as ConfigSectionWithSources<T>
}

/**
 * Format a value for text display.
 */
const formatValue = (value: unknown): string => {
  if (Option.isOption(value)) {
    return Option.isSome(value) ? String(value.value) : '(not set)'
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value)
  }
  if (typeof value === 'string') {
    return value
  }
  return String(value)
}

/**
 * Format source annotation for text display.
 */
const formatSourceAnnotation = (source: ConfigSource): string => {
  switch (source) {
    case 'file':
      return '(from config file)'
    case 'env':
      return '(from environment)'
    case 'default':
      return '(default)'
  }
}

/**
 * Convert config with sources to JSON format.
 * Handles Option values by converting them to their underlying value or null.
 */
const configToJsonFormat = (config: ConfigWithSources): ConfigWithSources => {
  const convertSection = <
    T extends Record<string, ConfigValueWithSource<unknown>>,
  >(
    section: T,
  ): T => {
    const result: Record<string, ConfigValueWithSource<unknown>> = {}
    for (const [key, entry] of Object.entries(section)) {
      let value = entry.value
      if (Option.isOption(value)) {
        value = Option.isSome(value) ? value.value : null
      }
      result[key] = { value, source: entry.source }
    }
    return result as T
  }

  return {
    index: convertSection(config.index),
    search: convertSection(config.search),
    embeddings: convertSection(config.embeddings),
    summarization: convertSection(config.summarization),
    output: convertSection(config.output),
    paths: convertSection(config.paths),
  }
}

/**
 * Config check subcommand - validates config and shows effective values with sources.
 */
const checkCommand = Command.make(
  'check',
  {
    json: jsonOption,
    pretty: prettyOption,
  },
  ({ json, pretty }) =>
    Effect.gen(function* () {
      const cwd = process.cwd()
      const errors: string[] = []

      // Load config file if present
      const configFileResult = loadConfigFile(cwd)

      const sourceFile = configFileResult ? configFileResult.path : null
      const fileConfig: PartialMdmConfig = configFileResult
        ? configFileResult.config
        : {}

      // Read environment variables
      const envConfig = readEnvVarsMap('MDM')

      // Build config with source annotations
      const configWithSources: ConfigWithSources = {
        index: buildSectionWithSources(
          'index',
          defaultConfig.index,
          fileConfig.index,
          envConfig,
        ),
        search: buildSectionWithSources(
          'search',
          defaultConfig.search,
          fileConfig.search,
          envConfig,
        ),
        embeddings: buildSectionWithSources(
          'embeddings',
          defaultConfig.embeddings,
          fileConfig.embeddings as
            | Partial<typeof defaultConfig.embeddings>
            | undefined,
          envConfig,
        ),
        summarization: buildSectionWithSources(
          'summarization',
          defaultConfig.summarization,
          fileConfig.summarization,
          envConfig,
        ),
        output: buildSectionWithSources(
          'output',
          defaultConfig.output,
          fileConfig.output,
          envConfig,
        ),
        paths: buildSectionWithSources(
          'paths',
          defaultConfig.paths,
          fileConfig.paths as Partial<typeof defaultConfig.paths> | undefined,
          envConfig,
        ),
      }

      const isValid = errors.length === 0

      if (json) {
        const result: CheckResultJson = {
          valid: isValid,
          sourceFile,
          config: configToJsonFormat(configWithSources),
        }
        if (errors.length > 0) {
          result.errors = errors
        }
        yield* Console.log(formatJson(result, pretty))
      } else {
        // Text format output
        if (isValid) {
          yield* Console.log('Configuration validated successfully!')
        } else {
          yield* Console.log('Configuration has errors:')
          for (const error of errors) {
            yield* Console.log(`  - ${error}`)
          }
        }
        yield* Console.log('')

        if (sourceFile) {
          yield* Console.log(`Source: ${sourceFile}`)
        } else {
          yield* Console.log('Source: No config file found (using defaults)')
        }
        yield* Console.log('')

        yield* Console.log('Effective configuration:')

        // Display each section
        for (const [sectionName, section] of Object.entries(
          configWithSources,
        )) {
          yield* Console.log(`  ${sectionName}:`)
          for (const [key, entry] of Object.entries(
            section as Record<string, ConfigValueWithSource<unknown>>,
          )) {
            const valueStr = formatValue(entry.value)
            const sourceStr = formatSourceAnnotation(entry.source)
            yield* Console.log(`    ${key}: ${valueStr} ${sourceStr}`)
          }
        }
      }
    }),
).pipe(Command.withDescription('Validate and display effective configuration'))

/**
 * Main config command with subcommands.
 */
export const configCommand = Command.make('config').pipe(
  Command.withDescription('Configuration management'),
  Command.withSubcommands([initCommand, showCommand, checkCommand]),
)
