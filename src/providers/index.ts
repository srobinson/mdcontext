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
// Registry
export {
  clearRegistry,
  DEFAULT_PROVIDER_IDS,
  getProvider,
  registerDefaultProviders,
  registerProvider,
} from './registry.js'
// Runtime types and dispatch
export type {
  Capability,
  ProviderId,
  ProviderRuntime,
} from './runtime.js'
export { getCapability } from './runtime.js'
// Transports
export {
  createEmbedClient,
  createGenerateTextClient,
  getProviderBaseURL,
  inferProviderFromUrl,
  OPENAI_COMPATIBLE_PROVIDER_IDS,
  type OpenAICompatibleProviderId,
} from './transports/openai-compatible.js'
export {
  createVoyageEmbedClient,
  getVoyageBaseURL,
} from './transports/voyage.js'
