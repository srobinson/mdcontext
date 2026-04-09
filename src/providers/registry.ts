/**
 * Provider registry.
 *
 * Module-private `Map<ProviderId, ProviderRuntime>`. The default
 * registration is wired by `registerDefaultProviders()` — it is not
 * invoked at module load so test suites and bootstrap code keep
 * control of when the registry is populated.
 *
 * Capability dispatch (`getCapability`) also lives here so that
 * `CapabilityNotSupported` can carry the live list of registered
 * providers that satisfy the requested capability.
 */

import { Effect } from 'effect'
import type { EmbeddingClient } from './capabilities/embed.js'
import type { TextClient } from './capabilities/generate-text.js'
import {
  CapabilityNotSupported,
  MissingApiKey,
  ProviderNotFound,
} from './errors.js'
import type {
  Capability,
  ClientFor,
  ProviderId,
  ProviderRuntime,
} from './runtime.js'
import {
  createEmbedClient,
  createGenerateTextClient,
  getProviderBaseURL,
  OPENAI_COMPATIBLE_PROVIDER_IDS,
  type OpenAICompatibleProviderId,
} from './transports/openai-compatible.js'
import {
  createVoyageEmbedClient,
  getVoyageBaseURL,
} from './transports/voyage.js'

const registry = new Map<ProviderId, ProviderRuntime>()

/**
 * Permissive registration of a default provider can fail when the
 * provider's credential is unset. We capture the `MissingApiKey` here
 * so a subsequent `getProvider(id)` returns the actionable credential
 * error instead of `ProviderNotFound`. Without this map a consumer who
 * pins `provider: 'openrouter'` with `OPENROUTER_API_KEY` unset would
 * see "Provider 'openrouter' is not registered" — which is technically
 * true but tells the user to fix the wrong thing.
 */
const registrationFailures = new Map<ProviderId, MissingApiKey>()

/**
 * Register a provider runtime. Later registrations overwrite earlier
 * ones for the same id and clear any previously recorded credential
 * failure for the same id.
 */
export function registerProvider(runtime: ProviderRuntime): void {
  registry.set(runtime.id, runtime)
  registrationFailures.delete(runtime.id)
}

/**
 * Look up a registered provider runtime by id.
 *
 * Fails with `MissingApiKey` when the id is in the default provider set
 * but was skipped during `registerDefaultProviders` because its
 * credential env var was unset. Falls through to `ProviderNotFound`
 * only when the id is genuinely unknown — typos like `openai-foo` or
 * providers that have not been wired up yet.
 */
export function getProvider(
  id: ProviderId,
): Effect.Effect<ProviderRuntime, ProviderNotFound | MissingApiKey> {
  const runtime = registry.get(id)
  if (runtime !== undefined) {
    return Effect.succeed(runtime)
  }
  const failure = registrationFailures.get(id)
  if (failure !== undefined) {
    return Effect.fail(failure)
  }
  return Effect.fail(
    new ProviderNotFound({
      id,
      known: Array.from(registry.keys()),
    }),
  )
}

/**
 * Resolve a capability client from a runtime.
 *
 * Fails with `CapabilityNotSupported` when the runtime does not expose
 * the requested capability. The failure carries the provider id and
 * the live list of registered providers that DO satisfy the capability,
 * so the CLI boundary surfaces an actionable error of the form:
 *
 *     voyage does not support generateText. Use one of: openai, openrouter, ...
 *
 * The list is computed from the current registry contents on each
 * lookup so test suites that install a custom provider set still see
 * accurate alternatives.
 */
export function getCapability<C extends Capability>(
  runtime: ProviderRuntime,
  capability: C,
): Effect.Effect<ClientFor<C>, CapabilityNotSupported> {
  const client = runtime.capabilities[capability]
  if (client === undefined) {
    return Effect.fail(
      new CapabilityNotSupported({
        provider: runtime.id,
        capability,
        supportedAlternatives: getProvidersForCapability(capability),
      }),
    )
  }
  return Effect.succeed(client as ClientFor<C>)
}

