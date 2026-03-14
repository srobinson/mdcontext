/**
 * ConfigService Layer
 *
 * Wraps configuration in an Effect Context.Tag and Layer, enabling
 * dependency injection throughout the application. Services access
 * config via `yield* ConfigService` rather than direct function parameters.
 *
 * The config is loaded once via loader.load() and injected as a concrete value.
 * No ConfigProvider intermediary, no string serialisation.
 */

import { Context, Effect, Layer } from 'effect'
import type { LoadOptions, PartialMdmConfig } from './loader.js'
import { load } from './loader.js'
import type { MdmConfig } from './schema.js'
import { defaultConfig } from './schema.js'

// ============================================================================
// Service Definition
// ============================================================================

/**
 * ConfigService provides access to the application configuration.
 *
 * Use this service to access configuration values throughout the application.
 * The service is provided via a Layer, enabling different configurations
 * for production, testing, and development environments.
 */
export class ConfigService extends Context.Tag('ConfigService')<
  ConfigService,
  MdmConfig
>() {}

// ============================================================================
// Layer Implementations
// ============================================================================

/**
 * Live ConfigService layer that loads configuration using the full
 * precedence chain: CLI > env vars > config file > defaults.
 *
 * Calls loader.load() synchronously at layer construction time.
 */
export const ConfigServiceLive: Layer.Layer<ConfigService> = Layer.sync(
  ConfigService,
  () => load(),
)

/**
 * Create a ConfigService layer with a custom configuration object.
 */
export const makeConfigLayer = (
  config: MdmConfig,
): Layer.Layer<ConfigService> => Layer.succeed(ConfigService, config)

/**
 * Default ConfigService layer with all default values.
 */
export const ConfigServiceDefault: Layer.Layer<ConfigService> =
  makeConfigLayer(defaultConfig)

/**
 * Create a ConfigService layer from load options.
 * Calls loader.load() with the given options.
 */
export const makeConfigLayerFromOptions = (
  options: LoadOptions,
): Layer.Layer<ConfigService> => Layer.sync(ConfigService, () => load(options))

/**
 * Create a ConfigService layer from partial configuration.
 * Merges the partial config with defaults.
 */
export const makeConfigLayerPartial = (
  partial: PartialMdmConfig,
): Layer.Layer<ConfigService> =>
  Layer.sync(ConfigService, () =>
    load({ fileConfig: partial, skipConfigFile: true, skipEnv: true }),
  )

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Access the full configuration object.
 */
export const getConfig: Effect.Effect<MdmConfig, never, ConfigService> =
  ConfigService

/**
 * Access a specific section of the configuration.
 */
export const getConfigSection = <K extends keyof MdmConfig>(
  section: K,
): Effect.Effect<MdmConfig[K], never, ConfigService> =>
  Effect.map(ConfigService, (config) => config[section])

/**
 * Access a specific value from the configuration.
 */
export const getConfigValue = <
  K extends keyof MdmConfig,
  V extends keyof MdmConfig[K],
>(
  section: K,
  key: V,
): Effect.Effect<MdmConfig[K][V], never, ConfigService> =>
  Effect.map(ConfigService, (config) => config[section][key])
