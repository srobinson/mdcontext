# Configuration Management Research for TypeScript CLI Tools (2026)

## Executive Summary

This research explores configuration management best practices for modern TypeScript CLI tools in 2026. The goal is to determine the optimal configuration approach for the `mdcontext` project, considering developer experience, type safety, flexibility, and ecosystem alignment.

**Key Finding**: The modern TypeScript ecosystem has largely converged on **TypeScript/JavaScript config files** with `defineConfig` helpers for type inference, combined with **environment variable overrides** and **Zod for runtime validation**. TOML remains excellent for simpler, human-edited configs but lacks the ecosystem momentum of TS config files.

**Recommendation for mdcontext**: Use **c12 (UnJS)** as the config loader with a **TypeScript config file** (`mdcontext.config.ts`) as the primary format, **Zod** for validation, and a clear precedence hierarchy: CLI flags > env vars > config file > defaults.

---

## 1. Current Landscape Overview

### What Are Modern TS Projects Using in 2026?

| Tool         | Config Format                | Config Library          | Notes                                       |
| ------------ | ---------------------------- | ----------------------- | ------------------------------------------- |
| **Vite**     | `vite.config.ts`             | Native + `defineConfig` | TypeScript-first, uses esbuild for loading  |
| **Vitest**   | `vitest.config.ts`           | Same as Vite            | Inherits Vite's config system               |
| **Next.js**  | `next.config.ts`             | Native (Node 22+)       | Added TS support in Next.js 15              |
| **Nuxt**     | `nuxt.config.ts`             | c12 (UnJS)              | `defineNuxtConfig` helper                   |
| **ESLint**   | `eslint.config.ts`           | Native + jiti           | Flat config, `defineConfig` since v9.22     |
| **Biome**    | `biome.json` / `biome.jsonc` | Native                  | JSON-only, schema-validated                 |
| **Prettier** | `prettier.config.ts`         | Native (Node 22+)       | TS support added in Prettier 3.5 (Feb 2025) |
| **tsup**     | `tsup.config.ts`             | Native                  | `defineConfig` helper                       |
| **Vercel**   | `vercel.json` + `vercel.ts`  | Native                  | Programmatic TS config available            |

**Trend**: TypeScript config files with `defineConfig` helpers have become the dominant pattern. The "cool kids" (Vite ecosystem, UnJS, Vercel) all support or prefer TS config.

### Sources

