# Configuration System Task Candidates

This document outlines implementation tasks for enhancing mdcontext's configuration system, based on research from:

- [033-research-configuration-management.md](/Users/alphab/Dev/LLM/DEV/md-tldr/docs/033-research-configuration-management.md)
- [034-research-effect-cli-config.md](/Users/alphab/Dev/LLM/DEV/md-tldr/docs/034-research-effect-cli-config.md)

Tasks are ordered by recommended implementation sequence.

---

## Phase 1: Foundation

### 1.1 Define Configuration Schema with Zod

**Priority**: High
**Effort**: Small
**Dependencies**: None

**Description**:
Create a Zod schema that defines all configurable options for mdcontext. This schema serves as the single source of truth for configuration shape, types, and defaults.

**Why it matters**:

- Enables runtime validation with clear error messages
- Generates TypeScript types automatically (no type/schema drift)
- Foundation for all subsequent config work
- Aligns with modern TypeScript ecosystem patterns (Vite, Nuxt, ESLint)

**Implementation outline**:

```typescript
// src/config/schema.ts
import { z } from "zod";

export const ConfigSchema = z.object({
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  embeddings: z
    .object({
      provider: z.enum(["openai", "none"]).default("none"),
      model: z.string().default("text-embedding-3-small"),
      batchSize: z.number().positive().default(100),
    })
    .default({}),
  search: z
    .object({
      limit: z.number().positive().default(10),
      threshold: z.number().min(0).max(1).default(0.45),
      autoIndexThreshold: z.number().default(10),
    })
    .default({}),
  context: z
    .object({
      defaultTokenBudget: z.number().positive().default(2000),
    })
    .default({}),
  index: z
    .object({
      ignorePatterns: z
        .array(z.string())
        .default(["**/node_modules/**", "**/.git/**"]),
    })
    .default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
```

---

### 1.2 Create defineConfig Helper

**Priority**: High
**Effort**: Small
**Dependencies**: 1.1

**Description**:
Implement a `defineConfig()` helper function that provides type inference for user config files, following the pattern used by Vite, ESLint, and Nuxt.

**Why it matters**:

- Enables IDE autocomplete in config files without JSON schemas
- Makes config files self-documenting
- Industry-standard pattern familiar to developers
- Improves developer experience significantly

**Implementation outline**:

```typescript
// src/config/define.ts
import type { Config } from "./schema";

export function defineConfig(config: Partial<Config>): Partial<Config> {
  return config;
}
```

**Export from package**:

```typescript
// src/index.ts
export { defineConfig } from "./config/define";
export type { Config } from "./config/schema";
```

---

### 1.3 Implement Config Loader with c12

**Priority**: High
**Effort**: Medium
**Dependencies**: 1.1, 1.2

**Description**:
Create a configuration loader using c12 (UnJS) that supports multiple config file formats and locations.

**Why it matters**:

- Supports TypeScript config files natively (via jiti)
- Handles multiple formats: `.ts`, `.js`, `.json`, `.yaml`, `.toml`
- Built-in dotenv support
- Environment-specific overrides (`$development`, `$production`)
- Used by Nuxt, Prisma, and other production tools

**Implementation outline**:

```typescript
// src/config/loader.ts
import { loadConfig } from "c12";
import { ConfigSchema, type Config } from "./schema";

export interface LoadConfigResult {
  config: Config;
  configFile?: string;
  layers: Array<{ config: Partial<Config>; configFile?: string }>;
}

export async function loadMdcontextConfig(options?: {
  cwd?: string;
  overrides?: Partial<Config>;
}): Promise<LoadConfigResult> {
  const {
    config: rawConfig,
    configFile,
    layers,
  } = await loadConfig({
    name: "mdcontext",
    cwd: options?.cwd,
    defaults: ConfigSchema.parse({}),
    overrides: options?.overrides,
    dotenv: true,
  });

  const config = ConfigSchema.parse(rawConfig);
  return { config, configFile, layers };
}
```

**New dependencies**:

```json
{
  "dependencies": {
    "c12": "^2.0.0"
  }
}
```

---

## Phase 2: CLI Integration

### 2.1 Integrate Config with CLI Commands

**Priority**: High
**Effort**: Medium
**Dependencies**: 1.3

