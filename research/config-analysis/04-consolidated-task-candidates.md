# Consolidated Configuration Tasks for mdcontext

**Context**: mdcontext already uses `@effect/cli`. This means the Effect ecosystem has lower adoption friction, and Effect Config + Layers is the recommended approach (not c12/citty/Zod).

**Strategy**: Full Effect-native configuration using `Config`, `ConfigProvider`, and `Layer` patterns.

---

## Phase 1: Effect Config Foundation

### Task 1: Create Effect Config Schema Module

**Priority**: High
**Effort**: Small (2-4 hours)
**Dependencies**: None

**Description**: Define all configuration options using Effect's `Config` combinators (`Config.string`, `Config.number`, `Config.literal`, etc.). This replaces the Zod schema approach and provides native integration with Effect's ConfigProvider system.

**Why it matters**: Effect Config provides compile-time tracking of config requirements through the type system, eliminating runtime-only validation errors and enabling cleaner dependency injection.

---

### Task 2: Create ConfigService Layer

**Priority**: High
**Effort**: Small (2-4 hours)
**Dependencies**: Task 1

**Description**: Wrap configuration in an Effect `Context.Tag` and `Layer`, enabling dependency injection throughout the application. Services will access config via `yield* ConfigService` rather than direct function parameters.

**Why it matters**: Layer-based config enables test isolation without mocking, follows Effect best practices, and provides consistent config access across all commands and services.

---

### Task 3: Implement File-based ConfigProvider

**Priority**: High
**Effort**: Medium (1-2 days)
**Dependencies**: Task 1

**Description**: Create a custom `ConfigProvider` that reads from `mdcontext.config.ts` (or `.json`/`.yaml`). Use `ConfigProvider.fromMap` or `ConfigProvider.nested` to map file contents to the Effect config namespace.

**Why it matters**: Enables persistent configuration without repeating CLI flags. Users expect config file support in modern CLI tools.

---

### Task 4: Implement Config Precedence Chain

**Priority**: High
**Effort**: Medium (4-8 hours)
**Dependencies**: Task 3

**Description**: Compose ConfigProviders using `ConfigProvider.orElse` to establish precedence: CLI flags > Environment variables > Config file > Defaults. Effect's ConfigProvider composition makes this elegant.

**Why it matters**: Standard CLI behavior. Users expect CLI flags to override everything, env vars to override files, and sensible defaults when nothing is specified.

---

## Phase 2: CLI Integration

### Task 5: Integrate Config Layer with CLI Commands

**Priority**: High
**Effort**: Medium (1-2 days)
**Dependencies**: Task 2, Task 4

**Description**: Modify all CLI command handlers to `yield* ConfigService` instead of using inline defaults. Update `@effect/cli` Options to use `Config` values as defaults where appropriate. Each command should `.pipe(Effect.provide(ConfigLive))`.

**Why it matters**: Completes the config system integration. Users can now set persistent defaults in config files that CLI commands respect.

---

### Task 6: Add Global --config Flag

**Priority**: Medium
**Effort**: Small (2-4 hours)
**Dependencies**: Task 5

**Description**: Add `Options.file("config").pipe(Options.withAlias("c"))` as a global option that overrides the config file search path. Pass this to the ConfigProvider construction.

**Why it matters**: Allows per-invocation config file selection, useful for testing and multi-project setups.

---

### Task 7: Add config init Subcommand

**Priority**: Low
**Effort**: Small (2-4 hours)
**Dependencies**: Task 3

**Description**: Create `mdcontext config init` command that generates a starter `mdcontext.config.ts` with `defineConfig()` helper and documented defaults.

**Why it matters**: Lowers barrier to config adoption and documents available options by example.

---

## Phase 3: Environment & Secrets

### Task 8: Implement MDCONTEXT\_ Environment Variable Mapping

**Priority**: Medium
**Effort**: Small (2-4 hours)
**Dependencies**: Task 1

**Description**: Configure Effect's default `ConfigProvider.fromEnv()` with nested path support (`MDCONTEXT_SEARCH_LIMIT` maps to `search.limit`). Use `Config.nested("mdcontext")` pattern.

**Why it matters**: Standard pattern for CI/CD integration and containerized environments. Keeps secrets out of config files.

---

### Task 9: Use Effect Redacted for API Keys

**Priority**: Medium
**Effort**: Small (1-2 hours)
**Dependencies**: None

**Description**: Replace `process.env.OPENAI_API_KEY` with `Config.redacted("OPENAI_API_KEY")`. Update `OpenAIProvider` to accept `Redacted<string>` and use `Redacted.value()` only when making API calls.

**Why it matters**: Prevents API keys from appearing in logs or error messages. Effect's `Redacted` type shows `<redacted>` when stringified.

---

## Phase 4: Validation & Errors

### Task 10: Implement User-friendly Config Errors

**Priority**: High
**Effort**: Medium (4-8 hours)
**Dependencies**: Task 3

**Description**: Create a custom error formatter for `ConfigError` that shows file location, expected type, actual value, and hints. Use `Effect.catchTag("ConfigError", ...)` to intercept and format errors before CLI output.