/**
 * Return the registered provider ids whose runtime exposes the given
 * capability, in registration (insertion) order.
 *
 * The runtime is the source of truth for capability availability, so
 * feature-layer consumers that need to present an actionable
 * "use one of" list (for example the HyDE voyage fail-fast in
 * `resolveHydeOptions`) read it from here rather than from a static
 * provider constant. Also used internally by `getCapability` to
 * populate `CapabilityNotSupported.supportedAlternatives`.
 */
export function getProvidersForCapability(
  capability: Capability,
): readonly ProviderId[] {
  return Array.from(registry.values())
    .filter((runtime) => runtime.capabilities[capability] !== undefined)
    .map((runtime) => runtime.id)
}

/**
 * Test helper. Clears both the live registry and the
 * registration-failure map so suites can install a fresh set of
 * providers without leaking state across cases.
 */
export function clearRegistry(): void {
  registry.clear()
  registrationFailures.clear()
}

// ============================================================================
// Default provider wiring
// ============================================================================

/**
 * Register the default provider runtimes: all four OpenAI-compatible
 * providers plus Voyage (embed only). Each provider is registered
 * independently — when an API key is missing for one provider, the
 * runtime still registers the providers whose keys are present.
 *
 * Invoked explicitly by bootstrap code once consumers migrate onto the
 * runtime. Never fails: missing keys produce skipped registrations,
 * not errors. Callers who need a provider that was skipped hit
 * `ProviderNotFound` at lookup time and see the actionable list of
 * known providers in the error message.
 */
export const registerDefaultProviders = (): Effect.Effect<void, never> =>
  Effect.all(
    [
      registerOpenAICompatible('openai'),
      registerOpenAICompatible('openrouter'),
      registerOpenAICompatible('ollama'),
      registerOpenAICompatible('lm-studio'),
      registerVoyage(),
    ],
    { discard: true },
  )

const registerOpenAICompatible = (
  id: OpenAICompatibleProviderId,
): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    const embedResult = yield* Effect.either(createEmbedClient(id))
    const textResult = yield* Effect.either(createGenerateTextClient(id))
    commitProvider(id, getProviderBaseURL(id), embedResult, textResult)
  })

const registerVoyage = (): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    const embedResult = yield* Effect.either(createVoyageEmbedClient())
    commitProvider('voyage', getVoyageBaseURL(), embedResult, {
      _tag: 'Left',
      left: new MissingApiKey({ provider: 'voyage', envVar: 'unused' }),
    })
  })

type EitherResult<A> =
  | { readonly _tag: 'Right'; readonly right: A }
  | { readonly _tag: 'Left'; readonly left: MissingApiKey }

/**
 * Commit a provider runtime to the registry if any capability
 * succeeded. Voyage only ever has `embed`; the `generateText` slot is
 * intentionally left empty so consumers hit `CapabilityNotSupported`
 * rather than a silent fallback.
 *
 * When every capability failed construction we record the credential
 * failure in `registrationFailures` so a later `getProvider(id)`
 * surfaces `MissingApiKey` (the actionable form) rather than
 * `ProviderNotFound` (the misleading form). The two eithers fail with
 * the same `MissingApiKey` for OpenAI-compatible providers because
 * embed and generateText share a single env var, so picking `embed`
 * is arbitrary.
 */
const commitProvider = (
  id: ProviderId,
  baseURL: string | undefined,
  embed: EitherResult<EmbeddingClient>,
  generateText: EitherResult<TextClient>,
): void => {
  if (embed._tag === 'Left' && generateText._tag === 'Left') {
    registrationFailures.set(id, embed.left)
    return
  }
  const capabilities: ProviderRuntime['capabilities'] = {
    ...(embed._tag === 'Right' ? { embed: embed.right } : {}),
    ...(generateText._tag === 'Right'
      ? { generateText: generateText.right }
      : {}),
  }
  registerProvider({
    id,
    ...(baseURL !== undefined ? { baseURL } : {}),
    capabilities,
  })
}

/**
 * Provider ids this registry knows how to wire up when
 * `registerDefaultProviders` is called. Exposed so tests and bootstrap
 * code can iterate the full set.
 */
export const DEFAULT_PROVIDER_IDS: readonly ProviderId[] = [
  ...OPENAI_COMPATIBLE_PROVIDER_IDS,
  'voyage',
]