**Description**:
Modify CLI commands to load and use configuration, with CLI flags taking precedence over config file values.

**Why it matters**:

- Enables persistent configuration (no need to repeat flags)
- Maintains CLI flag override capability for one-off changes
- Creates consistent configuration experience across all commands

**Implementation outline**:

The precedence order should be:

1. CLI flags (highest)
2. Environment variables
3. Config file
4. Defaults (lowest)

```typescript
// Example: search command integration
const searchCommand = Command.make(
  "search",
  {
    /* existing options */
  },
  (cliOptions) =>
    Effect.gen(function* () {
      const { config } = yield* Effect.promise(() => loadMdcontextConfig());

      // Merge: CLI flags override config
      const limit = cliOptions.limit ?? config.search.limit;
      const threshold = cliOptions.threshold ?? config.search.threshold;

      // ... rest of command
    }),
);
```

---

### 2.2 Add --config Flag to CLI

**Priority**: Medium
**Effort**: Small
**Dependencies**: 2.1

**Description**:
Add a global `--config` / `-c` flag to specify a custom config file path.

**Why it matters**:

- Allows per-invocation config file selection
- Enables testing with different configurations
- Common pattern in CLI tools (ESLint, Prettier, etc.)

**Implementation outline**:

```typescript
const configOption = Options.file("config").pipe(
  Options.withAlias("c"),
  Options.withDescription("Path to config file"),
  Options.optional,
);
```

---

### 2.3 Add Config Init Command

**Priority**: Low
**Effort**: Small
**Dependencies**: 1.2

**Description**:
Create a `mdcontext config init` command that generates a starter config file with sensible defaults.

**Why it matters**:

- Lowers barrier to config file usage
- Documents available options by example
- Common pattern in modern CLI tools

**Implementation outline**:

```bash
$ mdcontext config init
Created mdcontext.config.ts with default settings.

$ mdcontext config init --format json
Created .mdcontextrc with default settings.
```

---

## Phase 3: Environment Variables

### 3.1 Implement Prefix-Based Environment Variables

**Priority**: Medium
**Effort**: Small
**Dependencies**: 1.1

**Description**:
Support environment variables with `MDCONTEXT_` prefix that map to config keys.

**Why it matters**:

- Standard pattern for CLI configuration
- Enables CI/CD integration without config files
- Allows secrets to stay out of config files
- Works well with containerized environments

**Implementation outline**:

```
MDCONTEXT_LOG_LEVEL=debug
MDCONTEXT_EMBEDDINGS_PROVIDER=openai
MDCONTEXT_SEARCH_LIMIT=20
```

```typescript
// src/config/env.ts
import { z } from "zod";

const envSchema = z.object({
  MDCONTEXT_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  MDCONTEXT_EMBEDDINGS_PROVIDER: z.enum(["openai", "none"]).optional(),
  MDCONTEXT_EMBEDDINGS_MODEL: z.string().optional(),
  MDCONTEXT_SEARCH_LIMIT: z.coerce.number().positive().optional(),
  MDCONTEXT_SEARCH_THRESHOLD: z.coerce.number().min(0).max(1).optional(),
  OPENAI_API_KEY: z.string().optional(),
});

export function loadEnvConfig(): Partial<Config> {
  const env = envSchema.parse(process.env);
  // Map to config structure...
}
```

---

### 3.2 Improve API Key Handling with Redacted

**Priority**: Medium
**Effort**: Small
**Dependencies**: None (can be done independently)

**Description**:
Use Effect's `Redacted` type for handling sensitive values like API keys, preventing accidental logging.

**Why it matters**:

- Prevents secrets from appearing in logs or error messages
- First-class Effect pattern for security
- Shows `<redacted>` when converted to string

**Implementation outline**:

```typescript
import { Config, Redacted } from "effect";

// In config loading
const apiKey = yield * Config.redacted("OPENAI_API_KEY").pipe(Config.optional);

// Safe to log
console.log(`API Key: ${apiKey}`); // "API Key: <redacted>"

// Access value only when needed
const actualKey = Redacted.value(apiKey);
```

---

## Phase 4: Validation and Error Messages

### 4.1 Implement Friendly Config Validation Errors

