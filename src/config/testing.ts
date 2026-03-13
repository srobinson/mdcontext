/**
 * Configuration Testing Utilities
 *
 * Provides helpers for testing code that depends on ConfigService.
 * Use these utilities to create isolated test environments without
 * environment pollution.
 */

import { Effect, Layer } from 'effect'
import type { PartialMdmConfig } from './loader.js'
import { defaultConfig } from './schema.js'
import { ConfigService, makeConfigLayerPartial } from './service.js'

/**
 * Default test configuration layer.
 * Uses all default values.
 */
export const TestConfigLayer: Layer.Layer<ConfigService> = Layer.succeed(
  ConfigService,
  defaultConfig,
)

/**
 * Create a test config layer with specific overrides.
 */
export const withTestConfig = (
  overrides: PartialMdmConfig,
): Layer.Layer<ConfigService> => makeConfigLayerPartial(overrides)

/**
 * Run an Effect with a specific configuration.
 */
export const runWithConfig = <A, E>(
  effect: Effect.Effect<A, E, ConfigService>,
  config?: PartialMdmConfig,
): Promise<A> => {
  const layer = config ? withTestConfig(config) : TestConfigLayer
  return Effect.runPromise(effect.pipe(Effect.provide(layer)))
}

/**
 * Run an Effect with a specific configuration synchronously.
 */
export const runWithConfigSync = <A, E>(
  effect: Effect.Effect<A, E, ConfigService>,
  config?: PartialMdmConfig,
): A => {
  const layer = config ? withTestConfig(config) : TestConfigLayer
  return Effect.runSync(effect.pipe(Effect.provide(layer)))
}