- [Configuring Vite](https://vite.dev/config/)
- [Next.js Configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js)
- [Nuxt Configuration](https://nuxt.com/docs/4.x/directory-structure/nuxt-config)
- [ESLint Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Prettier Configuration](https://prettier.io/docs/configuration)
- [Biome Configuration](https://biomejs.dev/guides/configure-biome/)

---

## 2. Format Comparison: TOML vs YAML vs JSON vs TS

### Comparison Matrix

| Feature                    | JSON       | JSONC      | YAML       | TOML       | TypeScript |
| -------------------------- | ---------- | ---------- | ---------- | ---------- | ---------- |
| **Comments**               | No         | Yes        | Yes        | Yes        | Yes        |
| **Type inference**         | Via schema | Via schema | Via schema | Via schema | Native     |
| **IDE support**            | Excellent  | Good       | Good       | Good       | Excellent  |
| **Programmatic logic**     | No         | No         | No         | No         | Yes        |
| **Env var interpolation**  | No         | No         | No         | No         | Yes        |
| **Human readability**      | Medium     | Medium     | High       | High       | Medium     |
| **Nested data**            | Good       | Good       | Good       | Verbose    | Good       |
| **Native Node.js support** | Yes        | No         | No         | No         | Node 22+   |
| **Parse errors**           | Clear      | Clear      | Confusing  | Clear      | Excellent  |

### Format Details

#### JSON / JSONC

**Pros**:

- Universal support, native to Node.js
- Every editor highlights it, every language parses it
- `$schema` enables autocomplete (used by Biome, Vercel)

**Cons**:

- No comments in standard JSON (JSONC adds them)
- No programmatic logic or environment interpolation
- Verbose for deeply nested structures

**Best for**: Simple, static configs; package.json-style metadata; schema-validated configs

#### YAML

**Pros**:

- High readability, minimal syntax noise
- Supports comments, anchors for reuse
- Standard in DevOps (Kubernetes, GitHub Actions, Docker Compose)

**Cons**:

- Indentation-sensitive (easy to break)
- Implicit type coercion causes bugs (`yes` becomes `true`, `3.10` becomes `3.1`)
- More complex to parse than JSON

**Best for**: DevOps configs, CI/CD, when already in YAML-heavy ecosystem

#### TOML

**Pros**:

- Designed explicitly for configuration files
- Excellent readability with explicit typing
- Supports comments, dates natively
- No indentation ambiguity
- Popular in Rust (Cargo), Python (pyproject.toml), Go ecosystems

**Cons**:

- Verbose for deeply nested data (`[section.subsection]`)
- Smaller ecosystem in JavaScript/Node.js
- No native browser/Node.js support (needs parser)
- Limited toolchain support compared to JSON

**Best for**: Application configuration, when human editing is primary, cross-language projects

#### TypeScript Config Files

**Pros**:

- Native type inference with `defineConfig`
- Full programmatic power (conditionals, env vars, imports)
- IDE autocomplete and error checking without schemas
- Can import other modules, share config
- Supports environment-specific logic

**Cons**:

- Requires transpilation (jiti, esbuild, or Node 22+)
- Not suitable for non-developer editing
- Harder to parse/validate from external tools

**Best for**: Developer tools, build systems, complex configs with logic

### Sources

- [JSON vs YAML vs TOML: Which Configuration Format Should You Use in 2026?](https://dev.to/jsontoall_tools/json-vs-yaml-vs-toml-which-configuration-format-should-you-use-in-2026-1hlb)
- [TOML vs YAML vs JSON: Complete Comparison](https://jsontoyamlconverter.com/yaml-vs-json/toml/)
- [JSON vs YAML vs TOML vs XML: Best Data Format in 2025](https://leapcell.io/blog/json-yaml-toml-xml-best-choice-2025)

---

## 3. Popular Config Libraries for Node.js/TypeScript

### c12 (UnJS) - **Recommended**

The "smart configuration loader" from the UnJS ecosystem (Nuxt, Nitro, etc.).

**Features**:

- Loads `.js`, `.ts`, `.mjs`, `.cjs`, `.mts`, `.cts`, `.json` via jiti
- Loads `.jsonc`, `.json5`, `.yaml`, `.yml`, `.toml` via confbox
- `.config/` directory support
- `.rc` file support (`.foorc`)
- `.env` support with dotenv
- Extends configurations from multiple sources (local, git, npm)
- Config watcher with HMR
- Deep merging with defu
- Environment-specific overrides (`$development`, `$production`)

**Usage**:

```typescript
import { loadConfig } from "c12";

const { config, configFile, layers } = await loadConfig({
  name: "mdcontext", // Loads mdcontext.config.ts, .mdcontextrc
  defaults: { port: 3000 }, // Lowest priority
  overrides: { debug: true }, // Highest priority
  dotenv: true, // Load .env
  packageJson: true, // Read from package.json
});
```

**Config file example** (`mdcontext.config.ts`):

```typescript
export default {
  // Default configuration
  logLevel: "info",

  // Environment overrides (automatic)
  $development: { logLevel: "debug" },
  $production: { logLevel: "error" },

  // Extend from other configs
  extends: ["./base.config"],
};
```

**Used by**: Nuxt, Nitro, Prisma, WXT, Hey API, Trigger.dev

### cosmiconfig

The original "find and load configuration" library.

**Features**:

- Searches multiple locations (`.rc`, `.config/`, `package.json`)
- Supports JSON, YAML, JS, TS (via loader)
- Customizable search paths
- Caching for performance
- Async and sync APIs

**Usage**:

```typescript
import { cosmiconfig } from "cosmiconfig";

const explorer = cosmiconfig("mdcontext");
const result = await explorer.search();
// Finds: .mdcontextrc, .mdcontextrc.json, mdcontext.config.js, etc.
```

**Pros**: Battle-tested, widely used, flexible search
**Cons**: TypeScript support requires additional loader (cosmiconfig-typescript-loader), more configuration needed

### rc9 (UnJS)

Simple RC file read/write, often used with c12.

**Features**:

- Read/write `.rc` files
- User-level configs (`~/.foorc`)
- System-level configs
- Flat configuration format

**Usage**:

```typescript
import { read, write, update } from "rc9";

// Read from .mdcontextrc
const config = read(".mdcontextrc");

// Read from user home directory
const userConfig = readUser(".mdcontextrc"); // ~/.mdcontextrc
```

### node-config

Enterprise-focused, environment-based configuration.

**Features**:

- Environment-specific files (`default.json`, `production.json`)
- Deep merging of config files
- Custom environment variables
- Deferred values

**Pros**: Great for multi-environment deployments
**Cons**: Heavier, more enterprise-focused, less TS-native

### Sources

- [c12 GitHub](https://github.com/unjs/c12)
- [c12 UnJS](https://unjs.io/packages/c12/)
- [cosmiconfig GitHub](https://github.com/cosmiconfig/cosmiconfig)
- [rc9 GitHub](https://github.com/unjs/rc9)
- [node-config Wiki](https://github.com/node-config/node-config/wiki)

---

## 4. Environment Variable Override Patterns

### Standard Precedence Order (Highest to Lowest)

1. **CLI flags** (e.g., `--port 8080`)
2. **Environment variables** (e.g., `PORT=8080`)
3. **Environment files** (`.env`, `.env.local`)
4. **Config files** (e.g., `mdcontext.config.ts`)
5. **Default values** (in code)

This is the order used by Yargs, node-config, and most modern tools.

### Pattern 1: Prefix-Based Env Vars

Map env vars with a prefix to config keys:

```
MDCONTEXT_LOG_LEVEL=debug  →  config.logLevel
MDCONTEXT_PORT=8080        →  config.port
```

**Implementation with c12**:

```typescript
// c12 doesn't auto-map env vars, but you can use overrides
import { loadConfig } from "c12";

const envOverrides = {
  logLevel: process.env.MDCONTEXT_LOG_LEVEL,
  port: process.env.MDCONTEXT_PORT
    ? parseInt(process.env.MDCONTEXT_PORT)
    : undefined,
};

const { config } = await loadConfig({
  name: "mdcontext",
  overrides: Object.fromEntries(
    Object.entries(envOverrides).filter(([_, v]) => v !== undefined),
  ),
});
```

### Pattern 2: dotenv Integration

Load `.env` files and merge with config:

```typescript
import { loadConfig } from "c12";

const { config } = await loadConfig({
  name: "mdcontext",
  dotenv: true, // Loads .env automatically
});
```

### Pattern 3: Zod Transform

Use Zod to coerce and validate env vars:

```typescript
import { z } from "zod";

const envSchema = z.object({
  MDCONTEXT_LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
  MDCONTEXT_PORT: z.coerce.number().default(3000),
});

const env = envSchema.parse(process.env);
```

### Sources

- [node-config Environment Variables](https://github.com/node-config/node-config/wiki/Environment-Variables)
- [Node.js CLI Documentation](https://nodejs.org/api/cli.html)
- [Yargs Precedence Discussion](https://github.com/yargs/yargs/issues/627)

---

## 5. Type Safety: Getting TypeScript Types from Config

### Pattern 1: `defineConfig` Helper (Recommended)

The modern pattern used by Vite, ESLint, Nuxt, and tsup.

```typescript
// mdcontext.config.ts
import { defineConfig } from "mdcontext";

export default defineConfig({
  logLevel: "info",
  watch: {
    enabled: true,
    debounce: 100,
  },
});
```

**Implementation**:

```typescript
// src/config/define.ts
import type { Config } from "./schema";

export function defineConfig(config: Config): Config {
  return config;
}
```

This is a pass-through function that provides type inference in the config file.

### Pattern 2: Zod Schema with Type Inference

Define schema once, get both validation and types:

```typescript
// src/config/schema.ts
import { z } from "zod";

export const ConfigSchema = z.object({
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  watch: z
    .object({
      enabled: z.boolean().default(true),
      debounce: z.number().min(0).default(100),
    })
    .default({}),
  embeddings: z
    .object({
      provider: z.enum(["openai", "local"]).default("openai"),
      model: z.string().optional(),
    })
    .default({}),
});

// Infer type from schema
export type Config = z.infer<typeof ConfigSchema>;
```

**Usage**:

```typescript
import { loadConfig } from "c12";
import { ConfigSchema, type Config } from "./schema";

export async function loadMdcontextConfig(): Promise<Config> {
  const { config } = await loadConfig({ name: "mdcontext" });
  return ConfigSchema.parse(config);
}
```

### Pattern 3: JSON Schema (for JSON/JSONC configs)

For tools like Biome and Vercel that use JSON:

```json
{
  "$schema": "https://mdcontext.dev/schema.json",
  "logLevel": "info"
}
```

Provides autocomplete in editors via JSON Schema.

### Sources

- [Type your Config - Anthony Fu](https://antfu.me/posts/type-your-config)
- [Zod Documentation](https://zod.dev/)
- [ESLint defineConfig](https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/)

---

## 6. Hierarchical/Cascading Configuration

### Level Hierarchy

Modern tools typically support three levels:

1. **Project-level** (`./<name>.config.ts`, `./.<name>rc`)
2. **User-level** (`~/.config/<name>/config.ts`, `~/.<name>rc`)
3. **System-level** (`/etc/<name>/config.ts`) - less common

### c12 Implementation

c12 supports this via `globalRc`:

```typescript
import { loadConfig } from "c12";

const { config, layers } = await loadConfig({
  name: "mdcontext",
  globalRc: true, // Loads from ~/.mdcontextrc
});

// layers shows the merge order:
// [
//   { config: {...}, configFile: "/home/user/.mdcontextrc" },
//   { config: {...}, configFile: "/project/mdcontext.config.ts" },
// ]
```

### XDG Base Directory Compliance

For cross-platform user configs, follow XDG conventions:

```typescript
import envPaths from "env-paths";

const paths = envPaths("mdcontext");
// paths.config → ~/.config/mdcontext (Linux)
// paths.config → ~/Library/Preferences/mdcontext (macOS)
// paths.config → %APPDATA%\mdcontext\Config (Windows)
```

Use `env-paths` for macOS/Windows, `xdg-basedir` for Linux-only.

### Sources

- [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/)
- [env-paths GitHub](https://github.com/sindresorhus/env-paths)
- [xdg-basedir GitHub](https://github.com/sindresorhus/xdg-basedir)

---

## 7. What the "Cool Kids" Actually Use

### Vercel Ecosystem

- **Next.js**: `next.config.ts` with `NextConfig` type, supports TS natively in Node 22+
- **Vercel CLI**: `vercel.json` (static) + `vercel.ts` (programmatic)
- Pattern: JSON for simple, TS for complex

### UnJS / Nuxt Ecosystem

- **Nuxt**: `nuxt.config.ts` with `defineNuxtConfig`, powered by c12
- **Nitro**: Uses c12 for configuration
- **Vite**: `vite.config.ts` with `defineConfig`
- Pattern: Always TypeScript, always `defineConfig` helper

### Biome

- **Format**: `biome.json` or `biome.jsonc` only
- **Philosophy**: JSON for simplicity, schema for validation
- Pattern: JSON with `$schema` for autocomplete

### ESLint

- **Format**: `eslint.config.ts` (flat config, since ESLint 9)
- **Helper**: `defineConfig` (since v9.22)
- **TypeScript**: Requires jiti or Node 22+
- Pattern: TypeScript config with extends for composition

### Summary

The "cool kids" (Vite, Nuxt, Vercel) prefer:

1. **TypeScript config files** as primary format
2. **`defineConfig` helper** for type inference
3. **Programmatic configs** over static JSON/YAML
4. **Environment-specific overrides** built into the config system

---

## 8. Recommendation for mdcontext

### Primary Approach: TypeScript Config with c12

**Rationale**:

- Aligns with the TypeScript ecosystem mdcontext is built on
- c12 is production-proven (Nuxt, Nitro, Prisma)
- Supports all formats if users prefer TOML/YAML
- Built-in environment overrides, extends, and watch support
- Works with the UnJS ecosystem mdcontext might integrate with

### Implementation Plan

#### 1. Config Schema with Zod

```typescript
// src/config/schema.ts
import { z } from "zod";

export const ConfigSchema = z.object({
  // Core settings
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Watch settings
  watch: z
    .object({
      enabled: z.boolean().default(true),
      debounce: z.number().min(0).default(100),
      ignore: z.array(z.string()).default(["**/node_modules/**", "**/.git/**"]),
    })
    .default({}),

  // Embeddings
  embeddings: z
    .object({
      provider: z.enum(["openai", "local", "none"]).default("none"),
      model: z.string().optional(),
      apiKey: z.string().optional(),
    })
    .default({}),

  // Output
  output: z
    .object({
      format: z.enum(["json", "markdown", "compact"]).default("json"),
      tokenBudget: z.number().positive().optional(),
    })
    .default({}),

  // Extends other configs
  extends: z.union([z.string(), z.array(z.string())]).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;
```

#### 2. defineConfig Helper

````typescript
// src/config/define.ts
import type { Config } from "./schema";

/**
 * Define mdcontext configuration with full type inference.
 *
 * @example
 * ```ts
 * // mdcontext.config.ts
 * import { defineConfig } from "mdcontext";
 *
 * export default defineConfig({
 *   logLevel: "debug",
 *   embeddings: {
 *     provider: "openai",
 *   },
 * });
 * ```
 */
export function defineConfig(config: Partial<Config>): Partial<Config> {
  return config;
}
````

#### 3. Config Loader

```typescript
// src/config/loader.ts
import { loadConfig } from "c12";
import { ConfigSchema, type Config } from "./schema";

export interface LoadConfigOptions {
  cwd?: string;
  overrides?: Partial<Config>;
}

export async function loadMdcontextConfig(
  options: LoadConfigOptions = {},
): Promise<{ config: Config; configFile?: string }> {
  const { config: rawConfig, configFile } = await loadConfig({
    name: "mdcontext",
    cwd: options.cwd,
    defaults: ConfigSchema.parse({}), // Apply defaults
    overrides: options.overrides,
    dotenv: true,
    globalRc: true,
  });

  // Validate with Zod
  const config = ConfigSchema.parse(rawConfig);

  return { config, configFile };
}
```

#### 4. CLI Integration

```typescript
// src/cli/index.ts
import { defineCommand, runMain } from "citty";
import { loadMdcontextConfig } from "../config/loader";

const main = defineCommand({
  meta: {
    name: "mdcontext",
    version: "1.0.0",
  },
  args: {
    logLevel: {
      type: "string",
      description: "Log level (debug, info, warn, error)",
    },
    config: {
      type: "string",
      alias: "c",
      description: "Path to config file",
    },
  },
  async run({ args }) {
    // CLI flags override config
    const overrides: Partial<Config> = {};
    if (args.logLevel) overrides.logLevel = args.logLevel;

    const { config } = await loadMdcontextConfig({ overrides });
    // Use config...
  },
});

runMain(main);
```

#### 5. Example Config File

```typescript
// mdcontext.config.ts
import { defineConfig } from "mdcontext";

export default defineConfig({
  logLevel: "info",

  watch: {
    enabled: true,
    debounce: 200,
    ignore: ["**/node_modules/**", "**/dist/**"],
  },

  embeddings: {
    provider: "openai",
    model: "text-embedding-3-small",
  },

  // Environment-specific overrides
  $development: {
    logLevel: "debug",
  },

  $production: {
    logLevel: "warn",
  },
});
```

### Precedence Order

1. **CLI flags** (`--log-level debug`)
2. **Environment variables** (`MDCONTEXT_LOG_LEVEL=debug`)
3. **Environment files** (`.env`, `.env.local`)
4. **Project config** (`./mdcontext.config.ts`, `./.mdcontextrc`)
5. **User config** (`~/.config/mdcontext/config.ts`)
6. **Default values** (from Zod schema)

### Migration Path

1. **No config**: Tool works with sensible defaults from Zod schema
2. **Simple config**: Users can create `.mdcontextrc` (JSON) or `mdcontext.config.ts`
3. **Advanced config**: Full TypeScript with extends, env overrides, etc.

### Dependencies

```json
{
  "dependencies": {
    "c12": "^2.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "citty": "^0.1.6"
  }
}
```

---

## 9. Alternative: TOML-First Approach

If mdcontext prioritizes human-edited configs over programmatic configs:

### When to Use TOML

- Non-developer users edit config (rare for CLI tools)
- Cross-language ecosystem (Rust, Python, Go)
- Simple, flat configuration structure
- Comments are critical for documentation

### TOML Implementation with c12

c12 supports TOML natively via confbox:

```toml
# mdcontext.toml
log_level = "info"

[watch]
enabled = true
debounce = 100

[embeddings]
provider = "openai"
model = "text-embedding-3-small"
```

```typescript
import { loadConfig } from "c12";

const { config } = await loadConfig({
  name: "mdcontext",
  configFile: "mdcontext.toml", // Explicit TOML
});
```

### Recommendation

For mdcontext, **TypeScript config is recommended** over TOML because:

1. Target audience is developers who know TypeScript
2. Programmatic power (conditionals, env interpolation) is valuable
3. Better IDE support without additional schema setup
4. Aligns with the TypeScript/Effect ecosystem

---

## 10. Summary: Key Decisions

| Decision                | Choice                             | Rationale                                            |
| ----------------------- | ---------------------------------- | ---------------------------------------------------- |
| **Config library**      | c12 (UnJS)                         | Production-proven, multi-format, ecosystem alignment |
| **Primary format**      | TypeScript (`mdcontext.config.ts`) | Type inference, programmatic power                   |
| **Type safety**         | Zod + `defineConfig`               | Runtime validation + DX                              |
| **Fallback formats**    | `.mdcontextrc` (JSON), TOML, YAML  | c12 supports all via confbox                         |
| **Env vars**            | Prefix-based + dotenv              | `MDCONTEXT_*` pattern                                |
| **Hierarchical config** | Project > User via c12 globalRc    | Standard hierarchy                                   |
| **CLI integration**     | citty (UnJS)                       | Modern, typed, lightweight                           |

---

## References

### Libraries

- [c12 - Smart Configuration Loader](https://github.com/unjs/c12)
- [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)
- [rc9 - RC File Handler](https://github.com/unjs/rc9)
- [jiti - Runtime TypeScript](https://github.com/unjs/jiti)
- [confbox - Config Parsers](https://github.com/unjs/confbox)
- [citty - CLI Builder](https://github.com/unjs/citty)
- [Zod - Schema Validation](https://zod.dev/)
- [env-paths - Cross-Platform Paths](https://github.com/sindresorhus/env-paths)

### Documentation

- [Vite Configuration](https://vite.dev/config/)
- [Next.js Configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js)
- [Nuxt Configuration](https://nuxt.com/docs/4.x/directory-structure/nuxt-config)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Biome Configuration](https://biomejs.dev/guides/configure-biome/)
- [Prettier Configuration](https://prettier.io/docs/configuration)

### Articles

- [Type your Config - Anthony Fu](https://antfu.me/posts/type-your-config)
- [JSON vs YAML vs TOML - 2025 Comparison](https://leapcell.io/blog/json-yaml-toml-xml-best-choice-2025)
- [ESLint defineConfig Introduction](https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/)

---

_Research completed: 2026-01-21_
