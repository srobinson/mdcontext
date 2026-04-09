/**
 * Runtime-layer entry point for capability client resolution.
 *
 * `resolveClient(capability, id, overrides?)` is the single surface
 * consumers use to obtain a typed client for a capability on a
 * provider. Lives under `src/providers/` so all provider dispatch —
 * registry lookup, OpenAI-compatible narrowing, transport override
 * construction, and the `MissingApiKey` → `ApiKeyMissingError` remap —
 * stays inside the runtime boundary. Consumer modules must not reach
 * into `./transports/` or `./registry.js` directly for the purpose of
 * resolving a client; they import `resolveClient` and hand off the
 * capability, provider id, and optional per-call overrides.
 *
 * No overrides → registry fast path: returns the pre-registered
 * client created at startup via `registerDefaultProviders()`.
 * Callers see `ProviderNotFound` if the registry was never
 * bootstrapped and `CapabilityNotSupported` if the provider exists
 * but lacks the requested capability.
 *
 * Overrides present AND provider is OpenAI-compatible AND capability
 * has a transport factory → bypass the registered static client and
 * construct a fresh one through the openai-compatible transport so
 * the caller's `baseURL` / `apiKey` reach the underlying SDK. Voyage
 * and `rerank` fall through to the registry fast path even when
 * overrides are supplied because neither is served by the
 * openai-compatible transport.
 *
 * Both paths funnel `MissingApiKey` through the same remap so the
 * surfaced error is `ApiKeyMissingError` regardless of code path.
 */

import { Effect } from 'effect'
import { ApiKeyMissingError } from '../errors/index.js'
import type {
  CapabilityNotSupported,
  MissingApiKey,
  ProviderNotFound,
} from './errors.js'
import { getCapability, getProvider } from './registry.js'
import type { Capability, ClientFor, ProviderId } from './runtime.js'
import {
  type ClientOverrides,
  createEmbedClient,
  createGenerateTextClient,
  type OpenAICompatibleProviderId,
} from './transports/openai-compatible.js'

/**
 * Translate the runtime `MissingApiKey` into the centralized
 * `ApiKeyMissingError` so the CLI error handler keeps producing the
 * same actionable "Set X_API_KEY" suggestions regardless of which
 * code path raised the failure.
 */
const remapMissingApiKey = (
  e: MissingApiKey,
): Effect.Effect<never, ApiKeyMissingError> =>
  Effect.fail(
    new ApiKeyMissingError({ provider: e.provider, envVar: e.envVar }),
  )

const hasOverrides = (overrides: ClientOverrides | undefined): boolean =>
  overrides?.baseURL !== undefined || overrides?.apiKey !== undefined

const isOpenAICompatible = (id: ProviderId): id is OpenAICompatibleProviderId =>
  id !== 'voyage'

/**
 * Capabilities served by the openai-compatible transport. `rerank` has
 * no transport today, so override requests for `rerank` fall through
 * to the registry fast path.
 */
type OverrideCapability = Exclude<Capability, 'rerank'>

const OVERRIDE_FACTORIES = {
  embed: createEmbedClient,
  generateText: createGenerateTextClient,
} as const satisfies {
  readonly [C in OverrideCapability]: (
    id: OpenAICompatibleProviderId,
    overrides?: ClientOverrides,
  ) => Effect.Effect<ClientFor<C>, MissingApiKey>
}

const isOverrideCapability = (
  capability: Capability,
): capability is OverrideCapability =>
  capability === 'embed' || capability === 'generateText'

/**
 * Resolve a capability client for the given provider id.
 *
 * See the module header for the full contract. Consumers call this
 * with the capability they need and any per-call overrides; the
 * runtime handles registry-vs-transport dispatch internally.
 */
export const resolveClient = <C extends Capability>(
  capability: C,
  id: ProviderId,
  overrides?: ClientOverrides,
): Effect.Effect<
  ClientFor<C>,
  ApiKeyMissingError | CapabilityNotSupported | ProviderNotFound
> => {
  if (
    hasOverrides(overrides) &&
    isOpenAICompatible(id) &&
    isOverrideCapability(capability)
  ) {
    // The union `Effect.Effect<EmbeddingClient, ...> |
    // Effect.Effect<TextClient, ...>` returned by indexing
    // `OVERRIDE_FACTORIES[capability]` confuses `.pipe`: TypeScript
    // cannot narrow the generic `C` back through a runtime indexed
    // access. The cast collapses the union into the caller's
    // requested `ClientFor<C>` so the rest of the pipeline stays
    // type-safe. `isOverrideCapability` proves the key is valid;
    // `isOpenAICompatible` proves the provider id is valid.
    const factory = OVERRIDE_FACTORIES[capability] as (
      id: OpenAICompatibleProviderId,
      overrides?: ClientOverrides,
    ) => Effect.Effect<ClientFor<C>, MissingApiKey>
    return factory(id, overrides).pipe(
      Effect.catchTag('MissingApiKey', remapMissingApiKey),
    )
  }
  return Effect.gen(function* () {
    const runtime = yield* getProvider(id).pipe(
      Effect.catchTag('MissingApiKey', remapMissingApiKey),
    )
    return yield* getCapability(runtime, capability)
  })
}
