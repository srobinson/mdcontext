/**
 * Resolve effective HyDE options from a `SemanticSearchOptions` shape.
 *
 * Lives at the feature layer (not inside `semantic-search.ts` and not
 * inside the runtime) because the inheritance rule is specific to how
 * the embedding side and the HyDE side relate. The runtime stays
 * use-case agnostic; this helper owns the cross-cutting precedence
 * decision.
 */

import { Effect } from 'effect'
import {
  CapabilityNotSupported,
  getProvidersForCapability,
  type OpenAICompatibleProviderId,
} from '../providers/index.js'
import type { HydeOptions } from './hyde.js'
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
 * Voyage cannot serve chat completions. When the embedding side is voyage
 * and the user did not pin a HyDE provider explicitly, this fails fast
 * with `CapabilityNotSupported` rather than silently substituting openai.
 * The previous silent fallback was a footgun: a caller running with only
 * `VOYAGE_API_KEY` set would crash inside HyDE with `OPENAI_API_KEY is
 * not set`, hiding the real cause behind a misleading error.
 */
export const resolveHydeOptions = (
  options: SemanticSearchOptions,
): Effect.Effect<HydeOptions, CapabilityNotSupported> =>
  Effect.gen(function* () {
    const hydeOptions = options.hydeOptions
    const embeddingProviderName = options.providerConfig?.provider

    // Voyage embedding + no explicit HyDE provider = fail fast.
    // The HyDE provider type already excludes voyage, so the explicit
    // override path (hydeOptions.provider !== undefined) cannot land
    // on voyage and is allowed through.
    if (
      embeddingProviderName === 'voyage' &&
      hydeOptions?.provider === undefined
    ) {
      return yield* Effect.fail(
        new CapabilityNotSupported({
          provider: 'voyage',
          capability: 'generateText',
          supportedAlternatives: getProvidersForCapability('generateText'),
        }),
      )
    }

    const inheritedProvider: OpenAICompatibleProviderId | undefined =
      embeddingProviderName === 'voyage' ? undefined : embeddingProviderName

    const provider: OpenAICompatibleProviderId =
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
  })