**Why it matters**: Good error messages dramatically reduce user frustration. Config errors should guide users to the fix, not just report the problem.

---

### Task 11: Add config check Subcommand

**Priority**: Low
**Effort**: Small (2-4 hours)
**Dependencies**: Task 10

**Description**: Create `mdcontext config check` that validates configuration and displays the effective merged config from all sources (file, env, defaults).

**Why it matters**: Useful for debugging config issues and CI/CD validation. Shows users what config values are actually in effect.

---

## Phase 5: Testing Infrastructure

### Task 12: Create Config Testing Utilities

**Priority**: Medium
**Effort**: Small (2-4 hours)
**Dependencies**: Task 2

**Description**: Export `TestConfigLayer` helpers that provide mock config via `Layer.succeed(ConfigService, {...})`. Create `withTestConfig(overrides)` utility for partial config in tests.

**Why it matters**: Enables isolated testing without environment pollution. Tests can run in parallel with different configs.

---

### Task 13: Add Config Integration Tests

**Priority**: Medium
**Effort**: Medium (4-8 hours)
**Dependencies**: Task 12, Task 4

**Description**: Write integration tests verifying: (1) CLI flags override config file, (2) env vars override config file, (3) config file overrides defaults, (4) invalid config produces friendly errors.

**Why it matters**: Validates the precedence chain works correctly. Catches regressions in config handling.

---

## Phase 6: Consolidation & Cleanup

### Task 14: Extract Hardcoded Constants to Config

**Priority**: Medium
**Effort**: Medium (1-2 days)
**Dependencies**: Task 5

**Description**: Move hardcoded values from `summarizer.ts` (TOKEN_BUDGETS, compression ratios), `openai-provider.ts` (model, batch size), `searcher.ts` (limits, thresholds), and other files to ConfigService. Keep constants as defaults in the Config definition.

**Why it matters**: Enables user customization of currently hardcoded behavior. Centralizes "magic numbers" for easier maintenance.

---

### Task 15: Version from package.json

**Priority**: Low
**Effort**: Small (1-2 hours)
**Dependencies**: None

**Description**: Replace hardcoded `'0.1.0'` in `main.ts` and `mcp/server.ts` with dynamic version read from `package.json`. Use `Effect.sync(() => require('../package.json').version)` or import assertion.

**Why it matters**: Version should match package.json automatically. Eliminates manual version sync across files.

---

## Phase 7: Documentation

### Task 16: Document Configuration System

**Priority**: High
**Effort**: Medium (4-8 hours)
**Dependencies**: Task 5

**Description**: Create configuration documentation covering: all options with descriptions, TypeScript config file example, environment variable mapping, precedence explanation, and migration guide from CLI-only usage.

**Why it matters**: Users can't use features they don't know about. Good docs reduce support burden and establish mdcontext as a professional tool.

---

## Summary

| Phase              | Tasks      | Effort | Priority Focus |
| ------------------ | ---------- | ------ | -------------- |
| 1. Foundation      | 1, 2, 3, 4 | Medium | High           |
| 2. CLI Integration | 5, 6, 7    | Medium | High/Medium    |
| 3. Environment     | 8, 9       | Small  | Medium         |
| 4. Validation      | 10, 11     | Medium | High/Low       |
| 5. Testing         | 12, 13     | Medium | Medium         |
| 6. Cleanup         | 14, 15     | Medium | Medium/Low     |
| 7. Documentation   | 16         | Medium | High           |

### Recommended MVP (Minimum Viable Configuration)

**Tasks 1, 2, 3, 4, 5, 10, 16**

This provides:

- Working Effect Config with Layer
- Config file support
- CLI integration with precedence
- Friendly error messages
- Documentation

---

## Dependencies Graph

```
Task 1 (Config Schema) ────┬─► Task 2 (ConfigService Layer) ─► Task 5 (CLI Integration)
                           │                                    │
                           │                                    ├─► Task 6 (--config flag)
                           │                                    │
                           ├─► Task 3 (File ConfigProvider) ───┼─► Task 4 (Precedence Chain)
                           │           │                        │
                           │           └─► Task 7 (config init) │
                           │                                    │
                           ├─► Task 8 (Env Vars)               └─► Task 14 (Extract Constants)
                           │
                           └─► Task 16 (Documentation)

Task 2 (Layer) ─► Task 12 (Test Utils) ─► Task 13 (Integration Tests)

Task 3 (File Provider) ─► Task 10 (Error Formatting) ─► Task 11 (config check)

Task 9 (Redacted) ──── Independent
Task 15 (Version) ──── Independent
```

---

## Tasks Removed from Original List

The following tasks from `03-task-candidates.md` are **not applicable** given Effect is already in use:

- **1.1 Define Configuration Schema with Zod** - Replaced by Effect Config (Task 1)
- **1.2 Create defineConfig Helper** - Still useful but implementation differs (included in Task 7)
- **1.3 Implement Config Loader with c12** - Replaced by Effect ConfigProvider (Task 3)
- **5.2 Add Schema-Based Config Type Generation** - Effect Config provides this natively

---

_Created: 2026-01-21_