**Priority**: High
**Effort**: Medium
**Dependencies**: 1.1

**Description**:
Create user-friendly error messages when config validation fails, showing what's wrong and how to fix it.

**Why it matters**:

- Reduces user frustration with config issues
- Faster debugging of configuration problems
- Professional CLI experience

**Implementation outline**:

```
$ mdcontext search "test"

Config Error: Invalid value in mdcontext.config.ts

  search.threshold: Expected number between 0 and 1, got "high"

  Hint: Use a decimal value like 0.45, not a string.

  Location: /path/to/mdcontext.config.ts:12:15
```

```typescript
// src/config/errors.ts
export function formatConfigError(
  error: z.ZodError,
  configFile?: string,
): string {
  // Format Zod errors into friendly messages
}
```

---

### 4.2 Add Config Validation Command

**Priority**: Low
**Effort**: Small
**Dependencies**: 4.1

**Description**:
Create a `mdcontext config check` command that validates the current configuration and reports any issues.

**Why it matters**:

- Allows users to verify config before running commands
- Useful for CI/CD pipelines
- Documents effective configuration (merged from all sources)

**Implementation outline**:

```bash
$ mdcontext config check
Config loaded from: /path/to/mdcontext.config.ts

Effective configuration:
  logLevel: info
  embeddings.provider: openai
  embeddings.model: text-embedding-3-small
  search.limit: 10
  search.threshold: 0.45
  ...

No issues found.
```

---

## Phase 5: Type Safety Improvements

### 5.1 Create Effect Layer for Configuration

**Priority**: Medium
**Effort**: Medium
**Dependencies**: 1.3, Full Effect adoption decision

**Description**:
Wrap configuration in an Effect Layer for dependency injection, enabling cleaner testing and composition.

**Why it matters**:

- Enables mock config injection for testing
- Follows Effect best practices
- Prepares for broader Effect adoption
- Cleaner separation of concerns

**Implementation outline**:

```typescript
// src/config/layer.ts
import { Context, Layer, Effect } from "effect"
import type { Config } from "./schema"

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  Config
>() {}

export const ConfigLive = Layer.effect(
  ConfigService,
  Effect.gen(function* () {
    const { config } = yield* Effect.promise(() => loadMdcontextConfig())
    return config
  })
)

// In commands
const searchCommand = Command.make("search", {...}, (opts) =>
  Effect.gen(function* () {
    const config = yield* ConfigService
    // use config...
  }).pipe(Effect.provide(ConfigLive))
)
```

---

### 5.2 Add Schema-Based Config Type Generation

**Priority**: Low
**Effort**: Small
**Dependencies**: 1.1

**Description**:
Generate JSON Schema from Zod schema for IDE support in JSON/YAML config files.

**Why it matters**:

- Enables autocomplete in VS Code for JSON configs
- Documents all options in a standard format
- Can be published for external tool integration

**Implementation outline**:

```typescript
// scripts/generate-schema.ts
import { zodToJsonSchema } from "zod-to-json-schema";
import { ConfigSchema } from "../src/config/schema";

const jsonSchema = zodToJsonSchema(ConfigSchema, "MdcontextConfig");
// Write to schema.json
```

Users can then reference it:

```json
{
  "$schema": "https://raw.githubusercontent.com/user/mdcontext/main/schema.json",
  "logLevel": "debug"
}
```

---

## Phase 6: Testing Infrastructure

### 6.1 Add Config Testing Utilities

**Priority**: Medium
**Effort**: Small
**Dependencies**: 1.3

**Description**:
Create test utilities for providing mock configurations in tests.

**Why it matters**:

- Enables isolated testing of commands with different configs
- Reduces test setup boilerplate
- Makes tests more reliable and deterministic

**Implementation outline**:

```typescript
// src/config/testing.ts
import { ConfigSchema, type Config } from "./schema";

export function createTestConfig(overrides: Partial<Config> = {}): Config {
  return ConfigSchema.parse({
    ...ConfigSchema.parse({}),
    ...overrides,
  });
}

export function withMockConfig(config: Partial<Config>) {
  return Layer.succeed(ConfigService, createTestConfig(config));
}
```

