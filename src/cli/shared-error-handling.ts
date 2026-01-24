/**
 * Shared Error Handling Utilities
 *
 * This module provides reusable error handling patterns for CLI commands.
 * It eliminates duplication in catchTags blocks across index-cmd.ts and search.ts.
 *
 * ## Design Principles
 *
 * 1. **Use proper Effect composition** - Never use Effect.runSync inside error handlers.
 *    Instead, return Effect values that compose properly in the Effect pipeline.
 *
 * 2. **Graceful degradation** - For optional operations, return null on failure
 *    and let the caller decide what to do next.
 *
 * 3. **Consistent logging** - Use Effect.logWarning for debugging info and
 *    Console.error for user-facing errors. Support silent mode for JSON output.
 *
 * ## When to Catch vs Propagate
 *
 * **CATCH errors when:**
 * - The operation is optional (e.g., cost estimate for user prompt)
 * - Failure should fall back gracefully (e.g., auto-index attempt)
 *
 * **PROPAGATE errors when:**
 * - The operation is required for the command to succeed
 * - The centralized error handler (error-handler.ts) should format the message
 *
 * ## Usage
 * ```typescript
 * const result = yield* someOperation.pipe(
 *   Effect.map((r): SomeType | null => r),
 *   Effect.catchTags(createEmbeddingErrorHandler({ silent: json }))
 * )
 * ```
 */

import { Console, Effect } from 'effect'
import type { BuildEmbeddingsResult } from '../embeddings/semantic-search.js'
import type {
  ApiKeyInvalidError,
  ApiKeyMissingError,
  EmbeddingError,
  FileReadError,
  IndexCorruptedError,
  IndexNotFoundError,
  VectorStoreError,
} from '../errors/index.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Options for error handlers.
 */
export interface ErrorHandlerOptions {
  /**
   * When true, suppress error output (for JSON mode).
   */
  readonly silent?: boolean
}

/**
 * A result type that can be null when operation fails gracefully.
 */
export type NullableResult<T> = T | null

// ============================================================================
// Logging Helpers
// ============================================================================

/**
 * Log an error message if not in silent mode.
 * Returns an Effect that can be composed properly.
 */
const logErrorUnlessSilent = (
  message: string,
  silent: boolean,
): Effect.Effect<void, never, never> =>
  silent ? Effect.void : Console.error(message)

/**
 * Log a warning message if not in silent mode.
 * Returns an Effect that can be composed properly.
 */
const logWarningUnlessSilent = (
  message: string,
  silent: boolean,
): Effect.Effect<void, never, never> =>
  silent ? Effect.void : Effect.logWarning(message)

// ============================================================================
// Index/File Error Handlers
// ============================================================================

/**
 * Create a handler for index-related errors that returns null on failure.
 * Use this for operations where index errors should gracefully degrade.
 */
export const createIndexErrorHandler = <T>(options: ErrorHandlerOptions = {}) =>
  ({
    IndexNotFoundError: (_e: IndexNotFoundError) =>
      Effect.succeed(null as NullableResult<T>),
    FileReadError: (e: FileReadError) =>
      logWarningUnlessSilent(
        `Could not read index files: ${e.message}`,
        options.silent ?? false,
      ).pipe(Effect.map(() => null as NullableResult<T>)),
    IndexCorruptedError: (e: IndexCorruptedError) =>
      logWarningUnlessSilent(
        `Index is corrupted: ${e.details ?? e.reason}`,
        options.silent ?? false,
      ).pipe(Effect.map(() => null as NullableResult<T>)),
  }) as const

// ============================================================================
// Embedding Error Handlers
// ============================================================================

/**
 * Create a comprehensive handler for embedding-related errors.
 * Handles API key errors, index errors, embedding errors, and vector store errors.
 * Returns null on failure for graceful degradation.
 *
 * Use this for:
 * - Optional embedding operations (e.g., user prompt in index command)
 * - Auto-index attempts in search command
 * - Any embedding operation that should fall back gracefully
 */
export const createEmbeddingErrorHandler = (
  options: ErrorHandlerOptions = {},
) => {
  const silent = options.silent ?? false

  return {
    // API key errors - user needs to set up API key
    ApiKeyMissingError: (e: ApiKeyMissingError) =>
      logErrorUnlessSilent(`\n${e.message}`, silent).pipe(
        Effect.map(() => null as BuildEmbeddingsResult | null),
      ),
    ApiKeyInvalidError: (e: ApiKeyInvalidError) =>
      logErrorUnlessSilent(`\n${e.message}`, silent).pipe(
        Effect.map(() => null as BuildEmbeddingsResult | null),
      ),
    // Index not found - shouldn't happen after buildIndex but handle gracefully
    IndexNotFoundError: (_e: IndexNotFoundError) =>
      Effect.succeed(null as BuildEmbeddingsResult | null),
    // File system errors
    FileReadError: (e: FileReadError) =>
      logErrorUnlessSilent(
        `\nCannot read index files: ${e.message}`,
        silent,
      ).pipe(Effect.map(() => null as BuildEmbeddingsResult | null)),
    IndexCorruptedError: (e: IndexCorruptedError) =>
      logErrorUnlessSilent(
        `\nIndex is corrupted: ${e.details ?? e.reason}`,
        silent,
      ).pipe(Effect.map(() => null as BuildEmbeddingsResult | null)),
    // Embedding errors - network, rate limit, etc
    EmbeddingError: (e: EmbeddingError) =>
      logErrorUnlessSilent(`\nEmbedding failed: ${e.message}`, silent).pipe(
        Effect.map(() => null as BuildEmbeddingsResult | null),
      ),
    // Vector store errors
    VectorStoreError: (e: VectorStoreError) =>
      logErrorUnlessSilent(`\nVector store error: ${e.message}`, silent).pipe(
        Effect.map(() => null as BuildEmbeddingsResult | null),
      ),
  } as const
}

/**
 * Create a handler for cost estimation errors.
 * Returns null on failure for graceful degradation.
 *
 * NOTE: Use with Effect.catchTags after Effect.map to preserve type:
 * ```typescript
 * const result = yield* operation.pipe(
 *   Effect.map((r): TargetType | null => r),
 *   Effect.catchTags(createCostEstimateErrorHandler())
 * )
 * ```
 */
export const createCostEstimateErrorHandler = (
  options: ErrorHandlerOptions = {},
) =>
  ({
    IndexNotFoundError: (_e: IndexNotFoundError) => Effect.succeed(null),
    FileReadError: (e: FileReadError) =>
      logWarningUnlessSilent(
        `Could not read index files: ${e.message}`,
        options.silent ?? false,
      ).pipe(Effect.map(() => null)),
    IndexCorruptedError: (e: IndexCorruptedError) =>
      logWarningUnlessSilent(
        `Index is corrupted: ${e.details ?? e.reason}`,
        options.silent ?? false,
      ).pipe(Effect.map(() => null)),
  }) as const
