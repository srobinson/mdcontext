/**
 * Consumer-side bridge from the provider runtime to consumer error
 * types. Resolves a capability client for a given provider id, honoring
 * per-call `baseURL` / `apiKey` overrides while keeping the runtime's
 * registry path as the fast default.
 *
 * Shared by `embed-batched.ts:createEmbeddingClient` and
 * `hyde.ts:createHydeClient` so both consumers use an identical
 * resolution mechanism. Adding a third consumer (e.g. rerank) should
 * go through this helper rather than reinventing the fast-path /
 * override-path split.
 *
 * No overrides → registry fast path: returns the client registered at
 * startup via `registerDefaultProviders()`. The registry must have
 * been bootstrapped or callers hit `ProviderNotFound`;
 * `CapabilityNotSupported` surfaces when the provider exists but lacks
 * the requested capability.
 *
 * Overrides present → bypass the registered static client and
 * construct a fresh one through the openai-compatible transport so the
 * caller's `baseURL` / `apiKey` reach the underlying SDK. Voyage falls
 * through to the registry fast path even when overrides are supplied
 * because the override contract is openai-compatible only.
 *
 * Both paths funnel `MissingApiKey` through a consumer-layer remap so
 * the surfaced error is `ApiKeyMissingError` regardless of code path.
 */

import { Effect } from 'effect'
import { ApiKeyMissingError } from '../errors/index.js'
import {
  type Capability,
  type CapabilityNotSupported,
  type ClientFor,
  type ClientOverrides,
  getCapability,
  getProvider,
  type MissingApiKey,
  type OpenAICompatibleProviderId,
  type ProviderId,
  type ProviderNotFound,
} from '../providers/index.js'

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
 * Resolve a capability client for the given provider id.
 *
 * See the module header for the full contract. The
 * `createTransportClient` parameter is the openai-compatible transport
 * factory for the requested capability (`createEmbedClient` for
 * `embed`, `createGenerateTextClient` for `generateText`). It is only
 * invoked on the override path; the registry path uses the
 * pre-registered client.
 */
export const resolveCapabilityClient = <C extends Capability>(
  id: ProviderId,
  capability: C,
  createTransportClient: (
    id: OpenAICompatibleProviderId,
    overrides?: ClientOverrides,
  ) => Effect.Effect<ClientFor<C>, MissingApiKey>,
  overrides?: ClientOverrides,
): Effect.Effect<
  ClientFor<C>,
  ApiKeyMissingError | CapabilityNotSupported | ProviderNotFound
> => {
  if (hasOverrides(overrides) && isOpenAICompatible(id)) {
    return createTransportClient(id, overrides).pipe(
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
