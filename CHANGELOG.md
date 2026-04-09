# markdown-matters

## Unreleased

### Breaking Changes

* The OpenRouter provider no longer accepts `OPENAI_API_KEY` as a fallback credential. Selecting `provider: 'openrouter'` requires `OPENROUTER_API_KEY` to be set; the runtime fails fast with a missing-key error otherwise. Migration: set `OPENROUTER_API_KEY=sk-or-...` in your environment, or switch to `provider: 'openai'` if you intended to use OpenAI directly.
* HyDE no longer silently substitutes `openai` when the embedding side is `voyage`. Selecting `providerConfig.provider: 'voyage'` together with `hyde: true` now fails fast with a `CapabilityNotSupported` error before any HTTP call. Migration: pin `hydeOptions.provider` explicitly to one of `openai`, `openrouter`, `ollama`, or `lm-studio`.

### Bug Fixes

* `providerConfig.baseURL` is now honored on the embedding path for the four OpenAI-compatible providers (openai, openrouter, ollama, lm-studio). Previously the field was documented as "carried for HyDE inheritance only" and the embed path silently routed to the transport default. Private ollama hosts, self-hosted lm-studio instances, and openrouter proxies now receive embedding traffic on the configured URL during both index build and query. Vector-store metadata also records the endpoint the runtime actually dialled rather than the caller-supplied override, so on-disk observability matches the requests that were sent.

## [0.3.1](https://github.com/srobinson/markdown-matters/compare/v0.3.0...v0.3.1) (2026-03-17)


### Bug Fixes

* eliminate redundant CI runs across workflows ([#14](https://github.com/srobinson/markdown-matters/issues/14)) ([49c5f44](https://github.com/srobinson/markdown-matters/commit/49c5f4445c1d4c421a77db3f86d171e38b179591))

## 0.3.0

### Minor Changes

- [#12](https://github.com/srobinson/markdown-matters/pull/12) [`65e498c`](https://github.com/srobinson/markdown-matters/commit/65e498cab179e053d86f7db71a36ddd941becca5) Thanks [@srobinson](https://github.com/srobinson)! - Rename CLI from mdcontext to mdm, rewrite config system, redesign context command level/budget system, and add line ranges to section output.
