/**
 * Provider registry.
 *
 * Module-private `Map<ProviderId, ProviderRuntime>`. The default
 * registration is wired by `registerDefaultProviders()` — it is not
 * invoked at module load so test suites and bootstrap code keep
 * control of when the registry is populated.
 */

import { Effect } from 'effect'
import type { EmbeddingClient } from './capabilities/embed.js'
import type { TextClient } from './capabilities/generate-text.js'
import { MissingApiKey, ProviderNotFound } from './errors.js'
import type { ProviderId, ProviderRuntime } from './runtime.js'
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
 * Providers whose construction was attempted by `registerDefaultProviders`
 * but produced a `MissingApiKey` error for every capability. Tracked so
 * `getProvider` can surface the actionable "Set X_API_KEY" message instead
 * of the opaque "Provider not found" message for known-but-unconfigured
 * providers.
 */
const registrationFailures = new Map<ProviderId, MissingApiKey>()

/**
 * Register a provider runtime. Later registrations overwrite earlier
 * ones for the same id.
 */
export function registerProvider(runtime: ProviderRuntime): void {
  registry.set(runtime.id, runtime)
}

/**
 * Look up a registered provider runtime by id.
 *
 * Fails with `MissingApiKey` when the provider is known to the registry
 * but failed to construct because its API key is unset. Fails with
 * `ProviderNotFound` when the id is unknown entirely.
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
 * Test helper. Clears the registry so suites can install a fresh set
 * of providers without leaking state across cases. Also clears any
 * tracked registration failures.
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
 */
const commitProvider = (
  id: ProviderId,
  baseURL: string | undefined,
  embed: EitherResult<EmbeddingClient>,
  generateText: EitherResult<TextClient>,
): void => {
  if (embed._tag === 'Left' && generateText._tag === 'Left') {
    // Every capability failed construction. Track the failure so
    // `getProvider` can return the actionable `MissingApiKey` error
    // instead of the opaque `ProviderNotFound`. Prefer the embed-side
    // error because it carries the real env var name; for Voyage the
    // generateText slot is a synthetic placeholder.
    registrationFailures.set(id, embed.left)
    return
  }
  // Clear any stale failure from a previous registration attempt.
  registrationFailures.delete(id)
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
