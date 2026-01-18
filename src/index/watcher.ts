/**
 * File watcher for automatic re-indexing
 */

import * as path from 'node:path'
import { watch } from 'chokidar'
import { Effect } from 'effect'

import { buildIndex, type IndexOptions } from './indexer.js'
import { createStorage, indexExists } from './storage.js'

// ============================================================================
// Watcher Types
// ============================================================================

export interface WatcherOptions extends IndexOptions {
  readonly debounceMs?: number
  readonly onIndex?: (result: {
    documentsIndexed: number
    duration: number
  }) => void
  readonly onError?: (error: Error) => void
}

export interface Watcher {
  readonly stop: () => void
}

// ============================================================================
// Watcher Implementation
// ============================================================================

const isMarkdownFile = (filePath: string): boolean =>
  filePath.endsWith('.md') || filePath.endsWith('.mdx')

export const watchDirectory = (
  rootPath: string,
  options: WatcherOptions = {},
): Effect.Effect<Watcher, Error> =>
  Effect.gen(function* () {
    const resolvedRoot = path.resolve(rootPath)
    const storage = createStorage(resolvedRoot)
    const debounceMs = options.debounceMs ?? 300

    // Ensure index exists
    const exists = yield* indexExists(storage)
    if (!exists) {
      // Build initial index
      const result = yield* buildIndex(resolvedRoot, options)
      options.onIndex?.({
        documentsIndexed: result.documentsIndexed,
        duration: result.duration,
      })
    }

    // Create a debounce queue
    const pendingPaths = new Set<string>()
    let debounceTimer: NodeJS.Timeout | null = null

    const scheduleReindex = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      debounceTimer = setTimeout(async () => {
        if (pendingPaths.size === 0) return

        pendingPaths.clear()

        try {
          const result = await Effect.runPromise(
            buildIndex(resolvedRoot, options),
          )
          options.onIndex?.({
            documentsIndexed: result.documentsIndexed,
            duration: result.duration,
          })
        } catch (error) {
          options.onError?.(
            error instanceof Error ? error : new Error(String(error)),
          )
        }
      }, debounceMs)
    }

    // Set up chokidar watcher
    const watcher = watch(resolvedRoot, {
      ignored: [
        /(^|[/\\])\../, // Ignore dotfiles
        '**/node_modules/**',
      ],
      persistent: true,
      ignoreInitial: true,
    })

    watcher.on('add', (filePath) => {
      if (isMarkdownFile(filePath)) {
        pendingPaths.add(filePath)
        scheduleReindex()
      }
    })

    watcher.on('change', (filePath) => {
      if (isMarkdownFile(filePath)) {
        pendingPaths.add(filePath)
        scheduleReindex()
      }
    })

    watcher.on('unlink', (filePath) => {
      if (isMarkdownFile(filePath)) {
        pendingPaths.add(filePath)
        scheduleReindex()
      }
    })

    watcher.on('error', (error: unknown) => {
      options.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      )
    })

    return {
      stop: () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }
        watcher.close()
      },
    }
  })
