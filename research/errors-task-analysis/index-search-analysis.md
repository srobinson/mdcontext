# Index and Search Module Error Handling Analysis

> Analysis of `src/index/` and `src/search/` modules against Effect error handling best practices

**Date**: 2026-01-22
**Modules Analyzed**:

- `/Users/alphab/Dev/LLM/DEV/mdcontext/src/index/indexer.ts`
- `/Users/alphab/Dev/LLM/DEV/mdcontext/src/index/storage.ts`
- `/Users/alphab/Dev/LLM/DEV/mdcontext/src/index/watcher.ts`
- `/Users/alphab/Dev/LLM/DEV/mdcontext/src/search/searcher.ts`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Error Handling Issues](#current-error-handling-issues)
3. [Effect Best Practice Violations](#effect-best-practice-violations)
4. [Recommended Changes](#recommended-changes)
5. [Priority Matrix](#priority-matrix)

---

## Executive Summary

The index and search modules use Effect for asynchronous operations but violate several core Effect error handling patterns. The primary issues are:

1. **Generic `Error` types instead of tagged errors** - All functions use `Effect.Effect<T, Error>` instead of specific tagged error types
2. **Error context loss** - Errors are converted to generic `Error` with string messages, losing structured data
3. **Swallowed errors via catch blocks** - Multiple `try/catch` patterns silently discard errors
4. **Mixed async patterns** - Combines `async/await`, `Effect.promise`, and `Effect.tryPromise` inconsistently
5. **No error transformation at boundaries** - Infrastructure errors propagate directly without domain mapping

---

## Current Error Handling Issues

### Issue 1: Generic Error Type Usage

**Location**: All modules
**Severity**: HIGH

All Effect-returning functions declare `Error` as their error type rather than domain-specific tagged errors:

```typescript
// storage.ts - Line 28
const readJsonFile = <T>(filePath: string): Effect.Effect<T | null, Error> =>

// storage.ts - Line 41
const writeJsonFile = <T>(filePath: string, data: T): Effect.Effect<void, Error> =>

// indexer.ts - Line 164
export const buildIndex = (
  rootPath: string,
  options: IndexOptions = {},
): Effect.Effect<IndexResult, Error> =>

// searcher.ts - Line 99
export const search = (
  rootPath: string,
  options: SearchOptions = {},
): Effect.Effect<readonly SearchResult[], Error> =>
```

**Problem**: Using generic `Error` loses Effect's type-safe error tracking. Callers cannot use `catchTag` for specific error handling, and the type signature provides no information about what can go wrong.

---

### Issue 2: String-Based Error Messages

**Location**: `storage.ts`, `indexer.ts`
**Severity**: HIGH

Errors are constructed with string interpolation, losing structured data:

```typescript
// storage.ts - Line 24-25
const ensureDir = (dirPath: string): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: () => fs.mkdir(dirPath, { recursive: true }),
    catch: (e) => new Error(`Failed to create directory ${dirPath}: ${e}`),
  })

// storage.ts - Line 37-38
catch: (e) => new Error(`Failed to read ${filePath}: ${e}`)

// indexer.ts - Line 192-193
catch: (e) => new Error(`Failed to walk directory: ${e}`),

// indexer.ts - Line 250-252
.pipe(
  Effect.mapError(
    (e) => new Error(`Parse error in ${relativePath}: ${e.message}`),
  ),
)
```

**Problem**: String concatenation:

- Destroys the original error's stack trace and type
- Makes programmatic error handling impossible
- Cannot distinguish error types for user-facing messages
- Violates "preserve error context through transformations" best practice

---

### Issue 3: Swallowed Errors in Catch Blocks

**Location**: `storage.ts`, `searcher.ts`
**Severity**: HIGH

Multiple locations silently catch and discard errors:

```typescript
// storage.ts - Lines 30-35
const readJsonFile = <T>(filePath: string): Effect.Effect<T | null, Error> =>
  Effect.tryPromise({
    try: async () => {
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        return JSON.parse(content) as T
      } catch {
        return null  // ERROR SWALLOWED - no logging, no context
      }
    },
    catch: (e) => new Error(`Failed to read ${filePath}: ${e}`),
  })

// storage.ts - Lines 186-193
export const indexExists = (storage: IndexStorage): Effect.Effect<boolean, Error> =>
  Effect.tryPromise({
    try: async () => {
      try {
        await fs.access(storage.paths.config)
        return true
      } catch {
        return false  // Acceptable - checking existence
      }
    },
    ...
  })

// searcher.ts - Lines 253-260
if (parsedQuery || contentRegex) {
  const filePath = path.join(storage.rootPath, docPath)
  try {
    fileContent = yield* Effect.promise(() =>
      fs.readFile(filePath, 'utf-8'),
    )
    fileLines = fileContent.split('\n')
  } catch {
    continue // Skip files that can't be read - ERROR SWALLOWED
  }
}

// searcher.ts - Lines 433-437
} catch {
  // If file can't be read, include result without content
  resultsWithContent.push(result)  // No logging of what failed
}

// searcher.ts - Lines 510-516
if (includeContent) {
  try {
    fileContent = yield* Effect.promise(() =>
      fs.readFile(resolvedFile, 'utf-8'),
    )
  } catch {
    // Continue without content - no logging
  }
}
```

**Problem**:

- Silent failures make debugging difficult
- Users get incomplete results without knowing why
- Violates "don't swallow errors" anti-pattern guideline
- Lost opportunity to provide helpful error context

---

### Issue 4: Inconsistent Async Patterns

**Location**: `indexer.ts`, `searcher.ts`
**Severity**: MEDIUM

The code mixes different async handling approaches:

```typescript
// indexer.ts - Uses raw async function (not Effect)
const walkDirectory = async (
  dir: string,
  exclude: readonly string[],
): Promise<string[]> => {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  // ... async/await throughout
};

// indexer.ts - Wraps in Effect.tryPromise
const files =
  yield *
  Effect.tryPromise({
    try: () => walkDirectory(storage.rootPath, exclude),
    catch: (e) => new Error(`Failed to walk directory: ${e}`),
  });

// indexer.ts - Uses Effect.promise (no error mapping)
const [content, stats] =
  yield *
  Effect.promise(() =>
    Promise.all([fs.readFile(filePath, "utf-8"), fs.stat(filePath)]),
  );

// searcher.ts - Also uses Effect.promise
fileContent = yield * Effect.promise(() => fs.readFile(filePath, "utf-8"));
```

**Problem**:

- `Effect.promise` does not map errors - exceptions become defects
- `walkDirectory` throws raw exceptions without Effect error handling
- Inconsistent error propagation makes reasoning about failures difficult

---

### Issue 5: Callback-Based Error Handling

**Location**: `watcher.ts`
**Severity**: MEDIUM

The watcher uses callback-based error handling instead of Effect patterns:

```typescript
// watcher.ts - Lines 17-23
export interface WatcherOptions extends IndexOptions {
  readonly debounceMs?: number
  readonly onIndex?: (result: { documentsIndexed: number; duration: number }) => void
  readonly onError?: (error: Error) => void  // Callback-based
}

// watcher.ts - Lines 78-82
} catch (error) {
  options.onError?.(
    error instanceof Error ? error : new Error(String(error)),
  )
}

// watcher.ts - Lines 117-120
watcher.on('error', (error: unknown) => {
  options.onError?.(
    error instanceof Error ? error : new Error(String(error)),
  )
})
```

**Problem**:

- Breaks Effect's error tracking - errors bypass the type system
- Callers must provide callbacks instead of using Effect's error handling
- Cannot compose error handling with other Effect operations
- Violates principle of keeping errors in the Effect channel

---

### Issue 6: Missing Index Error Types

**Location**: `searcher.ts`
**Severity**: MEDIUM

When index doesn't exist, functions return empty results instead of typed errors:

```typescript
// searcher.ts - Lines 109-111
if (!docIndex || !sectionIndex) {
  return []; // Silent failure - caller doesn't know index is missing
}

// searcher.ts - Lines 197-199
if (!docIndex || !sectionIndex) {
  return []; // Same issue
}
```

But contrast with `getContext` which does fail explicitly:

```typescript
// searcher.ts - Lines 487-491
if (!docIndex || !sectionIndex) {
  return (
    yield *
    Effect.fail(new Error("Index not found. Run 'mdcontext index' first."))
  );
}
```

**Problem**:

- Inconsistent behavior between search and context functions
- Empty results are ambiguous - did search find nothing or is index missing?
- User gets no guidance on how to fix the issue

---

### Issue 7: Errors in buildIndex Are Collected But Not Typed

**Location**: `indexer.ts`
**Severity**: MEDIUM

The `buildIndex` function collects errors but uses untyped structure:

```typescript
// indexer.ts - Types from types.js (inferred)
// IndexBuildError = { path: string; message: string }

// indexer.ts - Lines 335-343
.pipe(
  Effect.catchAll((error) => {
    errors.push({
      path: relativePath,
      message: error instanceof Error ? error.message : String(error),
    })
    return Effect.void
  }),
)
```

**Problem**:

- `IndexBuildError` is just a plain object, not a tagged error
- Original error type is lost when converting to message string
- Cannot distinguish parse errors from I/O errors from permission errors

---

## Effect Best Practice Violations

### Violation 1: Not Using Data.TaggedError

**Best Practice**: "Define errors using `Data.TaggedError` for type-safe discriminated unions"

**Current State**: All errors are `new Error(string)`

**Impact**:

- Cannot use `Effect.catchTag` for specific error handling
- Error types not tracked in Effect's `E` parameter
- Exhaustive handling with `catchTags` impossible

---

### Violation 2: Mixing Thrown Exceptions with Effect Errors

**Best Practice**: "Never throw inside Effect - use Effect.fail for expected errors"

**Current State**:

- `walkDirectory` is `async` function that can throw
- `try/catch` blocks inside Effect.tryPromise
- `Effect.promise` used without error mapping (exceptions become defects)

**Impact**:

- Some errors tracked as expected (E channel), others as defects
- Inconsistent error recovery behavior
- Harder to reason about failure modes

---

### Violation 3: Losing Error Context in Transformations

**Best Practice**: "Preserve the cause chain when transforming errors"

**Current State**:

```typescript
Effect.mapError(
  (e) => new Error(`Parse error in ${relativePath}: ${e.message}`),
);
```

**Impact**:

- Original stack trace lost
- Original error type lost
- Cannot access structured error data (line number, column, etc.)

---

### Violation 4: Converting Typed Errors to Generic Error Too Early

**Best Practice**: "Keep specific error types as long as possible"

**Current State**: Parser returns `IoError | ParseError` but immediately converted:

```typescript
const doc = yield* parse(content, ...).pipe(
  Effect.mapError(
    (e) => new Error(`Parse error in ${relativePath}: ${e.message}`),
  ),
)
```

**Impact**:

- Can't distinguish I/O errors from parse errors at call site
- All parser errors treated the same regardless of type

---

### Violation 5: Using catchAll Instead of Specific Handlers

**Best Practice**: "Handle specific errors, let others propagate"

**Current State**:

```typescript
// indexer.ts - Lines 335-343
.pipe(
  Effect.catchAll((error) => {
    errors.push({ ... })
    return Effect.void
  }),
)
```

**Impact**:

- All errors treated the same way
- Cannot apply different recovery strategies based on error type
- Defects (bugs) handled same as expected errors

---

## Recommended Changes

### Recommendation 1: Create Domain-Specific Error Types

**Priority**: HIGH
**Files**: New file `src/index/errors.ts`, updates to all modules

```typescript
// src/index/errors.ts
import { Data } from "effect";

// ============================================================================
// Storage Errors
// ============================================================================

export class DirectoryCreateError extends Data.TaggedError(
  "DirectoryCreateError",
)<{
  path: string;
  cause: unknown;
}> {}

export class FileReadError extends Data.TaggedError("FileReadError")<{
  path: string;
  cause: unknown;
}> {}

export class FileWriteError extends Data.TaggedError("FileWriteError")<{
  path: string;
  cause: unknown;
}> {}

export class JsonParseError extends Data.TaggedError("JsonParseError")<{
  path: string;
  cause: unknown;
}> {}

// ============================================================================
// Index Errors
// ============================================================================

export class IndexNotFoundError extends Data.TaggedError("IndexNotFoundError")<{
  rootPath: string;
  message: string;
}> {}

export class DirectoryWalkError extends Data.TaggedError("DirectoryWalkError")<{
  rootPath: string;
  cause: unknown;
}> {}

export class DocumentParseError extends Data.TaggedError("DocumentParseError")<{
  path: string;
  line?: number;
  message: string;
  cause: unknown;
}> {}

// ============================================================================
// Search Errors
// ============================================================================

export class DocumentNotFoundError extends Data.TaggedError(
  "DocumentNotFoundError",
)<{
  path: string;
}> {}

export class ContentReadError extends Data.TaggedError("ContentReadError")<{
  path: string;
  cause: unknown;
}> {}

// Union type for all index/search errors
export type IndexError =
  | DirectoryCreateError
  | FileReadError
  | FileWriteError
  | JsonParseError
  | IndexNotFoundError
  | DirectoryWalkError
  | DocumentParseError;

export type SearchError =
  | IndexNotFoundError
  | DocumentNotFoundError
  | ContentReadError;
```

---

### Recommendation 2: Update Storage Operations

**Priority**: HIGH
**File**: `src/index/storage.ts`

```typescript
// Before
const ensureDir = (dirPath: string): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: () => fs.mkdir(dirPath, { recursive: true }),
    catch: (e) => new Error(`Failed to create directory ${dirPath}: ${e}`),
  });

// After
const ensureDir = (
  dirPath: string,
): Effect.Effect<void, DirectoryCreateError> =>
  Effect.tryPromise({
    try: () => fs.mkdir(dirPath, { recursive: true }),
    catch: (cause) => new DirectoryCreateError({ path: dirPath, cause }),
  }).pipe(Effect.map(() => undefined));

// Before
const readJsonFile = <T>(filePath: string): Effect.Effect<T | null, Error> =>
  Effect.tryPromise({
    try: async () => {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        return JSON.parse(content) as T;
      } catch {
        return null;
      }
    },
    catch: (e) => new Error(`Failed to read ${filePath}: ${e}`),
  });

// After - Separate file read from JSON parse
const readFile = (filePath: string): Effect.Effect<string, FileReadError> =>
  Effect.tryPromise({
    try: () => fs.readFile(filePath, "utf-8"),
    catch: (cause) => new FileReadError({ path: filePath, cause }),
  });

const parseJson = <T>(
  content: string,
  path: string,
): Effect.Effect<T, JsonParseError> =>
  Effect.try({
    try: () => JSON.parse(content) as T,
    catch: (cause) => new JsonParseError({ path, cause }),
  });

const readJsonFile = <T>(
  filePath: string,
): Effect.Effect<T | null, FileReadError | JsonParseError> =>
  readFile(filePath).pipe(
    Effect.flatMap((content) => parseJson<T>(content, filePath)),
    Effect.catchTag("FileReadError", (e) => {
      // File doesn't exist is expected - return null
      if (isNotFoundError(e.cause)) {
        return Effect.succeed(null as T | null);
      }
      return Effect.fail(e);
    }),
  );
```

---

### Recommendation 3: Convert walkDirectory to Effect

**Priority**: MEDIUM
**File**: `src/index/indexer.ts`

```typescript
// Before - async function that throws
const walkDirectory = async (
  dir: string,
  exclude: readonly string[],
): Promise<string[]> => {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  // ...
};

// After - Effect-based with proper error handling
const walkDirectory = (
  dir: string,
  exclude: readonly string[],
): Effect.Effect<string[], DirectoryWalkError> =>
  Effect.gen(function* () {
    const files: string[] = [];

    const entries = yield* Effect.tryPromise({
      try: () => fs.readdir(dir, { withFileTypes: true }),
      catch: (cause) => new DirectoryWalkError({ rootPath: dir, cause }),
    });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }

      if (shouldExclude(fullPath, exclude)) {
        continue;
      }

      if (entry.isDirectory()) {
        const subFiles = yield* walkDirectory(fullPath, exclude);
        files.push(...subFiles);
      } else if (entry.isFile() && isMarkdownFile(entry.name)) {
        files.push(fullPath);
      }
    }

    return files;
  });
```

---

### Recommendation 4: Handle Search Errors Explicitly

**Priority**: MEDIUM
**File**: `src/search/searcher.ts`

```typescript
// Before - silent empty return
export const search = (
  rootPath: string,
  options: SearchOptions = {},
): Effect.Effect<readonly SearchResult[], Error> =>
  Effect.gen(function* () {
    const storage = createStorage(rootPath);
    const docIndex = yield* loadDocumentIndex(storage);
    const sectionIndex = yield* loadSectionIndex(storage);

    if (!docIndex || !sectionIndex) {
      return []; // Silent failure
    }
    // ...
  });

// After - typed error with recovery option
export const search = (
  rootPath: string,
  options: SearchOptions = {},
): Effect.Effect<
  readonly SearchResult[],
  IndexNotFoundError | FileReadError | JsonParseError
> =>
  Effect.gen(function* () {
    const storage = createStorage(rootPath);
    const docIndex = yield* loadDocumentIndex(storage);
    const sectionIndex = yield* loadSectionIndex(storage);

    if (!docIndex || !sectionIndex) {
      return yield* Effect.fail(
        new IndexNotFoundError({
          rootPath: storage.rootPath,
          message: "Index not found. Run 'mdcontext index' first.",
        }),
      );
    }
    // ...
  });

// Allow callers to choose recovery strategy
const searchWithFallback = (rootPath: string, options: SearchOptions) =>
  search(rootPath, options).pipe(
    Effect.catchTag("IndexNotFoundError", () => Effect.succeed([])),
  );
```

---

### Recommendation 5: Log Skipped Files Instead of Silent Continue

**Priority**: MEDIUM
**File**: `src/search/searcher.ts`

```typescript
// Before - silent skip
try {
  fileContent = yield * Effect.promise(() => fs.readFile(filePath, "utf-8"));
  fileLines = fileContent.split("\n");
} catch {
  continue; // Skip files that can't be read
}

// After - log warning and continue
const fileResult =
  yield *
  Effect.tryPromise({
    try: () => fs.readFile(filePath, "utf-8"),
    catch: (cause) => new ContentReadError({ path: filePath, cause }),
  }).pipe(
    Effect.catchTag("ContentReadError", (error) =>
      Effect.logWarning(
        `Skipping file that cannot be read: ${error.path}`,
      ).pipe(Effect.map(() => null)),
    ),
  );

if (fileResult === null) {
  continue;
}
fileContent = fileResult;
fileLines = fileContent.split("\n");
```

---

### Recommendation 6: Update Watcher to Use Effect Streams

**Priority**: LOW
**File**: `src/index/watcher.ts`

This is a larger refactor that would convert the watcher to use Effect's streaming primitives instead of callbacks. For now, a minimal improvement:

```typescript
// Minimal improvement - convert WatcherOptions to return errors in Effect
export interface WatcherResult {
  readonly watcher: Watcher;
  readonly errors: Effect.Effect<never, WatcherError, never>; // Stream of errors
}

// Or keep simple but document callback limitation
export interface WatcherOptions extends IndexOptions {
  readonly debounceMs?: number;
  readonly onIndex?: (result: {
    documentsIndexed: number;
    duration: number;
  }) => void;
  /**
   * Error callback for watcher errors.
   * Note: These errors bypass Effect's error channel due to chokidar's callback-based API.
   * Consider using Effect Streams for better error handling in future versions.
   */
  readonly onError?: (error: Error) => void;
}
```

---

## Priority Matrix

| Issue                   | Priority | Effort | Impact | Recommendation                  |
| ----------------------- | -------- | ------ | ------ | ------------------------------- |
| Generic `Error` types   | HIGH     | Medium | High   | Create tagged error types       |
| String error messages   | HIGH     | Medium | High   | Use structured error data       |
| Swallowed errors        | HIGH     | Low    | High   | Add logging or explicit returns |
| Inconsistent async      | MEDIUM   | Medium | Medium | Standardize on Effect patterns  |
| Callback error handling | MEDIUM   | High   | Medium | Consider Effect Streams         |
| Missing index errors    | MEDIUM   | Low    | Medium | Return explicit errors          |
| Untyped IndexBuildError | MEDIUM   | Low    | Low    | Convert to TaggedError          |

### Suggested Implementation Order

1. **Phase 1 (High Priority)**
   - Create `src/index/errors.ts` with tagged error types
   - Update `storage.ts` to use new error types
   - Update `indexer.ts` to use new error types

2. **Phase 2 (Medium Priority)**
   - Update `searcher.ts` to use explicit index errors
   - Add logging for skipped files
   - Convert `walkDirectory` to Effect

3. **Phase 3 (Low Priority)**
   - Evaluate Effect Streams for watcher
   - Consider typed error unions for CLI boundary

---

## Related Documents

- [Effect Errors as Values Research](/Users/alphab/Dev/LLM/DEV/mdcontext/research/effect-errors-as-values.md)
- [Effect CLI Error Handling Research](/Users/alphab/Dev/LLM/DEV/mdcontext/research/effect-cli-error-handling.md)

---

_Analysis completed: 2026-01-22_
