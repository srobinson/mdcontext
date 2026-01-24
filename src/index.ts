/**
 * mdcontext - Token-efficient markdown analysis for LLMs
 */

// Config utilities for user config files
export type { PartialMdContextConfig } from './config/service.js'
export * from './core/index.js'
export * from './index/index.js'
export * from './parser/index.js'
export * from './utils/index.js'

/**
 * Type-safe configuration helper for mdcontext.config.ts files.
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'mdcontext'
 *
 * export default defineConfig({
 *   index: {
 *     maxDepth: 5,
 *   },
 * })
 * ```
 */
export const defineConfig = <
  T extends import('./config/service.js').PartialMdContextConfig,
>(
  config: T,
): T => config
