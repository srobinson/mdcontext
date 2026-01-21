# Consolidated Error Handling Tasks

> Prioritized task list for improving mdcontext error handling based on Effect best practices

**Created**: 2026-01-22
**Source Documents**:

- `embeddings-analysis.md`
- `cli-commands-analysis.md`
- `index-search-analysis.md`
- `effect-errors-as-values.md`
- `mdcontext-error-analysis.md`

---

## Executive Summary

The mdcontext codebase has significant error handling issues that violate Effect best practices. Key findings across all modules:

1. **Type Safety Loss**: Error information is consistently lost by converting typed errors to generic `Error` objects throughout the codebase. This makes exhaustive error handling impossible and removes compile-time safety.

2. **Mixed Paradigms**: Three different error paradigms are used inconsistently:
   - Effect tagged unions (`ParseError`, `IoError` in `core/types.ts`)
   - JavaScript Error subclasses (`MissingApiKeyError`, `InvalidApiKeyError`)
   - Generic Error objects (`new Error(...)` throughout)

3. **Silent Failures**: Multiple locations use `Effect.catchAll(() => Effect.succeed(null))` or empty `catch` blocks, silently swallowing errors without logging.

4. **Presentation Mixed with Logic**: Error formatting and display (`Console.error`) is embedded in business logic rather than handled at the CLI boundary.

5. **Constructor Throws**: The `OpenAIProvider` constructor throws synchronous exceptions, bypassing Effect's error tracking entirely.

6. **Unused Error Types**: Well-designed error types exist (`EmbedError` in `types.ts`) but are never used.

**Impact**: Users experience silent failures, debugging is difficult, and the type system cannot help catch error handling bugs at compile time.

---

## Prioritized Task List

### P0: Critical - Breaking or Severely Impacts UX

