/**
 * Use-case-agnostic provider runtime.
 *
 * Public surface: runtime types, capability contracts, registry, and
 * core errors. Consumers (embeddings, HyDE, rerank) import from this
 * barrel rather than reaching into submodules.
 */

// Embed capability
export type {
  EmbeddingClient,
  EmbeddingResult,
  EmbedOptions,
} from './capabilities/embed.js'
export { EmbeddingError } from './capabilities/embed.js'
// Generate-text capability
export type {
  GenerateTextOptions,
  TextClient,
  TextGenerationResult,
} from './capabilities/generate-text.js'
export { TextGenerationError } from './capabilities/generate-text.js'
// Rerank capability (typed slot only)
export type {
  RerankClient,
  RerankOptions,
  RerankResult,
  RerankScore,
} from './capabilities/rerank.js'
export { RerankError } from './capabilities/rerank.js'
// Core errors
export {
  CapabilityNotSupported,
  MissingApiKey,
  ProviderNotFound,
} from './errors.js'
// Pricing lookup
export {
  checkPricingFreshness,
  getPricingDate,
  lookupPricing,
  type ModelPricing,
} from './pricing.js'
// Registry and capability dispatch
export {
  clearRegistry,
  DEFAULT_PROVIDER_IDS,
  getCapability,
  getProvider,
  getProvidersForCapability,
  registerDefaultProviders,
  registerProvider,
} from './registry.js'
// Runtime entry point (capability resolution with optional overrides)
export { resolveClient } from './resolve-client.js'
// Runtime types
export type {
  Capability,
  ClientFor,
  ProviderId,
  ProviderRuntime,
} from './runtime.js'
// Transports
//
// `createEmbedClient` and `createGenerateTextClient` are intentionally
// NOT re-exported here. After the ALP-1709 refactor the transport
// factories are an implementation detail of the runtime boundary:
// the only code that legitimately calls them is `registry.ts` (for
// default registration) and `resolve-client.ts` (for the override
// path), both of which import from `./transports/openai-compatible.js`
// directly. Consumers route through `resolveClient` so they cannot
// accidentally bypass the registry fast path or the `MissingApiKey`
// remap by reaching into the transport layer.
export {
  type ClientOverrides,
  getEffectiveBaseURL,
  getProviderBaseURL,
  getProviderEnvVar,
  hasAnyRemoteApiKey,
  inferProviderFromUrl,
  OPENAI_COMPATIBLE_PROVIDER_IDS,
  type OpenAICompatibleProviderId,
} from './transports/openai-compatible.js'
export {
  createVoyageEmbedClient,
  getVoyageBaseURL,
} from './transports/voyage.js'
