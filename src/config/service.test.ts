/**
 * ConfigService Effect Layer Tests
 *
 * ALP-1311: ConfigService Effect layer injection tests.
 */

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { defaultConfig } from './schema.js'
import {
  ConfigService,
  ConfigServiceDefault,
  ConfigServiceLive,
  getConfig,
  getConfigSection,
  getConfigValue,
  makeConfigLayer,
  makeConfigLayerPartial,
} from './service.js'

describe('ConfigService layers', () => {
  it('ConfigServiceDefault provides compiled defaults', async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* ConfigService
      }).pipe(Effect.provide(ConfigServiceDefault)),
    )
    expect(result.index.maxDepth).toBe(defaultConfig.index.maxDepth)
    expect(result.embeddings.provider).toBe(defaultConfig.embeddings.provider)
    expect(result.output.format).toBe(defaultConfig.output.format)
  })

  it('ConfigServiceLive provides a MdmConfig', async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* ConfigService
      }).pipe(Effect.provide(ConfigServiceLive)),
    )
    expect(result.index).toBeDefined()
    expect(result.search).toBeDefined()
    expect(result.embeddings).toBeDefined()
  })

  it('makeConfigLayer provides custom config', async () => {
    const custom = {
      ...defaultConfig,
      index: { ...defaultConfig.index, maxDepth: 99 },
    }
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* ConfigService
      }).pipe(Effect.provide(makeConfigLayer(custom))),
    )
    expect(result.index.maxDepth).toBe(99)
  })

  it('makeConfigLayerPartial merges partial with defaults', async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* ConfigService
      }).pipe(
        Effect.provide(
          makeConfigLayerPartial({ search: { defaultLimit: 42 } }),
        ),
      ),
    )
    expect(result.search.defaultLimit).toBe(42)
    expect(result.search.maxLimit).toBe(defaultConfig.search.maxLimit)
  })

  it('makeConfigLayerPartial({}) behaves like ConfigServiceDefault', async () => {
    const fromPartial = await Effect.runPromise(
      getConfig.pipe(Effect.provide(makeConfigLayerPartial({}))),
    )
    const fromDefault = await Effect.runPromise(
      getConfig.pipe(Effect.provide(ConfigServiceDefault)),
    )
    expect(fromPartial).toEqual(fromDefault)
  })

  it('fails when layer is missing', async () => {
    // ConfigService is a Context.Tag; accessing it without providing the layer
    // causes a defect. We verify this by catching the thrown error.
    let threw = false
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          return yield* ConfigService
        }) as Effect.Effect<unknown, never, never>,
      )
    } catch {
      threw = true
    }
    expect(threw).toBe(true)
  })

  it('two separate programs see their own config', async () => {
    const layer1 = makeConfigLayer({
      ...defaultConfig,
      index: { ...defaultConfig.index, maxDepth: 1 },
    })
    const layer2 = makeConfigLayer({
      ...defaultConfig,
      index: { ...defaultConfig.index, maxDepth: 2 },
    })

    const [r1, r2] = await Promise.all([
      Effect.runPromise(getConfig.pipe(Effect.provide(layer1))),
      Effect.runPromise(getConfig.pipe(Effect.provide(layer2))),
    ])

    expect(r1.index.maxDepth).toBe(1)
    expect(r2.index.maxDepth).toBe(2)
  })
})

describe('helper functions', () => {
  it('getConfig returns full config', async () => {
    const result = await Effect.runPromise(
      getConfig.pipe(Effect.provide(ConfigServiceDefault)),
    )
    expect(result).toEqual(defaultConfig)
  })

  it('getConfigSection returns a section', async () => {
    const result = await Effect.runPromise(
      getConfigSection('index').pipe(Effect.provide(ConfigServiceDefault)),
    )
    expect(result.maxDepth).toBe(defaultConfig.index.maxDepth)
  })

  it('getConfigValue returns a specific value', async () => {
    const result = await Effect.runPromise(
      getConfigValue('search', 'defaultLimit').pipe(
        Effect.provide(ConfigServiceDefault),
      ),
    )
    expect(result).toBe(defaultConfig.search.defaultLimit)
  })
})
