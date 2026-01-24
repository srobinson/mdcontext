/**
 * Testing Utilities Unit Tests
 *
 * Tests for the config testing utilities that make it easy to test
 * code that depends on ConfigService.
 */

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { defaultConfig } from './schema.js'
import { ConfigService } from './service.js'
import {
  runWithConfig,
  runWithConfigSync,
  TestConfigLayer,
  withTestConfig,
} from './testing.js'

describe('Testing Utilities', () => {
  describe('TestConfigLayer', () => {
    it('should provide default configuration values', async () => {
      const program = Effect.gen(function* () {
        return yield* ConfigService
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestConfigLayer)),
      )

      expect(result).toEqual(defaultConfig)
    })

    it('should be suitable for most tests', async () => {
      const program = Effect.gen(function* () {
        const config = yield* ConfigService
        return config.index.maxDepth
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestConfigLayer)),
      )

      expect(result).toBe(10)
    })
  })

  describe('withTestConfig', () => {
    it('should override specific values', async () => {
      const layer = withTestConfig({
        index: { maxDepth: 5 },
      })

      const program = Effect.gen(function* () {
        const config = yield* ConfigService
        return config.index.maxDepth
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer)),
      )

      expect(result).toBe(5)
    })

    it('should preserve defaults for unspecified values', async () => {
      const layer = withTestConfig({
        index: { maxDepth: 5 },
      })

      const program = Effect.gen(function* () {
        const config = yield* ConfigService
        return {
          maxDepth: config.index.maxDepth,
          excludePatterns: config.index.excludePatterns,
          defaultLimit: config.search.defaultLimit,
        }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer)),
      )

      expect(result.maxDepth).toBe(5)
      expect(result.excludePatterns).toEqual([
        'node_modules',
        '.git',
        'dist',
        'build',
      ])
      expect(result.defaultLimit).toBe(10)
    })

    it('should allow overriding multiple sections', async () => {
      const layer = withTestConfig({
        index: { maxDepth: 5 },
        output: { debug: true, verbose: true },
        search: { defaultLimit: 20 },
      })

      const program = Effect.gen(function* () {
        const config = yield* ConfigService
        return {
          maxDepth: config.index.maxDepth,
          debug: config.output.debug,
          verbose: config.output.verbose,
          defaultLimit: config.search.defaultLimit,
        }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer)),
      )

      expect(result.maxDepth).toBe(5)
      expect(result.debug).toBe(true)
      expect(result.verbose).toBe(true)
      expect(result.defaultLimit).toBe(20)
    })
  })

  describe('runWithConfig', () => {
    it('should run effect with default config when no overrides provided', async () => {
      const program = Effect.gen(function* () {
        const config = yield* ConfigService
        return config.index.maxDepth
      })

      const result = await runWithConfig(program)

      expect(result).toBe(10)
    })

    it('should run effect with custom config overrides', async () => {
      const program = Effect.gen(function* () {
        const config = yield* ConfigService
        return config.index.maxDepth
      })

      const result = await runWithConfig(program, { index: { maxDepth: 5 } })

      expect(result).toBe(5)
    })

    it('should work with complex effects', async () => {
      const program = Effect.gen(function* () {
        const config = yield* ConfigService
        return config.index.maxDepth > 5 ? 'deep' : 'shallow'
      })

      const deepResult = await runWithConfig(program, {
        index: { maxDepth: 10 },
      })
      const shallowResult = await runWithConfig(program, {
        index: { maxDepth: 3 },
      })

      expect(deepResult).toBe('deep')
      expect(shallowResult).toBe('shallow')
    })
  })

  describe('runWithConfigSync', () => {
    it('should run effect synchronously with default config', () => {
      const program = Effect.gen(function* () {
        const config = yield* ConfigService
        return config.index.maxDepth
      })

      const result = runWithConfigSync(program)

      expect(result).toBe(10)
    })

    it('should run effect synchronously with custom config', () => {
      const program = Effect.gen(function* () {
        const config = yield* ConfigService
        return config.index.maxDepth
      })

      const result = runWithConfigSync(program, { index: { maxDepth: 5 } })

      expect(result).toBe(5)
    })

    it('should work with pure computations', () => {
      const program = Effect.gen(function* () {
        const config = yield* ConfigService
        const depth = config.index.maxDepth
        const limit = config.search.defaultLimit
        return depth * limit
      })

      const result = runWithConfigSync(program, {
        index: { maxDepth: 5 },
        search: { defaultLimit: 20 },
      })

      expect(result).toBe(100)
    })
  })

  describe('real-world usage patterns', () => {
    it('should enable testing services that depend on config', async () => {
      const indexService = Effect.gen(function* () {
        const config = yield* ConfigService
        return {
          shouldIndex: (depth: number) => depth <= config.index.maxDepth,
          patterns: config.index.excludePatterns,
        }
      })

      const testLayer = withTestConfig({ index: { maxDepth: 3 } })

      const service = await Effect.runPromise(
        indexService.pipe(Effect.provide(testLayer)),
      )

      expect(service.shouldIndex(2)).toBe(true)
      expect(service.shouldIndex(3)).toBe(true)
      expect(service.shouldIndex(4)).toBe(false)
    })

    it('should support parameterized tests', async () => {
      const program = Effect.gen(function* () {
        const config = yield* ConfigService
        return config.output.format
      })

      const textResult = await runWithConfig(program, {
        output: { format: 'text' },
      })
      const jsonResult = await runWithConfig(program, {
        output: { format: 'json' },
      })

      expect(textResult).toBe('text')
      expect(jsonResult).toBe('json')
    })

    it('should allow testing error conditions', async () => {
      const validateConfig = Effect.gen(function* () {
        const config = yield* ConfigService
        if (
          config.search.minSimilarity < 0 ||
          config.search.minSimilarity > 1
        ) {
          return yield* Effect.fail('Invalid similarity range')
        }
        return config.search.minSimilarity
      })

      const validResult = await runWithConfig(validateConfig, {
        search: { minSimilarity: 0.5 },
      })
      expect(validResult).toBe(0.5)

      const invalidLayer = withTestConfig({ search: { minSimilarity: 1.5 } })
      const invalidProgram = validateConfig.pipe(Effect.provide(invalidLayer))
      const invalidResult = await Effect.runPromiseExit(invalidProgram)

      expect(invalidResult._tag).toBe('Failure')
    })
  })
})
