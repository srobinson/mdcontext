/**
 * mdm - Token-efficient markdown analysis for LLMs
 */

// Config utilities for user config files
export type { PartialMdmConfig } from './config/loader.js'
export * from './core/index.js'
export * from './index/index.js'
export * from './parser/index.js'
export * from './utils/index.js'

/**
 * Type-safe configuration helper for mdm.config.ts files.
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'markdown-matters'
 *
 * export default defineConfig({
 *   index: {
 *     maxDepth: 5,
 *   },
 * })
 * ```
 */
export const defineConfig = <
  T extends import('./config/loader.js').PartialMdmConfig,
>(
  config: T,
): T => config
