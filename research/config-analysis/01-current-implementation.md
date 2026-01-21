# Current Configuration Implementation Analysis

## Overview

The mdcontext codebase currently has a **minimal, decentralized approach** to configuration. There is no centralized configuration system - configuration is handled through CLI arguments, environment variables, and hardcoded constants.

---

## 1. CLI Argument Handling

### Framework: @effect/cli

The CLI uses `@effect/cli` for argument parsing, with a custom preprocessor for flexible flag positioning.

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/cli/main.ts`

```typescript
import { CliConfig, Command } from "@effect/cli";

const mainCommand = Command.make("mdcontext").pipe(
  Command.withDescription("Token-efficient markdown analysis for LLMs"),
  Command.withSubcommands([
    indexCommand,
    searchCommand,
    contextCommand,
    treeCommand,
    linksCommand,
    backlinksCommand,
    statsCommand,
  ]),
);

const cli = Command.run(mainCommand, {
  name: "mdcontext",
  version: "0.1.0", // Hardcoded version
});
```

### Per-Command Options Pattern

Each command defines its own options inline using `Options` from `@effect/cli`.

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/cli/commands/context.ts`

```typescript
export const contextCommand = Command.make(
  "context",
  {
    files: Args.file({ name: "files" }).pipe(
      Args.withDescription("Markdown file(s) to summarize"),
      Args.repeated,
    ),
    tokens: Options.integer("tokens").pipe(
      Options.withAlias("t"),
      Options.withDescription("Token budget"),
      Options.withDefault(2000), // Default hardcoded here
    ),
    brief: Options.boolean("brief").pipe(
      Options.withDescription("Minimal output"),
      Options.withDefault(false),
    ),
    // ... more options
  },
  ({ files, tokens, brief, full, section, sections, shallow, json, pretty }) =>
    Effect.gen(function* () {
      // Handler uses destructured options directly
    }),
);
```

### Shared Options

Common options are defined in a separate file.

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/cli/options.ts`

```typescript
export const jsonOption = Options.boolean("json").pipe(
  Options.withDescription("Output as JSON"),
  Options.withDefault(false),
);

export const prettyOption = Options.boolean("pretty").pipe(
  Options.withDescription("Pretty-print JSON output"),
  Options.withDefault(true),
);

export const forceOption = Options.boolean("force").pipe(
  Options.withDescription("Force full rebuild, ignoring cache"),
  Options.withDefault(false),
);
```

### Flag Schemas (for validation/preprocessing)

A separate schema system exists for unknown flag detection and typo suggestions.

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/cli/flag-schemas.ts`

```typescript
export interface FlagSpec {
  name: string;
  type: FlagType; // 'boolean' | 'string'
  alias?: string;
  description?: string;
}

export const searchSchema: CommandSchema = {
  name: "search",
  flags: [
    {
      name: "keyword",
      type: "boolean",
      alias: "k",
      description: "Force keyword search",
    },
    {
      name: "limit",
      type: "string",
      alias: "n",
      description: "Maximum results",
    },
    // ...
  ],
};

export const commandSchemas: Record<string, CommandSchema> = {
  index: indexSchema,
  search: searchSchema,
  context: contextSchema,
  // ...
};
```

---

## 2. Environment Variable Usage

### Current Usage

Only **one environment variable** is used in the entire codebase:

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/embeddings/openai-provider.ts`

```typescript
export class OpenAIProvider implements EmbeddingProvider {
  constructor(options: OpenAIProviderOptions = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new MissingApiKeyError();
    }
    // ...
  }
}
```

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/cli/commands/index-cmd.ts`

```typescript
// Direct env check for user prompt
if (!process.env.OPENAI_API_KEY) {
  yield * Console.log("OPENAI_API_KEY not set.");
  // ...
}
```

### Missing Environment Variable Support

Currently no support for:

- `.env` file loading (mentioned in help text but not implemented)
- Configurable defaults via env vars
- Other API providers or configuration

---

## 3. Existing Config Files

### Per-Index Configuration

