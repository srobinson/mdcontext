# Configuration Guide

mdcontext supports a layered configuration system that allows you to set persistent defaults, override them with environment variables, and use CLI flags for one-off changes.

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration Precedence](#configuration-precedence)
- [Config File Formats](#config-file-formats)
- [Configuration Options](#configuration-options)
  - [Index Configuration](#index-configuration)
  - [Search Configuration](#search-configuration)
  - [Embeddings Configuration](#embeddings-configuration)
  - [Summarization Configuration](#summarization-configuration)
  - [Output Configuration](#output-configuration)
  - [Paths Configuration](#paths-configuration)
- [Environment Variables](#environment-variables)
- [CLI Commands](#cli-commands)
- [Migration Guide](#migration-guide)
- [Testing Configuration](#testing-configuration)

---

## Quick Start

Create a config file in your project root:

```bash
# Generate a JavaScript config with type annotations (recommended)
mdcontext config init

# Or generate a JSON config
mdcontext config init --format json
```

This creates `mdcontext.config.js` with documented defaults:

```javascript
/** @type {import('mdcontext').PartialMdContextConfig} */
export default {
  index: {
    maxDepth: 10,
    excludePatterns: ['node_modules', '.git', 'dist', 'build'],
  },
  search: {
    defaultLimit: 10,
    minSimilarity: 0.5,
  },
}
```

---

## Configuration Precedence

mdcontext uses a layered configuration system. Values from higher-priority sources override lower ones:

```
CLI Flags           (highest priority)
    |
Environment Variables
    |
Config File
    |
Built-in Defaults   (lowest priority)
```

**Example:**

```bash
# Config file sets: index.maxDepth = 10
# Environment sets: MDCONTEXT_INDEX_MAXDEPTH = 5
# CLI flag: --max-depth 3

# Effective value: 3 (CLI wins)
```

---

## Config File Formats

mdcontext searches for configuration files in this order:

| Filename                  | Format     | Notes                         |
| ------------------------- | ---------- | ----------------------------- |
| `mdcontext.config.js`     | JavaScript | Best: type-safe with JSDoc    |
| `mdcontext.config.mjs`    | ESM        | ES modules only               |
| `mdcontext.config.json`   | JSON       | Simple, no code               |
| `.mdcontextrc`            | JSON       | Hidden file, JSON format      |
| `.mdcontextrc.json`       | JSON       | Explicit JSON rc file         |
| `mdcontext.config.ts`     | TypeScript | Not supported (see note below)|

### JavaScript Config with Types (Recommended)

Using JSDoc type annotations provides full type safety and IDE autocompletion:

```javascript
// mdcontext.config.js
/** @type {import('mdcontext').PartialMdContextConfig} */
export default {
  index: {
    maxDepth: 10,
    excludePatterns: ['node_modules', '.git', 'dist', 'build'],
    fileExtensions: ['.md', '.mdx'],
    followSymlinks: false,
    indexDir: '.mdcontext',
  },
  search: {
    defaultLimit: 10,
    maxLimit: 100,
    minSimilarity: 0.5,
    includeSnippets: true,
    snippetLength: 200,
  },
  embeddings: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    batchSize: 100,
    maxRetries: 3,
  },
  output: {
    format: 'text',
    color: true,
    verbose: false,
  },
}
```

The `@type` JSDoc annotation provides TypeScript type checking and IDE autocompletion while remaining a valid JavaScript file that Node.js can import directly.

**Note:** TypeScript (`.ts`) config files are not currently supported because Node.js cannot import them without a loader. Use JavaScript with JSDoc types instead.

### JSON Config

```json
{
  "$schema": "https://mdcontext.dev/schema.json",
  "index": {
    "maxDepth": 10,
    "excludePatterns": ["node_modules", ".git", "dist", "build"],
    "fileExtensions": [".md", ".mdx"]
  },
  "search": {
    "defaultLimit": 10,
    "minSimilarity": 0.5
  }
}
```

### Using a Custom Config Path

```bash
# Use a specific config file
mdcontext --config ./config/mdcontext.json index

# Short form
mdcontext -c ./custom.config.json search "query"
```

---

## Configuration Options

### Index Configuration

Controls how markdown files are discovered and indexed.

| Option            | Type       | Default                                    | Description                              |
| ----------------- | ---------- | ------------------------------------------ | ---------------------------------------- |
| `maxDepth`        | `number`   | `10`                                       | Maximum directory depth to traverse      |
| `excludePatterns` | `string[]` | `['node_modules', '.git', 'dist', 'build']` | Glob patterns to exclude from indexing   |
| `fileExtensions`  | `string[]` | `['.md', '.mdx']`                          | File extensions to index                 |
| `followSymlinks`  | `boolean`  | `false`                                    | Whether to follow symbolic links         |
| `indexDir`        | `string`   | `'.mdcontext'`                             | Directory for storing index files        |

**Example:**

```typescript
export default defineConfig({
  index: {
    // Only index top 5 levels of directories
    maxDepth: 5,

    // Exclude additional directories
    excludePatterns: [
      'node_modules',
      '.git',
      'dist',
      'build',
      'vendor',
      '__tests__',
    ],

    // Only index standard markdown
    fileExtensions: ['.md'],

    // Store index in a custom location
    indexDir: '.cache/mdcontext',
  },
})
```

### Search Configuration

Controls search behavior and defaults.

| Option              | Type      | Default | Description                                      |
| ------------------- | --------- | ------- | ------------------------------------------------ |
| `defaultLimit`      | `number`  | `10`    | Default number of search results                 |
| `maxLimit`          | `number`  | `100`   | Maximum allowed search results                   |
| `minSimilarity`     | `number`  | `0.5`   | Minimum similarity score (0-1) for semantic search |
| `includeSnippets`   | `boolean` | `true`  | Include content snippets in results              |
| `snippetLength`     | `number`  | `200`   | Maximum snippet length in characters             |
| `autoIndexThreshold`| `number`  | `10`    | Auto-create semantic index if under this many seconds |

**Example:**

```typescript
export default defineConfig({
  search: {
    // Return more results by default
    defaultLimit: 20,

    // Require higher similarity for matches
    minSimilarity: 0.7,

    // Longer snippets for more context
    snippetLength: 300,
  },
})
```

### Embeddings Configuration

Controls semantic search embedding generation.

| Option         | Type     | Default                    | Description                              |
| -------------- | -------- | -------------------------- | ---------------------------------------- |
| `provider`     | `string` | `'openai'`                 | Embedding provider (currently only OpenAI) |
| `model`        | `string` | `'text-embedding-3-small'` | OpenAI embedding model                   |
| `dimensions`   | `number` | `512`                      | Vector dimensions (lower = faster search) |
| `batchSize`    | `number` | `100`                      | Batch size for API calls                 |
| `maxRetries`   | `number` | `3`                        | Maximum retries for failed API calls     |
| `retryDelayMs` | `number` | `1000`                     | Delay between retries in milliseconds    |
| `timeoutMs`    | `number` | `30000`                    | Request timeout in milliseconds          |
| `apiKey`       | `string` | (from env)                 | OpenAI API key (prefer environment variable) |

**Available Models:**

| Model                      | Dimensions | Quality | Cost    |
| -------------------------- | ---------- | ------- | ------- |
| `text-embedding-3-small`   | 1536       | Good    | Lowest  |
| `text-embedding-3-large`   | 3072       | Best    | Higher  |
| `text-embedding-ada-002`   | 1536       | Legacy  | Medium  |

**Example:**

```typescript
export default defineConfig({
  embeddings: {
    // Use higher quality model
    model: 'text-embedding-3-large',

    // Smaller batches for rate limiting
    batchSize: 50,

    // More aggressive retries
    maxRetries: 5,
    retryDelayMs: 2000,
  },
})
```

### Summarization Configuration

Controls context assembly and summarization behavior.

| Option              | Type     | Default | Description                                |
| ------------------- | -------- | ------- | ------------------------------------------ |
| `briefTokenBudget`  | `number` | `100`   | Token budget for 'brief' compression level |
| `summaryTokenBudget`| `number` | `500`   | Token budget for 'summary' compression level |
| `compressionRatio`  | `number` | `0.3`   | Target compression ratio (0-1)             |
| `minSectionTokens`  | `number` | `20`    | Minimum tokens for any section summary     |
| `maxTopics`         | `number` | `10`    | Maximum topics to extract from a document  |
| `minPartialBudget`  | `number` | `50`    | Minimum remaining budget for partial content |

**Example:**

```typescript
export default defineConfig({
  summarization: {
    // More detailed brief summaries
    briefTokenBudget: 150,

    // Higher compression for large docs
    compressionRatio: 0.2,
  },
})
```

### Output Configuration

Controls CLI output formatting.

| Option       | Type                | Default  | Description                    |
| ------------ | ------------------- | -------- | ------------------------------ |
| `format`     | `'text'` \| `'json'`| `'text'` | Default output format          |
| `color`      | `boolean`           | `true`   | Use colors in terminal output  |
| `prettyJson` | `boolean`           | `true`   | Pretty-print JSON output       |
| `verbose`    | `boolean`           | `false`  | Show verbose output            |
| `debug`      | `boolean`           | `false`  | Show debug information         |

**Example:**

```typescript
export default defineConfig({
  output: {
    // Always output JSON for scripting
    format: 'json',
    prettyJson: true,

    // Disable colors for CI environments
    color: false,
  },
})
```

### Paths Configuration

Controls file path behavior.

| Option       | Type     | Default              | Description                    |
| ------------ | -------- | -------------------- | ------------------------------ |
| `root`       | `string` | (current directory)  | Root directory for markdown files |
| `configFile` | `string` | (auto-detected)      | Custom config file path        |
| `cacheDir`   | `string` | `'.mdcontext/cache'` | Cache directory for temporary files |

**Example:**

```typescript
export default defineConfig({
  paths: {
    // Index a specific subdirectory
    root: './docs',

    // Custom cache location
    cacheDir: '.cache/mdcontext',
  },
})
```

---

## Environment Variables

All configuration options can be set via environment variables using the `MDCONTEXT_` prefix.

### Variable Naming

Convert the config key to uppercase and replace dots with underscores:

```
config key:        index.maxDepth
environment var:   MDCONTEXT_INDEX_MAXDEPTH
```

### Complete Variable Reference

#### Index Configuration

| Variable                          | Config Key               |
| --------------------------------- | ------------------------ |
| `MDCONTEXT_INDEX_MAXDEPTH`        | `index.maxDepth`         |
| `MDCONTEXT_INDEX_EXCLUDEPATTERNS` | `index.excludePatterns`  |
| `MDCONTEXT_INDEX_FILEEXTENSIONS`  | `index.fileExtensions`   |
| `MDCONTEXT_INDEX_FOLLOWSYMLINKS`  | `index.followSymlinks`   |
| `MDCONTEXT_INDEX_INDEXDIR`        | `index.indexDir`         |

#### Search Configuration

| Variable                            | Config Key                |
| ----------------------------------- | ------------------------- |
| `MDCONTEXT_SEARCH_DEFAULTLIMIT`     | `search.defaultLimit`     |
| `MDCONTEXT_SEARCH_MAXLIMIT`         | `search.maxLimit`         |
| `MDCONTEXT_SEARCH_MINSIMILARITY`    | `search.minSimilarity`    |
| `MDCONTEXT_SEARCH_INCLUDESNIPPETS`  | `search.includeSnippets`  |
| `MDCONTEXT_SEARCH_SNIPPETLENGTH`    | `search.snippetLength`    |
| `MDCONTEXT_SEARCH_AUTOINDEXTHRESHOLD` | `search.autoIndexThreshold` |

#### Embeddings Configuration

| Variable                          | Config Key               |
| --------------------------------- | ------------------------ |
| `MDCONTEXT_EMBEDDINGS_PROVIDER`   | `embeddings.provider`    |
| `MDCONTEXT_EMBEDDINGS_MODEL`      | `embeddings.model`       |
| `MDCONTEXT_EMBEDDINGS_DIMENSIONS` | `embeddings.dimensions`  |
| `MDCONTEXT_EMBEDDINGS_BATCHSIZE`  | `embeddings.batchSize`   |
| `MDCONTEXT_EMBEDDINGS_MAXRETRIES` | `embeddings.maxRetries`  |
| `MDCONTEXT_EMBEDDINGS_RETRYDELAYMS` | `embeddings.retryDelayMs` |
| `MDCONTEXT_EMBEDDINGS_TIMEOUTMS`  | `embeddings.timeoutMs`   |
| `MDCONTEXT_EMBEDDINGS_APIKEY`     | `embeddings.apiKey`      |

#### Summarization Configuration

| Variable                                   | Config Key                       |
| ------------------------------------------ | -------------------------------- |
| `MDCONTEXT_SUMMARIZATION_BRIEFTOKENBUDGET` | `summarization.briefTokenBudget` |
| `MDCONTEXT_SUMMARIZATION_SUMMARYTOKENBUDGET` | `summarization.summaryTokenBudget` |
| `MDCONTEXT_SUMMARIZATION_COMPRESSIONRATIO` | `summarization.compressionRatio` |
| `MDCONTEXT_SUMMARIZATION_MINSECTIONTOKENS` | `summarization.minSectionTokens` |
| `MDCONTEXT_SUMMARIZATION_MAXTOPICS`        | `summarization.maxTopics`        |
| `MDCONTEXT_SUMMARIZATION_MINPARTIALBUDGET` | `summarization.minPartialBudget` |

#### Output Configuration

| Variable                        | Config Key          |
| ------------------------------- | ------------------- |
| `MDCONTEXT_OUTPUT_FORMAT`       | `output.format`     |
| `MDCONTEXT_OUTPUT_COLOR`        | `output.color`      |
| `MDCONTEXT_OUTPUT_PRETTYJSON`   | `output.prettyJson` |
| `MDCONTEXT_OUTPUT_VERBOSE`      | `output.verbose`    |
| `MDCONTEXT_OUTPUT_DEBUG`        | `output.debug`      |

#### Paths Configuration

| Variable                      | Config Key         |
| ----------------------------- | ------------------ |
| `MDCONTEXT_PATHS_ROOT`        | `paths.root`       |
| `MDCONTEXT_PATHS_CONFIGFILE`  | `paths.configFile` |
| `MDCONTEXT_PATHS_CACHEDIR`    | `paths.cacheDir`   |

### Array Values

For array values, use comma-separated strings:

```bash
export MDCONTEXT_INDEX_EXCLUDEPATTERNS="node_modules,.git,dist,vendor"
export MDCONTEXT_INDEX_FILEEXTENSIONS=".md,.mdx,.markdown"
```

### Boolean Values

Use `true` or `false`:

```bash
export MDCONTEXT_INDEX_FOLLOWSYMLINKS=true
export MDCONTEXT_OUTPUT_COLOR=false
```

### Example: CI Environment

```bash
# .github/workflows/docs.yml
env:
  MDCONTEXT_OUTPUT_COLOR: 'false'
  MDCONTEXT_OUTPUT_FORMAT: 'json'
  MDCONTEXT_SEARCH_DEFAULTLIMIT: '50'
```

---

## CLI Commands

### config init

Create a starter configuration file.

```bash
mdcontext config init [options]

Options:
  -f, --format <ts|json>  Config file format (default: ts)
  --force                 Overwrite existing config file
  --json                  Output as JSON
  --pretty                Pretty-print JSON output
```

**Examples:**

```bash
# Create TypeScript config
mdcontext config init

# Create JSON config
mdcontext config init --format json

# Overwrite existing config
mdcontext config init --force
```

### config show

Display the current config file location.

```bash
mdcontext config show [options]

Options:
  --json    Output as JSON
  --pretty  Pretty-print JSON output
```

### config check

Validate configuration and show effective values with their sources.

```bash
mdcontext config check [options]

Options:
  --json    Output as JSON
  --pretty  Pretty-print JSON output
```

**Example output:**

```
Configuration validated successfully!

Source: /project/mdcontext.config.ts

Effective configuration:
  index:
    maxDepth: 10 (from config file)
    excludePatterns: ["node_modules",".git","dist"] (default)
    fileExtensions: [".md",".mdx"] (default)
    followSymlinks: false (default)
    indexDir: .mdcontext (default)
  search:
    defaultLimit: 20 (from environment)
    maxLimit: 100 (default)
    minSimilarity: 0.5 (default)
    ...
```

---

## Migration Guide

### From CLI-Only Usage

If you've been passing flags on every command:

```bash
# Before: Flags every time
mdcontext index --exclude vendor --exclude __tests__
mdcontext search "query" --limit 20
```

Create a config file to persist these settings:

```bash
# Generate config
mdcontext config init
```

Edit `mdcontext.config.ts`:

```typescript
import { defineConfig } from 'mdcontext'

export default defineConfig({
  index: {
    excludePatterns: ['node_modules', '.git', 'dist', 'build', 'vendor', '__tests__'],
  },
  search: {
    defaultLimit: 20,
  },
})
```

Now commands use your defaults:

```bash
# After: Clean commands
mdcontext index
mdcontext search "query"

# Override when needed
mdcontext search "query" --limit 5
```

### From Environment Variables

If you've been setting environment variables:

```bash
# .bashrc or .zshrc
export OPENAI_API_KEY=sk-...
export MDCONTEXT_SEARCH_DEFAULTLIMIT=20
```

You can now move project-specific settings to a config file while keeping environment variables for:

- Secrets (API keys)
- Machine-specific settings
- CI/CD overrides

---

## Testing Configuration

mdcontext provides utilities for testing with custom configurations.

### Test Utilities

```typescript
import { TestConfigLayer, withTestConfig, runWithConfig } from 'mdcontext'
import { Effect } from 'effect'

// Option 1: Use TestConfigLayer directly
const testEffect = myEffect.pipe(
  Effect.provide(TestConfigLayer)
)

// Option 2: withTestConfig for partial overrides
const testEffect = myEffect.pipe(
  withTestConfig({
    search: { defaultLimit: 5 }
  })
)

// Option 3: runWithConfig for full test isolation
const result = await runWithConfig(
  myEffect,
  { search: { defaultLimit: 5 } }
)
```

### Isolating Tests from Environment

```typescript
import { createTestConfigProvider } from 'mdcontext'

// Creates a provider that ignores environment variables
const provider = createTestConfigProvider(
  { search: { defaultLimit: 5 } },  // CLI overrides
  { index: { maxDepth: 3 } }        // File config
)

const effect = myEffect.pipe(
  Effect.withConfigProvider(provider)
)
```

---

## Troubleshooting

### Config File Not Loading

If your config file isn't being used:

1. **Verify the file is found:**
   ```bash
   mdcontext config show
   ```
   This shows which config file mdcontext is using, if any.

2. **Check for errors:**
   ```bash
   mdcontext config check --json
   ```
   The `errors` array will show any loading failures.

3. **Common issues:**
   - **JSON syntax errors:** Validate your JSON with `jq` or an online validator
   - **TypeScript files:** Not currently supported - use `.js` or `.json` instead (see below)
   - **Wrong export:** Ensure `.js` files use `export default { ... }`
   - **File location:** Config must be in project root or parent directory

### TypeScript Config Files

**Current Limitation:** `.ts` config files are not supported because Node.js cannot import TypeScript directly without a loader.

**Recommended Alternatives:**

1. **JavaScript with JSDoc types** (recommended):
   ```javascript
   // mdcontext.config.js
   /** @type {import('mdcontext').PartialMdContextConfig} */
   export default {
     index: {
       maxDepth: 10,
     },
   }
   ```
   This provides full type checking and IDE autocompletion while working at runtime.

2. **JSON format** (simplest):
   ```bash
   mdcontext config init --format json
   ```

### Environment Variables Not Working

1. **Check variable name:** Must be uppercase with `MDCONTEXT_` prefix
   ```bash
   # Correct
   export MDCONTEXT_SEARCH_DEFAULTLIMIT=20

   # Wrong - will not work
   export mdcontext_search_defaultLimit=20
   ```

2. **Verify with config check:**
   ```bash
   mdcontext config check
   ```
   Look for "(from environment)" annotations.

3. **Array values:** Use comma-separated strings
   ```bash
   export MDCONTEXT_INDEX_EXCLUDEPATTERNS="node_modules,.git,dist"
   ```

### Config Not Taking Effect

If you've set config but commands still use defaults:

1. **Check precedence:** CLI flags override everything
   ```bash
   # This ignores config file's defaultLimit setting
   mdcontext search "query" --limit 5
   ```

2. **Verify effective config:**
   ```bash
   mdcontext config check
   ```
   Shows exactly what values are being used and why.

3. **Try explicit config path:**
   ```bash
   mdcontext --config ./mdcontext.config.json index
   ```

---

## Examples

### Team Defaults

Share consistent settings across a team:

```typescript
// mdcontext.config.ts
import { defineConfig } from 'mdcontext'

export default defineConfig({
  index: {
    // Exclude team-specific directories
    excludePatterns: [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      'coverage',
    ],
  },
  search: {
    // Team prefers more results
    defaultLimit: 20,
    minSimilarity: 0.6,
  },
  output: {
    // Consistent formatting
    prettyJson: true,
  },
})
```

### CI/CD Pipeline

```yaml
# .github/workflows/docs.yml
jobs:
  check-docs:
    runs-on: ubuntu-latest
    env:
      MDCONTEXT_OUTPUT_COLOR: 'false'
      MDCONTEXT_OUTPUT_FORMAT: 'json'
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g mdcontext
      - run: mdcontext index ./docs
      - run: mdcontext stats --json > stats.json
```

### Monorepo Setup

```typescript
// packages/docs/mdcontext.config.ts
import { defineConfig } from 'mdcontext'

export default defineConfig({
  paths: {
    root: './content',
  },
  index: {
    // Only this package's docs
    excludePatterns: ['node_modules'],
    maxDepth: 5,
  },
})
```

---

_For CLI command reference, see [USAGE.md](./019-USAGE.md)_