```typescript
// In tests
describe("search command", () => {
  it("respects config limit", async () => {
    const result = await Effect.runPromise(
      searchCommand({ query: "test" }).pipe(
        Effect.provide(withMockConfig({ search: { limit: 5 } })),
      ),
    );
    expect(result.length).toBeLessThanOrEqual(5);
  });
});
```

---

### 6.2 Add Config Integration Tests

**Priority**: Medium
**Effort**: Medium
**Dependencies**: 6.1

**Description**:
Add integration tests that verify config loading from files, environment variables, and CLI flags work together correctly.

**Why it matters**:

- Ensures precedence order works correctly
- Validates config merging behavior
- Catches regressions in config handling

**Implementation outline**:

```typescript
describe("config precedence", () => {
  it("CLI flags override config file", async () => {
    // Create temp config file with limit: 10
    // Run with --limit 5
    // Verify limit is 5
  });

  it("env vars override config file", async () => {
    // Create temp config file with limit: 10
    // Set MDCONTEXT_SEARCH_LIMIT=5
    // Run command
    // Verify limit is 5
  });

  it("config file overrides defaults", async () => {
    // Create temp config file with limit: 20
    // Run command without flags
    // Verify limit is 20
  });
});
```

---

## Phase 7: Documentation

### 7.1 Document Configuration Options

**Priority**: High
**Effort**: Medium
**Dependencies**: 1.1

**Description**:
Create comprehensive documentation for all configuration options, including examples for different formats.

**Why it matters**:

- Users can't use features they don't know about
- Reduces support burden
- Establishes mdcontext as a professional tool

**Implementation outline**:

- Add `docs/configuration.md` with:
  - All config options with descriptions
  - TypeScript config example
  - JSON config example
  - Environment variable mapping
  - Precedence explanation

---

### 7.2 Add Configuration Section to Help Output

**Priority**: Low
**Effort**: Small
**Dependencies**: 7.1

**Description**:
Update `--help` output to mention configuration file support and point to documentation.

**Why it matters**:

- Discoverability of config features
- Consistent with other modern CLI tools

**Implementation outline**:

```
CONFIGURATION
  mdcontext reads configuration from (in order of precedence):
    1. CLI flags
    2. Environment variables (MDCONTEXT_*)
    3. Config file (mdcontext.config.ts or .mdcontextrc)
    4. Built-in defaults

  Run "mdcontext config init" to create a config file.
  See https://github.com/user/mdcontext#configuration for details.
```

---

## Summary: Implementation Order

| Phase                        | Tasks         | Total Effort | Priority    |
| ---------------------------- | ------------- | ------------ | ----------- |
| **1. Foundation**            | 1.1, 1.2, 1.3 | Medium       | High        |
| **2. CLI Integration**       | 2.1, 2.2, 2.3 | Medium       | High/Medium |
| **3. Environment Variables** | 3.1, 3.2      | Small        | Medium      |
| **4. Validation**            | 4.1, 4.2      | Medium       | High/Low    |
| **5. Type Safety**           | 5.1, 5.2      | Medium       | Medium/Low  |
| **6. Testing**               | 6.1, 6.2      | Medium       | Medium      |
| **7. Documentation**         | 7.1, 7.2      | Medium       | High/Low    |

**Recommended MVP**: Tasks 1.1, 1.2, 1.3, 2.1, 4.1, 7.1

This provides:

- Working config file support
- CLI integration
- Good error messages
- Documentation

Everything else can be added incrementally.

---

## Dependencies Graph

```
1.1 (Schema) ─────┬─► 1.2 (defineConfig) ─► 1.3 (Loader) ─► 2.1 (CLI Integration)
                  │                                          │
                  │                                          ├─► 2.2 (--config flag)
                  │                                          │
                  ├─► 3.1 (Env Vars) ◄─────────────────────┘
                  │
                  ├─► 4.1 (Validation Errors) ─► 4.2 (config check)
                  │
                  ├─► 5.2 (JSON Schema)
                  │
                  └─► 7.1 (Documentation)

1.3 (Loader) ─────┬─► 5.1 (Effect Layer) ─► 6.1 (Test Utils) ─► 6.2 (Integration Tests)
                  │
                  └─► 2.3 (config init)

3.2 (Redacted) ──── (Independent)
```

---

_Created: 2026-01-21_