When an index is created, a config file is stored in `.mdcontext/config.json`.

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/index/types.ts`

```typescript
export interface IndexConfig {
  readonly version: number;
  readonly rootPath: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const INDEX_DIR = ".mdcontext";
export const INDEX_VERSION = 1;

export const getIndexPaths = (rootPath: string) => ({
  root: `${rootPath}/${INDEX_DIR}`,
  config: `${rootPath}/${INDEX_DIR}/config.json`,
  documents: `${rootPath}/${INDEX_DIR}/indexes/documents.json`,
  sections: `${rootPath}/${INDEX_DIR}/indexes/sections.json`,
  links: `${rootPath}/${INDEX_DIR}/indexes/links.json`,
  cache: `${rootPath}/${INDEX_DIR}/cache`,
  parsed: `${rootPath}/${INDEX_DIR}/cache/parsed`,
});
```

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/index/storage.ts`

```typescript
export const initializeIndex = (
  storage: IndexStorage,
): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    yield* ensureDir(storage.paths.root);
    // ...
    const existingConfig = yield* loadConfig(storage);
    if (!existingConfig) {
      const config: IndexConfig = {
        version: INDEX_VERSION,
        rootPath: storage.rootPath,
        include: ["**/*.md", "**/*.mdx"], // Hardcoded defaults
        exclude: ["**/node_modules/**", "**/.*/**"], // Hardcoded defaults
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      yield* saveConfig(storage, config);
    }
  });
```

### No Global User Config

There is **no** support for:

- `~/.mdcontextrc` or similar user-level config
- `.mdcontextrc` in project root
- `mdcontext.config.js` or `mdcontext.config.ts`
- Config section in `package.json`

---

## 4. How Services Receive Configuration

### Pattern: Direct Options Passing

Services receive configuration through **function parameters**, not dependency injection or a config service.

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/index/indexer.ts`

```typescript
export interface IndexOptions {
  readonly force?: boolean;
  readonly exclude?: readonly string[];
}

export const buildIndex = (
  rootPath: string,
  options: IndexOptions = {},
): Effect.Effect<IndexResult, Error> =>
  Effect.gen(function* () {
    // Uses options directly
    const exclude = options.exclude ?? ["**/node_modules/**", "**/.*/**"];
    // ...
  });
```

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/summarize/summarizer.ts`

```typescript
export interface SummarizeOptions {
  readonly level?: CompressionLevel | undefined;
  readonly maxTokens?: number | undefined;
}

export const summarizeFile = (
  filePath: string,
  options: SummarizeOptions = {},
): Effect.Effect<DocumentSummary, Error> =>
  Effect.gen(function* () {
    const level = options.level ?? "summary";
    const maxTokens = options.maxTokens ?? TOKEN_BUDGETS[level];
    // ...
  });
```

### Pattern: Hardcoded Constants

Many configuration values are defined as module-level constants.

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/summarize/summarizer.ts`

```typescript
const TOKEN_BUDGETS: Record<CompressionLevel, number> = {
  brief: 100,
  summary: 500,
  full: Infinity,
};

const MIN_SENTENCE_LENGTH = 10;
const SENTENCE_LENGTH_MIN = 50;
const SENTENCE_LENGTH_MAX = 200;
const SUMMARY_COMPRESSION_RATIO = 0.3;
const MIN_SECTION_TOKENS = 20;
// ...
```

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/embeddings/openai-provider.ts`

```typescript
const PRICING: Record<string, number> = {
  "text-embedding-3-small": 0.02,
  "text-embedding-3-large": 0.13,
  "text-embedding-ada-002": 0.1,
};
```

### MCP Server Configuration

The MCP server receives root path from `process.cwd()`.

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/mcp/server.ts`

```typescript
const main = async () => {
  const rootPath = process.cwd(); // Hardcoded to cwd
  const server = createServer(rootPath);
  // ...
};
```

---

## 5. Current Patterns Summary

| Aspect             | Current Pattern                   | Location                            |
| ------------------ | --------------------------------- | ----------------------------------- |
| CLI options        | @effect/cli with inline defaults  | `src/cli/commands/*.ts`             |
| Shared CLI options | Separate module                   | `src/cli/options.ts`                |
| Flag validation    | Separate schema registry          | `src/cli/flag-schemas.ts`           |
| Environment vars   | Direct `process.env` access       | `src/embeddings/openai-provider.ts` |
| Per-index config   | JSON file in `.mdcontext/`        | `src/index/storage.ts`              |
| Service config     | Function parameters with defaults | Various service files               |
| Hardcoded values   | Module-level constants            | Throughout codebase                 |
| Global user config | **Not implemented**               | N/A                                 |

---

## 6. What Works Well

1. **Type Safety**: All options have TypeScript types through `@effect/cli`
2. **Validation**: CLI validates options with good error messages
3. **Defaults**: Sensible defaults are provided at definition point
4. **Separation**: Shared options are centralized in `options.ts`
5. **Schema Registry**: Flag schemas enable typo detection and suggestions
6. **Simplicity**: No complex config loading or merging logic

---

## 7. Limitations and Pain Points

### 7.1 No Configuration File Support

- Users cannot set persistent defaults
- Every CLI invocation requires explicit flags
- No way to configure project-specific settings
- Help text mentions `.env` but it's not implemented

### 7.2 Duplicated Default Values

Defaults are scattered across multiple locations:

- `Options.withDefault(2000)` in context command
- `TOKEN_BUDGETS` constant in summarizer
- `['**/node_modules/**', '**/.*/**']` appears in multiple files

### 7.3 No Configuration Hierarchy

Missing support for:

- User-level defaults (`~/.mdcontextrc`)
- Project-level config (`.mdcontextrc` or `mdcontext.config.ts`)
- Environment variable overrides
- CLI flag overrides

### 7.4 Services Have No Config Awareness

Services like `summarizer.ts` cannot access:

- User preferences
- Project configuration
- Environment-specific settings

### 7.5 Version Hardcoding

Version `'0.1.0'` is hardcoded in:

- `src/cli/main.ts`
- `src/mcp/server.ts`

### 7.6 Inconsistent Option Handling

- Some options use `Option` type (from Effect): `section._tag === 'Some'`
- Some use primitive types with `undefined`
- No unified pattern for optional values

### 7.7 Environment Variable Limitations

- Only `OPENAI_API_KEY` is supported
- No `.env` file loading
- No configuration for:
  - Default model
  - Default token budgets
  - Default search thresholds
  - Index location customization

---

## 8. Configuration Debt

### Files That Would Benefit From Config

| File                     | Hardcoded Values                                    |
| ------------------------ | --------------------------------------------------- |
| `summarizer.ts`          | TOKEN_BUDGETS, compression ratios, sentence lengths |
| `openai-provider.ts`     | Model name, batch size, pricing                     |
| `searcher.ts`            | Default context lines, limit                        |
| `indexer.ts`             | Exclude patterns                                    |
| `main.ts`                | Version string                                      |
| `mcp/server.ts`          | Version string, tool defaults                       |
| `cli/commands/search.ts` | AUTO_INDEX_THRESHOLD_SECONDS (10)                   |

### Configurable Values Currently Hardcoded

```typescript
// Should be configurable:
const AUTO_INDEX_THRESHOLD_SECONDS = 10;
const DEFAULT_TOKEN_BUDGET = 2000;
const DEFAULT_SEARCH_LIMIT = 10;
const DEFAULT_SIMILARITY_THRESHOLD = 0.45;
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_EXCLUDE_PATTERNS = ["**/node_modules/**", "**/.*/**"];
```

---

## 9. Recommendations for Migration

1. **Create Config Module**: Centralize all configuration in a single module
2. **Implement Config Hierarchy**: Support file < env < CLI precedence
3. **Use Effect Config**: Leverage `@effect/cli` ConfigProvider for consistency
4. **Extract Constants**: Move hardcoded values to configuration
5. **Add .env Support**: Implement dotenv loading for environment variables
6. **Version from package.json**: Read version dynamically

---

## 10. Files to Modify for Config Migration

| Priority | File                                | Changes Needed                                |
| -------- | ----------------------------------- | --------------------------------------------- |
| High     | `src/cli/main.ts`                   | Add config loading, version from package.json |
| High     | `src/cli/commands/*.ts`             | Read defaults from config                     |
| High     | `src/embeddings/openai-provider.ts` | Use config for model, API key                 |
| Medium   | `src/summarize/summarizer.ts`       | Make constants configurable                   |
| Medium   | `src/index/indexer.ts`              | Use config for exclude patterns               |
| Medium   | `src/search/searcher.ts`            | Use config for defaults                       |
| Medium   | `src/mcp/server.ts`                 | Version from package.json                     |
| Low      | `src/cli/flag-schemas.ts`           | Consider auto-generation from config          |
