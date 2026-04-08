/**
 * Provider registry.
 *
 * Module-private `Map<ProviderId, ProviderRuntime>`. Empty at scaffold
 * time; transport implementations register themselves as they are
 * brought onto the runtime in later sub-issues.
 */

import { Effect } from 'effect'
import { ProviderNotFound } from './errors.js'
import type { ProviderId, ProviderRuntime } from './runtime.js'

const registry = new Map<ProviderId, ProviderRuntime>()

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
 * Fails with `ProviderNotFound` when the id has not been registered.
 */
export function getProvider(
  id: ProviderId,
): Effect.Effect<ProviderRuntime, ProviderNotFound> {
  const runtime = registry.get(id)
  if (runtime === undefined) {
    return Effect.fail(
      new ProviderNotFound({
        id,
        known: Array.from(registry.keys()),
      }),
    )
  }
  return Effect.succeed(runtime)
}

/**
 * Test helper. Clears the registry so suites can install a fresh set
 * of providers without leaking state across cases.
 */
export function clearRegistry(): void {
  registry.clear()
}
