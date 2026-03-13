# mdcontext

**Version:** 0.2.0
**License:** MIT
**Node:** >=18.0.0
**Package manager:** pnpm

Token-efficient markdown analysis tool for LLM consumption. Indexes markdown corpora, provides keyword and semantic search, exposes an MCP server for AI agent access, and compresses document context to fit within LLM token budgets.

---

## Binaries

| Binary | Entry point | Purpose |
|--------|-------------|---------|
| `mdcontext` | `dist/cli/main.js` | Human-facing CLI |
| `mdcontext-mcp` | `dist/mcp/server.js` | MCP server for AI agent access |

---

## Architecture

The codebase is built on [Effect-TS](https://effect.website). Every async operation returns an `Effect<A, E, R>`. Errors are typed `Data.TaggedError` instances matched exhaustively at CLI boundaries. Config is injected via `Context.Tag` layers. There are no raw `Promise` chains in core logic.

```
CLI (src/cli/)
  └── Commands
        ├── index       → Indexer → Parser → BM25Store → Storage
        ├── search      → Searcher / HybridSearch → Storage / BM25 / HNSW
        ├── embeddings  → EmbeddingNamespace → VectorStore → Provider
        ├── context     → Summarizer → Parser → SectionFilter
        ├── config      → ConfigService → Precedence chain
        ├── duplicates  → DuplicateDetector → Storage
        ├── stats       → Storage
        ├── links       → Storage
        ├── backlinks   → Storage
        └── tree        → Storage

MCP Server (src/mcp/server.ts)
  └── Tools: md_search, md_keyword_search, md_context, md_structure,
             md_index, md_links, md_backlinks

Config (src/config/)
  └── Precedence: CLI flags > env vars > config file > defaults

Embeddings (src/embeddings/)
  └── Providers: openai, voyage, (local via @huggingface/transformers)
  └── VectorStore: HNSW (hnswlib-node) + msgpack serialization
  └── Namespaces: per-provider isolation, migration support
```

Dependencies flow strictly downward. No circular imports.

---

## Module Map

### `src/core/`
Foundational types shared across all modules: `MdDocument`, `MdSection`, `ParseError` (plain interface variant).

### `src/types/`
TypeScript declaration file for `@huggingface/transformers` (local embedding provider).

### `src/errors/`
The complete typed error taxonomy. All errors extend `Data.TaggedError` and carry a `code: ErrorCode` field. The union type `MdContextError` covers every error the system can produce.

Key error types:
- `FileReadError`, `FileWriteError`, `DirectoryCreateError`, `DirectoryWalkError`
- `ParseError`, `IndexNotFoundError`, `IndexCorruptedError`, `IndexBuildError`
- `DocumentNotFoundError`, `EmbeddingError`, `EmbeddingsNotFoundError`, `DimensionMismatchError`
- `VectorStoreError`, `ApiKeyMissingError`, `ApiKeyInvalidError`
- `ConfigError`, `WatchError`, `CliValidationError`

### `src/config/`

| File | Purpose |
|------|---------|
| `schema.ts` | Zod-like Effect Schema for all config. Defines `MdContextConfig` and `defaultConfig`. |
| `service.ts` | `ConfigService` — Effect `Context.Tag`, the DI handle for config access. |
| `precedence.ts` | Builds the layered config provider: CLI flags > env vars > config file > defaults. |
| `file-provider.ts` | Walks up the directory tree to find config files; dynamic-imports JS/TS configs. |
| `testing.ts` | Test helpers for constructing config layers in tests. |
| `index.ts` | Barrel re-export of the full config surface. |

**Config sections:**

| Section | Key settings |
|---------|-------------|
| `index` | `maxDepth`, `excludePatterns`, `fileExtensions`, `followSymlinks`, `indexDir` |
| `search` | `defaultLimit`, `maxLimit`, `minSimilarity`, `autoIndexThreshold`, `snippetLength` |
| `embeddings` | `provider`, `model`, `dimensions`, `batchSize`, `hnswM`, `hnswEfConstruction` |
| `summarization` | `briefTokenBudget`, `summaryTokenBudget`, `compressionRatio`, `minSectionTokens` |
| `aiSummarization` | `mode`, `provider`, `model`, `stream`, `baseURL`, `apiKey` |
| `output` | `format`, `color`, `prettyJson`, `verbose`, `debug` |
| `paths` | `root`, `configFile`, `cacheDir` |

**Supported config file names** (searched from cwd upward):
`mdcontext.config.js`, `mdcontext.config.ts`, `mdcontext.config.json`, `.mdcontextrc`, `.mdcontextrc.json`, `.mdcontextrc.js`

**Environment variable prefix:** `MDCONTEXT_` (e.g. `MDCONTEXT_EMBEDDINGS_PROVIDER=voyage`)

### `src/parser/`

| File | Purpose |
|------|---------|
| `parser.ts` | Parses markdown to `MdDocument` + `MdSection[]` via remark + remark-gfm. Extracts frontmatter (gray-matter), headings, internal links, and section content. |
| `section-filter.ts` | Filters sections by heading level, content patterns, path, and token budget. |

Section IDs are `${docId}-${slugify(heading)}`. Links extracted as `[[wiki-style]]` and standard markdown `[text](href)`.

### `src/index/`

| File | Purpose |
|------|---------|
| `indexer.ts` | `buildIndex` — walks the directory tree, parses files, builds the document/section JSON store and BM25 index. `buildBM25Index` — reconstructs BM25 from stored sections. Handles broken/incoming/outgoing link graphs. |
| `storage.ts` | JSON-based persistence. Reads/writes `documents.json` and `sections.json` under `.mdcontext/`. SHA-256 (truncated 64-bit) for change detection. |
| `watcher.ts` | `chokidar`-based file watcher. Triggers re-index on change/add/unlink events with debounce. |
| `types.ts` | `DocumentEntry`, `SectionEntry`, `IndexStore` — the on-disk data shapes. |
| `ignore-patterns.ts` | Resolves `.gitignore` and config `excludePatterns`. Uses the `ignore` package. |

**Storage layout (`.mdcontext/`):**
```
.mdcontext/
  documents.json        # DocumentEntry[]
  sections.json         # SectionEntry[]
  embeddings/
    <namespace>/
      vectors.bin       # hnswlib HNSW binary
      meta.msgpack      # EmbeddingMetadata[]
    active-provider.json
  cache/
```

### `src/embeddings/`

| File | Purpose |
|------|---------|
| `provider-constants.ts` | Model capability table: dimensions, context windows, batch token limits per model/provider. |
| `openai-provider.ts` | OpenAI embedding provider. Uses `openai` SDK. API key via `Redacted<string>`. Supports custom `baseURL` for OpenAI-compatible endpoints. |
| `voyage-provider.ts` | Voyage AI embedding provider. Identical structure to `openai-provider.ts`. |
| `provider-factory.ts` | Constructs the correct `EmbeddingProvider` implementation from config. |
| `provider-errors.ts` | Provider-specific error classification and formatting with actionable messages (Ollama daemon hints, LM Studio menu location, etc.). |
| `batching.ts` | Token-aware batch construction. Splits sections into batches respecting per-model token limits. |
| `vector-store.ts` | `HnswVectorStore` — wraps hnswlib-node. Stores vectors as float32. Serializes metadata as msgpack. |
| `embedding-namespace.ts` | Namespace management: per-provider isolation, namespace listing, switching, migration from legacy single-namespace layout. |
| `semantic-search.ts` | `semanticSearch` / `semanticSearchWithStats` — full pipeline: query preprocessing, HyDE expansion, embedding, HNSW k-NN, cross-encoder reranking, path filtering, result assembly. |
| `hyde.ts` | Hypothetical Document Embeddings — generates a synthetic answer passage to improve recall on question-style queries. |
| `types.ts` | `EmbeddingProvider` interface, `EmbeddingResult`, ranking boost functions, query preprocessing logic. |

**Embedding providers:**

| Provider | Models | Notes |
|----------|--------|-------|
| `openai` | `text-embedding-3-small` (default, 512d), `text-embedding-3-large`, `ada-002` | API key: `OPENAI_API_KEY` or config |
| `voyage` | `voyage-3`, `voyage-3-lite`, `voyage-code-3` | API key: `VOYAGE_API_KEY` or config |
| `local` | Any HuggingFace sentence-transformers model | No API key; runs in-process via `@huggingface/transformers` |

### `src/search/`

| File | Purpose |
|------|---------|
| `searcher.ts` | `search` — BM25 + fuzzy keyword search over sections. `searchContent` — full file content scan with regex. `getContext` — assembles surrounding context lines for a section match. `formatContextForLLM` — formats results as token-efficient LLM context. |
| `bm25-store.ts` | BM25 index wrapper around `wink-bm25-text-search`. Build, query, serialize/deserialize. |
| `fuzzy-search.ts` | Levenshtein-based fuzzy matching with configurable threshold. |
| `hybrid-search.ts` | `hybridSearch` — fuses BM25 and semantic search results via Reciprocal Rank Fusion (RRF). Auto-detects available search modes. |
| `cross-encoder.ts` | Cross-encoder reranking. Scores (query, passage) pairs. Used as final reranking stage in semantic and hybrid search. |
| `query-parser.ts` | Parses structured queries: `field:value`, `"exact phrase"`, `-exclude`, `tag:x`, `path:y`. |
| `path-matcher.ts` | Glob-to-regex conversion for path filtering in search. |

**Search modes:**

| Mode | Trigger | Algorithm |
|------|---------|-----------|
| Keyword | Default | BM25 + fuzzy |
| Semantic | `--semantic` or embeddings present | HNSW k-NN + cross-encoder rerank |
| Hybrid | `--hybrid` | RRF fusion of BM25 + HNSW, then cross-encoder rerank |
| HyDE | `--hyde` | Semantic with synthetic document expansion |
| Content | `--content` | Full-text file scan with regex |

### `src/summarize/`
Extractive document compression. Reduces token count while preserving structural information. Used by the `context` command to fit large documents into token budgets.

| File | Purpose |
|------|---------|
| `summarizer.ts` | `summarizeDocument` — scores and compresses sections. `assembleContext` — assembles a multi-document context blob respecting a token budget. `measureReduction` — reports compression ratio. |
| `formatters.ts` | Output formatters: plain text, JSON, LLM-optimized markdown. |

### `src/summarization/`
AI-powered search result summarization. After a search, passes results to an LLM (Claude, OpenAI, Ollama, LM Studio) for synthesis.

| File | Purpose |
|------|---------|
| `pipeline.ts` | `runSummarizationPipeline` — orchestrates model selection, prompt construction, streaming, cost tracking. |
| `prompts.ts` | System and user prompt templates. |
| `cost.ts` | Token cost estimation per provider/model. |
| `provider-factory.ts` | Constructs the AI provider from config. |
| `cli-providers/claude.ts` | Claude via subprocess (`claude` CLI). Uses `spawn` with argument arrays (no shell injection). |
| `cli-providers/detection.ts` | Detects available CLI providers on `$PATH`. |

### `src/duplicates/`
Content deduplication across the indexed corpus.

- `detectExactDuplicates` — SHA-256 hashing of section content, groups identical sections.
- `collapseDuplicates` — merges duplicate groups, preserving one canonical copy per content hash.

### `src/mcp/`
MCP server (`src/mcp/server.ts`) using `@modelcontextprotocol/sdk`. Exposes the index and search subsystems to AI agents via stdio transport.

**Exposed tools:**

| Tool | Description |
|------|-------------|
| `md_search` | Semantic/hybrid search over the indexed corpus |
| `md_keyword_search` | BM25 keyword search with optional heading/content regex filter |
| `md_context` | Read a specific file with token-budget compression |
| `md_structure` | Return the heading outline of a file |
| `md_index` | Trigger index build |
| `md_links` | List outgoing links from a file |
| `md_backlinks` | List incoming links to a file |

### `src/cli/`

| File | Purpose |
|------|---------|
| `main.ts` | Entry point. Wires `@effect/cli` app, runs argv preprocessor, dispatches commands. |
| `argv-preprocessor.ts` | Preprocesses raw argv before Effect CLI parses it (handles positional-before-flag ordering). |
| `flag-schemas.ts` | Per-command flag schema for the preprocessor. |
| `config-layer.ts` | Builds the Effect config layer from resolved config for command handlers. |
| `error-handler.ts` | `createErrorHandler` — exhaustive `Match` over `MdContextError`. Formats error messages with provider-specific hints. Levenshtein typo suggestions. |
| `help.ts` | Custom help registry and renderer (replaces `@effect/cli` built-ins). |
| `typo-suggester.ts` | Levenshtein distance with prefix-match preference for "did you mean?" suggestions. |
| `options.ts` | Shared `@effect/cli` `Options` definitions reused across commands. |
| `utils.ts` | Shared utilities: TTY detection, output helpers, progress rendering. |

**CLI commands:**

| Command | Description |
|---------|-------------|
| `index` | Build or update the document/section index |
| `search` | Search the index (keyword, semantic, hybrid, content, HyDE) |
| `embeddings` | Manage embedding namespaces (build, list, switch, delete, migrate) |
| `context` | Assemble token-compressed context for one or more files |
| `config` | Show, validate, or generate config |
| `stats` | Index statistics |
| `duplicates` | Detect duplicate content sections |
| `links` | Show outgoing links from a file |
| `backlinks` | Show incoming links to a file |
| `tree` | Show the document tree |

### `src/utils/`
- `tokens.ts` — `countTokensApprox` (regex-based, no external tokenizer), `countTokensTiktoken` (exact, via `tiktoken`), and token budget utilities.

---

## Build

```bash
pnpm build          # tsup: bundles CLI, MCP server, and library index as ESM + .d.ts
pnpm dev            # tsc --watch
pnpm typecheck      # tsc --noEmit
pnpm lint           # biome lint --write
pnpm format         # biome format + check --write
pnpm check          # format + lint + typecheck
```

**Build tool:** `tsup` (esbuild-based)
**Output:** `dist/` — three entry points: `cli/main.js`, `mcp/server.js`, `index.js`
**Module format:** ESM only (`"type": "module"`)

`postinstall` runs `scripts/rebuild-hnswlib.js` to compile the `hnswlib-node` native addon for the current platform.

---

## Testing

```bash
pnpm test                      # vitest run (unit + integration, no embed tests)
pnpm test:all                  # include embedding provider integration tests
pnpm test:rebuild              # rebuild test index before running
pnpm test:all:rebuild          # both flags combined
pnpm test:watch                # vitest interactive watch
```

**Framework:** Vitest
**Key env flags:**
- `INCLUDE_EMBED_TESTS=true` — runs tests that call live embedding APIs
- `REBUILD_TEST_INDEX=true` — forces index rebuild before tests

**Test coverage by module:**

| Module | Status |
|--------|--------|
| config | Good (schema, precedence, file-provider, service, testing) |
| search | Good (searcher, fuzzy, hybrid, cross-encoder, query-parser, path-matcher) |
| embeddings | Partial (provider-factory, provider-errors, hyde, hnsw-build-options, embedding-namespace, provider-integration) |
| summarization | Good (cost, prompts, detection) |
| errors | Good |
| parser | Good (parser, section-filter) |
| duplicates | Partial |
| cli | Partial (argv-preprocessor, typo-suggester) |
| index | Minimal (ignore-patterns only) |
| mcp | None |

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `effect` | Async runtime, typed errors, DI, config |
| `@effect/cli` | CLI framework |
| `@effect/platform`, `@effect/platform-node` | Effect Node.js platform layer |
| `@modelcontextprotocol/sdk` | MCP server protocol |
| `openai` | OpenAI embedding API client |
| `hnswlib-node` | C++ HNSW approximate nearest-neighbor (native addon) |
| `wink-bm25-text-search` | BM25 full-text search |
| `remark`, `remark-gfm`, `remark-parse`, `unified` | Markdown parsing (AST) |
| `gray-matter` | YAML/TOML frontmatter extraction |
| `tiktoken` | Exact token counting (OpenAI tokenizer) |
| `chokidar` | File system watcher |
| `@msgpack/msgpack` | Binary serialization for vector metadata |
| `ignore` | `.gitignore` pattern matching |
| `stemmer` | Word stemming for BM25 |

---

## Known Issues (from review, 2026-03-13)

### Critical

1. **MCP path traversal** (`src/mcp/server.ts`) — path-accepting handlers do not validate that resolved paths remain within `rootPath`. Any connected AI agent can read arbitrary files.
2. **ReDoS** (`src/search/searcher.ts:132,257`) — `heading` and `content` search options pass user input directly to `new RegExp()`. Catastrophic patterns freeze the event loop.
3. **9 search flags missing from argv preprocessor** (`src/cli/flag-schemas.ts`) — `--rerank`, `--quality`, `--hyde`, `--rerank-init`, `--timeout`, `--summarize`, `--yes`, `--stream`, `--auto-index-threshold` are rejected before reaching command handlers.
4. **No in-process index cache** — `documents.json` and `sections.json` are parsed from disk on every search request.
5. **HNSW store reloaded per search call** — a full `~300MB` binary read on every semantic search invocation.
6. **`DimensionMismatchError` missing from `createErrorHandler`** (`src/cli/error-handler.ts:507`) — falls through to generic handler.

### High

- `semanticSearch` and `semanticSearchWithStats` duplicate ~400 lines of pipeline logic.
- `SummarizationError` bypasses the Effect error contract (no `_tag`, not in `MdContextError` union).
- MCP server ignores the config system; hardcodes the default embedding provider.
- Config `file-provider.ts` walks to filesystem root for config files; a malicious `mdcontext.config.js` in any ancestor directory executes arbitrary code.
- `duplicates` command missing from help registry; `--help` exits 1.
- No retry/backoff on embedding API rate limit errors (429 fails the entire build).
- No incremental embedding updates (`--force` re-embeds the entire corpus).

Full review reports: `~/.mdx/research/mdcontext-*-review.md`

---

## Release

Releases are managed via [Changesets](https://github.com/changesets/changesets).

```bash
pnpm changeset          # create a changeset
pnpm release            # changeset publish
```

CI runs on push to `main` (see `.github/workflows/`). Published to npm with provenance.
