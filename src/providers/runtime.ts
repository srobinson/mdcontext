/**
 * Provider runtime types.
 *
 * `ProviderRuntime` is the use-case-agnostic surface every provider
 * implementation hands back to the registry. Capability dispatch lives
 * in `registry.ts` because the supported-alternatives list on
 * `CapabilityNotSupported` is derived from the registry contents.
 */

import type { EmbeddingClient } from './capabilities/embed.js'
import type { TextClient } from './capabilities/generate-text.js'
import type { RerankClient } from './capabilities/rerank.js'

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

export type ClientFor<C extends Capability> = C extends 'embed'
  ? EmbeddingClient
  : C extends 'generateText'
    ? TextClient
    : C extends 'rerank'
      ? RerankClient
      : never
