/**
 * Resolve effective HyDE options from a `SemanticSearchOptions` shape.
 *
 * Lives at the feature layer (not inside `semantic-search.ts` and not
 * inside the runtime) because the inheritance rule is specific to how
 * the embedding side and the HyDE side relate. The runtime stays
 * use-case agnostic; this helper owns the cross-cutting precedence
 * decision.
 */

import type { HydeOptions, HydeProviderName } from './hyde.js'
import type { SemanticSearchOptions } from './types.js'

/**
 * Resolve the effective HyDE options for a given search call.
 *
 * Precedence (highest first):
 *  1. `options.hydeOptions.*` explicit overrides (provider, baseURL, apiKey,
 *     systemPrompt, model, maxTokens, temperature).
 *  2. The embedding-side `options.providerConfig` for the carry-across
 *     fields (`provider`, `baseURL`). The embedding-side `apiKey` is not
 *     exposed publicly and is intentionally not consulted here, see notes
 *     in the docs for {@link SemanticSearchOptions.hydeOptions}.
 *  3. Per-provider defaults inside {@link generateHypotheticalDocument}.
 *
 * Voyage cannot serve chat completions, so when the embedding side is voyage
 * and `hydeOptions.provider` is unset, the resolved provider falls back to
 * `'openai'`. Callers that hit this fallback see a debug log emitted from
 * `prepareSearchPipeline` so the substitution is observable.
 *
 * Returns the object that should be passed verbatim to
 * `generateHypotheticalDocument`.
 */
export const resolveHydeOptions = (
  options: SemanticSearchOptions,
): HydeOptions => {
  const hydeOptions = options.hydeOptions
  const embeddingProviderName = options.providerConfig?.provider

  // Voyage embedding side cannot serve chat, fall back to openai unless the
  // user explicitly pinned a HyDE provider.
  const inheritedProvider: HydeProviderName | undefined =
    embeddingProviderName === 'voyage' ? undefined : embeddingProviderName

  const provider: HydeProviderName =
    hydeOptions?.provider ?? inheritedProvider ?? 'openai'

  // Inherit the embedding-side baseURL whenever the resolved HyDE provider
  // matches the embedding provider. This covers both the implicit case
  // (HyDE inherits the provider) and the explicit case (the caller pins
  // HyDE to the same provider as the embedding side and expects the
  // custom baseURL to carry across — fixes finding #2).
  const inheritedBaseURL =
    inheritedProvider !== undefined && inheritedProvider === provider
      ? options.providerConfig?.baseURL
      : undefined

  return {
    provider,
    baseURL: hydeOptions?.baseURL ?? inheritedBaseURL,
    apiKey: hydeOptions?.apiKey,
    systemPrompt: hydeOptions?.systemPrompt,
    model: hydeOptions?.model,
    maxTokens: hydeOptions?.maxTokens,
    temperature: hydeOptions?.temperature,
  }
}