| ID      | Title                                                    | Description                                                                                                                                                                           | Files Affected                                               | Effort | Dependencies |
| ------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ | ------------ |
| ERR-001 | Create centralized tagged error types                    | Define all domain errors using `Data.TaggedError` in a single module. This is the foundation for all other improvements. `z                                                           | New: `src/errors/index.ts`                                   | M      | None         |
| ERR-002 | Replace constructor throw with factory function          | `OpenAIProvider` constructor throws `MissingApiKeyError`, bypassing Effect error tracking. Convert to factory function returning `Effect.Effect<OpenAIProvider, MissingApiKeyError>`. | `src/embeddings/openai-provider.ts`                          | S      | ERR-001      |
| ERR-003 | Fix silent error swallowing in semantic search           | Multiple `catch {}` blocks silently skip files without logging. Users get incomplete results with no indication of failures.                                                          | `src/embeddings/semantic-search.ts` (lines 329-332, 532-534) | S      | None         |
| ERR-004 | Update Effect.sync to Effect.try for fallible operations | `vector-store.ts` uses `Effect.sync` for operations that can throw (like `addPoint`). Exceptions become untracked defects.                                                            | `src/embeddings/vector-store.ts` (lines 99-121, 123-169)     | M      | ERR-001      |

### P1: High - Significant Improvement, Should Do Soon

| ID      | Title                                          | Description                                                                                                                                       | Files Affected                                    | Effort | Dependencies     |
| ------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------ | ---------------- |
| ERR-005 | Create centralized CLI error handler           | Build error formatter that maps tagged errors to user-friendly messages with exit codes. All error display should flow through this.              | New: `src/cli/error-handler.ts`                   | M      | ERR-001          |
| ERR-006 | Update main.ts error handling                  | Replace fragile manual error type inspection (`formatCliError`) with proper `catchTags` pattern using centralized error types.                    | `src/cli/main.ts` (lines 71-97)                   | M      | ERR-001, ERR-005 |
| ERR-007 | Convert embedding error classes to TaggedError | `MissingApiKeyError` and `InvalidApiKeyError` extend `Error` instead of `Data.TaggedError`. Cannot use `catchTag` for pattern matching.           | `src/embeddings/openai-provider.ts` (lines 24-36) | S      | ERR-001          |
| ERR-008 | Update storage.ts to use typed errors          | All storage operations return `Effect.Effect<T, Error>`. Convert to use specific `FileReadError`, `FileWriteError`, `DirectoryCreateError` types. | `src/index/storage.ts`                            | M      | ERR-001          |
| ERR-009 | Update indexer.ts to use typed errors          | `buildIndex` and `walkDirectory` use generic `Error`. Convert to `DirectoryWalkError`, `DocumentParseError` types.                                | `src/index/indexer.ts`                            | M      | ERR-001          |
| ERR-010 | Fix context.ts error type loss                 | `parseFile` errors are mapped to generic `Error` via `Effect.mapError((e) => new Error(...))`. Let typed errors propagate.                        | `src/cli/commands/context.ts` (lines 85-87)       | S      | ERR-001          |
| ERR-011 | Fix tree.ts error type loss                    | Same pattern as context.ts - `parseFile` errors converted to generic `Error`.                                                                     | `src/cli/commands/tree.ts` (lines 35-37)          | S      | ERR-001          |
| ERR-012 | Add JSON.parse error handling in vector-store  | `JSON.parse` can throw but is unwrapped. Corrupted metadata files cause untracked crashes.                                                        | `src/embeddings/vector-store.ts` (line 234)       | S      | ERR-001          |

### P2: Medium

| ID      | Title                                            | Description                                                                                                                                    | Files Affected                                                | Effort | Dependencies     |
| ------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------ | ---------------- |
| ERR-013 | Remove presentation logic from handleApiKeyError | `handleApiKeyError` mixes error handling with `Console.error` calls. Should only transform errors; formatting belongs at CLI boundary.         | `src/embeddings/openai-provider.ts` (lines 130-165)           | M      | ERR-001, ERR-005 |
| ERR-014 | Replace catchAll with explicit catchTag          | Multiple locations use `Effect.catchAll(() => Effect.succeed(null))` swallowing all errors. Use `catchTag` for specific recoverable errors.    | `src/cli/commands/search.ts`, `src/cli/commands/index-cmd.ts` | M      | ERR-001          |
| ERR-015 | Use or remove EmbedError type                    | `EmbedError` interface exists in `types.ts` but is never used. Either use it or remove dead code.                                              | `src/embeddings/types.ts` (lines 68-82)                       | S      | ERR-001          |
| ERR-016 | Update semantic-search return types              | All functions return `Effect.Effect<A, Error>` instead of specific error unions. Update signatures to reflect actual error types.              | `src/embeddings/semantic-search.ts`                           | M      | ERR-001, ERR-007 |
| ERR-017 | Add typed errors to search module                | `search` function returns empty array when index is missing instead of typed `IndexNotFoundError`. Behavior is inconsistent with `getContext`. | `src/search/searcher.ts` (lines 109-111, 197-199)             | M      | ERR-001          |
| ERR-018 | Convert walkDirectory to Effect                  | `walkDirectory` is an async function that can throw, wrapped in `Effect.tryPromise`. Convert to native Effect for better error handling.       | `src/index/indexer.ts`                                        | M      | ERR-001          |
| ERR-019 | Add logging for skipped files                    | Replace silent `continue` statements with `Effect.logWarning` so users know which files were skipped and why.                                  | `src/search/searcher.ts`, `src/embeddings/semantic-search.ts` | S      | None             |
| ERR-020 | Fix inconsistent error transformation            | `semantic-search.ts:366-375` conditionally preserves some errors while converting others to generic `Error`. Fragile pattern.                  | `src/embeddings/semantic-search.ts`                           | S      | ERR-001          |

### P3: Low - Polish

| ID      | Title                                     | Description                                                                                                                                       | Files Affected                                                | Effort | Dependencies |
| ------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------ | ------------ |
| ERR-021 | Move error messages to boundary           | User-facing error messages like "Index not found. Run 'mdcontext index' first." are embedded in domain code. Should be formatted at CLI boundary. | `src/embeddings/semantic-search.ts`, `src/search/searcher.ts` | M      | ERR-005      |
| ERR-022 | Convert IndexBuildError to TaggedError    | `IndexBuildError` is a plain object type, not a proper tagged error class.                                                                        | `src/index/types.ts`                                          | S      | ERR-001      |
| ERR-023 | Convert inline IoError to TaggedError     | Parser returns `{ _tag: 'IoError'; message: string; path: string }` as inline object. Should be proper class.                                     | `src/parser/parser.ts` (lines 369-395)                        | S      | ERR-001      |
| ERR-024 | Consider Effect Streams for watcher       | `watcher.ts` uses callbacks (`onError`) for error handling, escaping Effect's error tracking. Consider Effect Streams for better integration.     | `src/index/watcher.ts`                                        | L      | ERR-001      |
| ERR-025 | Add error codes for programmatic handling | Include machine-readable error codes alongside messages for programmatic consumers (scripts, CI).                                                 | All error types                                               | M      | ERR-001      |
| ERR-026 | Add unit tests for error types            | Verify `_tag` discriminant exists, test `catchTag` works correctly, snapshot test error messages.                                                 | New: `tests/errors/`                                          | M      | ERR-001      |

---

## Recommended Implementation Order

### Phase 1: Foundation

**Goal**: Establish the error type system that all other changes depend on.

1. **ERR-001**: Create `src/errors/index.ts` with all tagged error types
2. **ERR-005**: Create `src/cli/error-handler.ts` with formatters

**Rationale**: Every other task depends on having proper error types defined. This must come first.

### Phase 2: Critical Fixes

**Goal**: Fix the most impactful issues that affect users immediately.

1. **ERR-002**: Fix OpenAI provider constructor throw
2. **ERR-003**: Fix silent error swallowing in semantic search
3. **ERR-004**: Fix Effect.sync misuse in vector-store
4. **ERR-007**: Convert embedding error classes to TaggedError

**Rationale**: These cause runtime issues, silent failures, or completely bypass error tracking.

### Phase 3: CLI Integration

**Goal**: Connect the error system to user-facing output.

1. **ERR-006**: Update main.ts error handling
2. **ERR-010**: Fix context.ts error type loss
3. **ERR-011**: Fix tree.ts error type loss

**Rationale**: Once error types exist and critical issues are fixed, wire up the CLI for proper error display.

### Phase 4: Module Updates

**Goal**: Propagate typed errors through all modules.

1. **ERR-008**: Update storage.ts
2. **ERR-009**: Update indexer.ts
3. **ERR-012**: Fix JSON.parse in vector-store
4. **ERR-016**: Update semantic-search return types

**Rationale**: With the foundation in place, systematically update each module.

### Phase 5: Polish

**Goal**: Clean up remaining issues and improve developer experience.

1. **ERR-013**: Remove presentation from handleApiKeyError
2. **ERR-014**: Replace catchAll with catchTag
3. **ERR-015**: Use or remove EmbedError
4. **ERR-017**: Add typed errors to search module
5. Remaining P2/P3 tasks as time permits

---

## Quick Wins

Tasks that are easy (Small effort) and have high impact:

| ID      | Title                                          | Effort | Impact | Why It's a Quick Win                                    |
| ------- | ---------------------------------------------- | ------ | ------ | ------------------------------------------------------- |
| ERR-003 | Fix silent error swallowing in semantic search | S      | High   | Just add `Effect.logWarning` - no type changes needed   |
| ERR-010 | Fix context.ts error type loss                 | S      | High   | Remove `mapError` call - errors already have good types |
| ERR-011 | Fix tree.ts error type loss                    | S      | High   | Same as ERR-010, mirror change                          |
| ERR-012 | Add JSON.parse error handling                  | S      | Medium | Wrap single line in `Effect.try`                        |
| ERR-019 | Add logging for skipped files                  | S      | Medium | Add `Effect.logWarning` before `continue` statements    |
| ERR-015 | Use or remove EmbedError type                  | S      | Low    | Delete unused code or wire it up                        |

**Recommendation**: Start with ERR-003, ERR-010, ERR-011, and ERR-019 before tackling ERR-001. These provide immediate value with minimal risk and no dependencies.

---

## File Change Summary

Files requiring the most changes:

| File                                | Task Count | Priority Tasks                     |
| ----------------------------------- | ---------- | ---------------------------------- |
| `src/embeddings/openai-provider.ts` | 4          | ERR-002, ERR-007, ERR-013          |
| `src/embeddings/semantic-search.ts` | 4          | ERR-003, ERR-016, ERR-020, ERR-021 |
| `src/embeddings/vector-store.ts`    | 2          | ERR-004, ERR-012                   |
| `src/index/storage.ts`              | 1          | ERR-008                            |
| `src/index/indexer.ts`              | 2          | ERR-009, ERR-018                   |
| `src/search/searcher.ts`            | 2          | ERR-017, ERR-019                   |
| `src/cli/main.ts`                   | 1          | ERR-006                            |
| `src/cli/commands/context.ts`       | 1          | ERR-010                            |
| `src/cli/commands/tree.ts`          | 1          | ERR-011                            |
| `src/cli/commands/search.ts`        | 1          | ERR-014                            |
| `src/cli/commands/index-cmd.ts`     | 1          | ERR-014                            |

New files to create:

| File                       | Purpose                         | Tasks   |
| -------------------------- | ------------------------------- | ------- |
| `src/errors/index.ts`      | Centralized tagged error types  | ERR-001 |
| `src/cli/error-handler.ts` | Error formatting and exit codes | ERR-005 |
| `tests/errors/*.test.ts`   | Error type unit tests           | ERR-026 |

---

## Effort Estimation Key

- **S (Small)**: 1-2 hours, localized change
- **M (Medium)**: 2-4 hours, touches multiple files or requires design decisions
- **L (Large)**: 4+ hours, significant refactoring or new architecture

---

## Related Documents

- [Effect Errors as Values Research](./research/effect-errors-as-values.md)
- [mdcontext Error Analysis](./research/mdcontext-error-analysis.md)
- [Embeddings Analysis](./research/errors-task-analysis/embeddings-analysis.md)
- [CLI Commands Analysis](./research/errors-task-analysis/cli-commands-analysis.md)
- [Index Search Analysis](./research/errors-task-analysis/index-search-analysis.md)

---

_Document created: 2026-01-22_
