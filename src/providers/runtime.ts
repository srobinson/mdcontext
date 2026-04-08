/**
 * Provider runtime types and capability dispatch.
 *
 * `ProviderRuntime` is the use-case-agnostic surface every provider
 * implementation hands back to the registry. Consumers dispatch through
 * `getCapability`, which fails fast with `CapabilityNotSupported` when
 * the requested slot is empty.
 */

import { Effect } from 'effect'
import type { EmbeddingClient } from './capabilities/embed.js'
import type { TextClient } from './capabilities/generate-text.js'
import type { RerankClient } from './capabilities/rerank.js'
import { CapabilityNotSupported } from './errors.js'

export type ProviderId =
  | 'openai'
  | 'openrouter'
  | 'ollama'
  | 'lm-studio'
  | 'voyage'

export type Capability = 'embed' | 'generateText' | 'rerank'

export interface ProviderRuntime {
  readonly id: ProviderId
  readonly baseURL?: string
  readonly capabilities: {
    readonly embed?: EmbeddingClient
    readonly generateText?: TextClient
    readonly rerank?: RerankClient
  }
}

type ClientFor<C extends Capability> = C extends 'embed'
  ? EmbeddingClient
  : C extends 'generateText'
    ? TextClient
    : C extends 'rerank'
      ? RerankClient
      : never

/**
 * Resolve a capability client from a runtime.
 *
 * Fails with `CapabilityNotSupported` when the runtime does not expose
 * the requested capability. The failure carries the provider id so
 * callers can surface an actionable error at the CLI boundary.
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
        supportedAlternatives: [],
      }),
    )
  }
  return Effect.succeed(client as ClientFor<C>)
}
