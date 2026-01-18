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

import * as fs from 'node:fs'
import * as fsPromises from 'node:fs/promises'
import * as path from 'node:path'
import { Args, CliConfig, Command, Options } from '@effect/cli'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Console, Effect, Layer } from 'effect'
import type { MdSection } from '../core/types.js'
import {
  buildEmbeddings,
  getEmbeddingStats,
  semanticSearch,
} from '../embeddings/semantic-search.js'
import {
  buildIndex,
  getIncomingLinks,
  getOutgoingLinks,
} from '../index/indexer.js'
import { watchDirectory } from '../index/watcher.js'
import { parseFile } from '../parser/parser.js'
import { search } from '../search/searcher.js'
import {
  assembleContext,
  formatAssembledContext,
  formatSummary,
  summarizeFile,
} from '../summarize/summarizer.js'

// ============================================================================
// Helper Functions
// ============================================================================

const formatJson = (obj: unknown, pretty: boolean): string => {
  return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj)
}

const isMarkdownFile = (filename: string): boolean => {
  return filename.endsWith('.md') || filename.endsWith('.mdx')
}

const walkDir = async (dir: string): Promise<string[]> => {
  const files: string[] = []
  const entries = await fsPromises.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    // Skip hidden directories and node_modules
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue
    }

    if (entry.isDirectory()) {
      const subFiles = await walkDir(fullPath)
      files.push(...subFiles)
    } else if (entry.isFile() && isMarkdownFile(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Check if a query looks like a regex pattern
 */
const isRegexPattern = (query: string): boolean => {
  // Has regex special characters (excluding simple spaces and common punctuation)
  return /[.*+?^${}()|[\]\\]/.test(query)
}

/**
 * Check if embeddings exist for a directory
 */
const hasEmbeddings = async (dir: string): Promise<boolean> => {
  const embeddingsPath = path.join(dir, '.tldr', 'embeddings.bin')
  try {
    await fsPromises.access(embeddingsPath)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// Shared Options
// ============================================================================

const jsonOption = Options.boolean('json').pipe(
  Options.withDescription('Output as JSON'),
  Options.withDefault(false),
)

const prettyOption = Options.boolean('pretty').pipe(
  Options.withDescription('Pretty-print JSON output'),
  Options.withDefault(true),
)

const forceOption = Options.boolean('force').pipe(
  Options.withDescription('Force full rebuild, ignoring cache'),
  Options.withDefault(false),
)

// ============================================================================
// INDEX Command
// ============================================================================

const indexCommand = Command.make(
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
    watch: Options.boolean('watch').pipe(
      Options.withAlias('w'),
      Options.withDescription('Watch for changes'),
      Options.withDefault(false),
    ),
    force: forceOption,
    json: jsonOption,
    pretty: prettyOption,
  },
  ({ path: dirPath, embed, watch: watchMode, force, json, pretty }) =>
    Effect.gen(function* () {
      const resolvedDir = path.resolve(dirPath)

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
          yield* Console.log(`Indexed ${result.documentsIndexed} documents`)
          yield* Console.log(`  Sections: ${result.sectionsIndexed}`)
          yield* Console.log(`  Links: ${result.linksIndexed}`)
          yield* Console.log(`  Duration: ${result.duration}ms`)

          if (result.errors.length > 0) {
            yield* Console.log('')
            yield* Console.log(`Errors (${result.errors.length}):`)
            for (const error of result.errors) {
              yield* Console.log(`  ${error.path}: ${error.message}`)
            }
          }
        }

        // Build embeddings if requested
        if (embed) {
          yield* Console.log('')
          yield* Console.log('Building embeddings...')

          const embedResult = yield* buildEmbeddings(resolvedDir, { force })

          if (!json) {
            yield* Console.log(
              `Embedded ${embedResult.sectionsEmbedded} sections`,
            )
            yield* Console.log(`  Tokens used: ${embedResult.tokensUsed}`)
            yield* Console.log(`  Cost: $${embedResult.cost.toFixed(6)}`)
            yield* Console.log(`  Duration: ${embedResult.duration}ms`)
          }
        }

        if (json) {
          yield* Console.log(formatJson(result, pretty))
        }
      }
    }),
).pipe(Command.withDescription('Index markdown files'))

// ============================================================================
// SEARCH Command
// ============================================================================

const searchCommand = Command.make(
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

// ============================================================================
// CONTEXT Command
// ============================================================================

const contextCommand = Command.make(
  'context',
  {
    files: Args.file({ name: 'files' }).pipe(
      Args.withDescription('Markdown file(s) to summarize'),
      Args.repeated,
    ),
    tokens: Options.integer('tokens').pipe(
      Options.withAlias('t'),
      Options.withDescription('Token budget'),
      Options.withDefault(2000),
    ),
    brief: Options.boolean('brief').pipe(
      Options.withDescription('Minimal output'),
      Options.withDefault(false),
    ),
    full: Options.boolean('full').pipe(
      Options.withDescription('Include full content'),
      Options.withDefault(false),
    ),
    json: jsonOption,
    pretty: prettyOption,
  },
  ({ files, tokens, brief, full, json, pretty }) =>
    Effect.gen(function* () {
      // Effect CLI Args.repeated returns an array
      const fileList: string[] = Array.isArray(files) ? files : []

      if (fileList.length === 0) {
        yield* Console.log('Error: At least one file is required')
        yield* Console.log('Usage: mdtldr context <file> [files...]')
        return
      }

      // Determine level
      const level = full ? 'full' : brief ? 'brief' : 'summary'

      const firstFile = fileList[0]
      if (fileList.length === 1 && firstFile) {
        // Single file: use summarizeFile
        const filePath = path.resolve(firstFile)
        const summary = yield* summarizeFile(filePath, {
          level: level as 'brief' | 'summary' | 'full',
          maxTokens: tokens,
        })

        if (json) {
          yield* Console.log(formatJson(summary, pretty))
        } else {
          yield* Console.log(formatSummary(summary))
        }
      } else {
        // Multiple files: use assembleContext
        const root = process.cwd()
        const assembled = yield* assembleContext(root, fileList, {
          budget: tokens,
          level: level as 'brief' | 'summary' | 'full',
        })

        if (json) {
          yield* Console.log(formatJson(assembled, pretty))
        } else {
          yield* Console.log(formatAssembledContext(assembled))
        }
      }
    }),
).pipe(Command.withDescription('Get LLM-ready summary'))

// ============================================================================
// TREE Command
// ============================================================================

const treeCommand = Command.make(
  'tree',
  {
    pathArg: Args.text({ name: 'path' }).pipe(
      Args.withDescription('Directory (shows files) or file (shows outline)'),
      Args.withDefault('.'),
    ),
    json: jsonOption,
    pretty: prettyOption,
  },
  ({ pathArg, json, pretty }) =>
    Effect.gen(function* () {
      const resolvedPath = path.resolve(pathArg)

      // Auto-detect: file or directory
      const stat = yield* Effect.try(() => fs.statSync(resolvedPath))

      if (stat.isFile()) {
        // Show document outline
        const result = yield* parseFile(resolvedPath).pipe(
          Effect.mapError((e) => new Error(`${e._tag}: ${e.message}`)),
        )

        const extractStructure = (
          section: MdSection,
        ): {
          heading: string
          level: number
          tokens: number
          children: unknown[]
        } => ({
          heading: section.heading,
          level: section.level,
          tokens: section.metadata.tokenCount,
          children: section.children.map(extractStructure),
        })

        if (json) {
          const structure = {
            title: result.title,
            path: result.path,
            totalTokens: result.metadata.tokenCount,
            sections: result.sections.map(extractStructure),
          }
          yield* Console.log(formatJson(structure, pretty))
        } else {
          yield* Console.log(`# ${result.title}`)
          yield* Console.log(`Total tokens: ${result.metadata.tokenCount}`)
          yield* Console.log('')

          const printOutline = (
            section: MdSection,
            depth: number = 0,
          ): Effect.Effect<void> =>
            Effect.gen(function* () {
              const indent = '  '.repeat(depth)
              const marker = '#'.repeat(section.level)
              yield* Console.log(
                `${indent}${marker} ${section.heading} [${section.metadata.tokenCount} tokens]`,
              )
              for (const child of section.children) {
                yield* printOutline(child, depth + 1)
              }
            })

          for (const section of result.sections) {
            yield* printOutline(section)
          }
        }
      } else {
        // Show file list
        const files = yield* Effect.promise(() => walkDir(resolvedPath))

        const tree = files.sort().map((f) => ({
          path: f,
          relativePath: path.relative(resolvedPath, f),
        }))

        if (json) {
          yield* Console.log(formatJson(tree, pretty))
        } else {
          yield* Console.log(`Markdown files in ${resolvedPath}:`)
          yield* Console.log('')
          for (const file of tree) {
            yield* Console.log(`  ${file.relativePath}`)
          }
          yield* Console.log('')
          yield* Console.log(`Total: ${tree.length} files`)
        }
      }
    }),
).pipe(Command.withDescription('Show files or document outline'))

// ============================================================================
// LINKS Command
// ============================================================================

const linksCommand = Command.make(
  'links',
  {
    file: Args.file({ name: 'file' }).pipe(
      Args.withDescription('Markdown file to analyze'),
    ),
    root: Options.directory('root').pipe(
      Options.withAlias('r'),
      Options.withDescription('Root directory for resolving relative links'),
      Options.withDefault('.'),
    ),
    json: jsonOption,
    pretty: prettyOption,
  },
  ({ file, root, json, pretty }) =>
    Effect.gen(function* () {
      const resolvedRoot = path.resolve(root)
      const resolvedFile = path.resolve(file)
      const relativePath = path.relative(resolvedRoot, resolvedFile)

      const links = yield* getOutgoingLinks(resolvedRoot, resolvedFile)

      if (json) {
        yield* Console.log(formatJson({ file: relativePath, links }, pretty))
      } else {
        yield* Console.log(`Outgoing links from ${relativePath}:`)
        yield* Console.log('')
        if (links.length === 0) {
          yield* Console.log('  (none)')
        } else {
          for (const link of links) {
            yield* Console.log(`  -> ${link}`)
          }
        }
        yield* Console.log('')
        yield* Console.log(`Total: ${links.length} links`)
      }
    }),
).pipe(Command.withDescription('What does this link to?'))

// ============================================================================
// BACKLINKS Command
// ============================================================================

const backlinksCommand = Command.make(
  'backlinks',
  {
    file: Args.file({ name: 'file' }).pipe(
      Args.withDescription('Markdown file to find references to'),
    ),
    root: Options.directory('root').pipe(
      Options.withAlias('r'),
      Options.withDescription('Root directory for resolving relative links'),
      Options.withDefault('.'),
    ),
    json: jsonOption,
    pretty: prettyOption,
  },
  ({ file, root, json, pretty }) =>
    Effect.gen(function* () {
      const resolvedRoot = path.resolve(root)
      const resolvedFile = path.resolve(file)
      const relativePath = path.relative(resolvedRoot, resolvedFile)

      const links = yield* getIncomingLinks(resolvedRoot, resolvedFile)

      if (json) {
        yield* Console.log(
          formatJson({ file: relativePath, backlinks: links }, pretty),
        )
      } else {
        yield* Console.log(`Incoming links to ${relativePath}:`)
        yield* Console.log('')
        if (links.length === 0) {
          yield* Console.log('  (none)')
        } else {
          for (const link of links) {
            yield* Console.log(`  <- ${link}`)
          }
        }
        yield* Console.log('')
        yield* Console.log(`Total: ${links.length} backlinks`)
      }
    }),
).pipe(Command.withDescription('What links to this?'))

// ============================================================================
// STATS Command
// ============================================================================

const statsCommand = Command.make(
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

// Run with clean config and friendly errors
Effect.suspend(() => cli(process.argv)).pipe(
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
