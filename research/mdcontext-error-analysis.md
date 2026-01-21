# mdcontext Error Handling Analysis

## Executive Summary

The mdcontext codebase has a mixed error handling strategy. While it defines typed errors in `core/types.ts` (ParseError, IoError, IndexError) and uses Effect for error management, the actual implementation frequently loses type information by converting typed errors to generic `Error` objects. This document catalogs the current state and proposes a unified approach.

---

## 1. Current Error Handling Audit

### 1.1 Custom Error Classes

**Location: `/src/embeddings/openai-provider.ts`**

```typescript
export class MissingApiKeyError extends Error {
  constructor() {
    super("OPENAI_API_KEY not set");
    this.name = "MissingApiKeyError";
  }
}

export class InvalidApiKeyError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid OPENAI_API_KEY");
    this.name = "InvalidApiKeyError";
  }
}
```

**Location: `/src/core/types.ts`** (Tagged unions - Effect style)

```typescript
export interface ParseError {
  readonly _tag: "ParseError";
  readonly message: string;
  readonly line?: number | undefined;
  readonly column?: number | undefined;
}

export interface IoError {
  readonly _tag: "IoError";
  readonly message: string;
  readonly path: string;
  readonly cause?: unknown;
}

export interface IndexError {
  readonly _tag: "IndexError";
  readonly cause: "DiskFull" | "Permission" | "Corrupted" | "Unknown";
  readonly message: string;
}
```

### 1.2 The `handleApiKeyError` Utility

**Location: `/src/embeddings/openai-provider.ts:130-165`**

This is a key pattern in the codebase that demonstrates the problem:

```typescript
export const handleApiKeyError = <A, E>(
  effect: Effect.Effect<A, E | MissingApiKeyError | InvalidApiKeyError>,
): Effect.Effect<A, E | Error> =>
  effect.pipe(
    Effect.catchIf(
      (e): e is MissingApiKeyError => e instanceof MissingApiKeyError,
      () =>
        Effect.gen(function* () {
          yield* Console.error("");
          yield* Console.error("Error: OPENAI_API_KEY not set");
          // ... more Console.error calls ...
          return yield* Effect.fail(new Error("Missing API key")); // <-- Type lost here
        }),
    ),
    Effect.catchIf(
      (e): e is InvalidApiKeyError => e instanceof InvalidApiKeyError,
      (e) =>
        Effect.gen(function* () {
          // ... Console.error calls ...
          return yield* Effect.fail(new Error("Invalid API key")); // <-- Type lost here
        }),
    ),
  );
```

**Problems:**

1. Catches typed errors (`MissingApiKeyError`, `InvalidApiKeyError`)
2. Prints messages via `Console.error`
3. Converts to generic `Error` - losing type information for callers
4. Mixes error handling with error display (violates separation of concerns)

### 1.3 CLI Command Error Handling

**`/src/cli/commands/search.ts`**

Uses `handleApiKeyError` for semantic search operations:

```typescript
const results =
  yield *
  semanticSearch(resolvedDir, query, {
    limit,
    threshold,
  }).pipe(handleApiKeyError);
```

Also uses `Effect.catchAll(() => Effect.succeed(null))` pattern to swallow errors:

```typescript
const estimate =
  yield *
  estimateEmbeddingCost(resolvedDir).pipe(
    Effect.catchAll(() => Effect.succeed(null)),
  );
```

**`/src/cli/commands/index-cmd.ts`**

Same patterns - uses `handleApiKeyError` and swallows errors with `catchAll`:

```typescript
const embedResult =
  yield *
  buildEmbeddings(resolvedDir, {
    // ...
  }).pipe(
    handleApiKeyError,
    Effect.catchAll(() => Effect.succeed(null)),
  );
```

Watch mode uses callbacks for error handling (escapes Effect):

```typescript
const watcher =
  yield *
  watchDirectory(resolvedRoot, {
    onError: (error) => {
      console.error(`Watch error: ${error.message}`); // <-- Direct console.error
    },
  });
```

**`/src/cli/main.ts`**

Top-level error handling for CLI validation errors:

```typescript
Effect.catchAll((error) =>
  Effect.sync(() => {
    if (isValidationError(error)) {
      const message = formatCliError(error);
      console.error(`\nError: ${message}`); // <-- Direct console.error
      console.error('\nRun "mdcontext --help" for usage information.');
      process.exit(1);
    }
    throw error; // <-- Re-throws, escapes Effect
  }),
);
```

---

## 2. Identified Problems

### 2.1 Type Information Loss

| Location                 | Original Error       | Converted To                                   |
| ------------------------ | -------------------- | ---------------------------------------------- |
| `openai-provider.ts:147` | `MissingApiKeyError` | `new Error('Missing API key')`                 |
| `openai-provider.ts:162` | `InvalidApiKeyError` | `new Error('Invalid API key')`                 |
| `storage.ts:25`          | Unknown              | `new Error(\`Failed to create directory...\`)` |
| `storage.ts:38`          | Unknown              | `new Error(\`Failed to read...\`)`             |
| `storage.ts:50`          | Unknown              | `new Error(\`Failed to write...\`)`            |
| `context.ts:86`          | `ParseError`         | `new Error(\`${e.\_tag}: ${e.message}\`)`      |
| `tree.ts:36`             | `ParseError`         | `new Error(\`${e.\_tag}: ${e.message}\`)`      |
| `mcp/server.ts:260`      | Various              | `new Error(\`${e.\_tag}: ${e.message}\`)`      |
| `semantic-search.ts:371` | `InvalidApiKeyError` | `new Error(\`Embedding failed: ...\`)`         |

### 2.2 Direct `console.error` / `console.log` Usage

| Location                     | Context                 |
| ---------------------------- | ----------------------- |
| `main.ts:136-137`            | CLI validation errors   |
| `index-cmd.ts:94-102`        | Watch mode logging      |
| `help.ts:258-292`            | Help display            |
| `argv-preprocessor.ts:91-92` | Argument parsing errors |
| `mcp/server.ts:481`          | Fatal server errors     |

### 2.3 Error Swallowing with `Effect.catchAll`

The pattern `Effect.catchAll(() => Effect.succeed(null))` is used in multiple places, silently swallowing errors:

- `search.ts:348` - Cost estimation
- `search.ts:376` - Embedding building
- `search.ts:424` - Embedding building (retry)
- `index-cmd.ts:232` - Cost estimation prompt
- `index-cmd.ts:272` - Embedding building
- `summarizer.ts:505` - File parsing

### 2.4 Errors Escaping Effect System

| Location                   | Pattern                                                                       |
| -------------------------- | ----------------------------------------------------------------------------- |
| `openai-provider.ts:59`    | `throw new MissingApiKeyError()` in constructor                               |
| `openai-provider.ts:97-99` | `throw new InvalidApiKeyError(error.message)` / `throw error` in async method |
| `main.ts:141`              | `throw error` to re-throw unhandled errors                                    |
| `watcher.ts:71-81`         | `Effect.runPromise` with try/catch for callback                               |

### 2.5 Mixed Error Paradigms

The codebase uses three different error paradigms:

1. **Effect tagged unions** (`ParseError`, `IoError`, `IndexError` in `core/types.ts`)
2. **JavaScript Error subclasses** (`MissingApiKeyError`, `InvalidApiKeyError`)
3. **Generic Error objects** (`new Error(...)` throughout)

---

## 3. Complete Error Type Catalog

### 3.1 Defined Error Types (Effect style)

| Type         | Location        | Fields                                |
| ------------ | --------------- | ------------------------------------- |
| `ParseError` | `core/types.ts` | `_tag`, `message`, `line?`, `column?` |
| `IoError`    | `core/types.ts` | `_tag`, `message`, `path`, `cause?`   |
| `IndexError` | `core/types.ts` | `_tag`, `cause`, `message`            |

### 3.2 Defined Error Classes (JavaScript style)

| Class                | Location                        | Purpose          |
| -------------------- | ------------------------------- | ---------------- |
| `MissingApiKeyError` | `embeddings/openai-provider.ts` | No API key set   |
| `InvalidApiKeyError` | `embeddings/openai-provider.ts` | API key rejected |

### 3.3 Ad-hoc Error Messages (Generic Error)

| Message Pattern                        | Location                            | Count |
| -------------------------------------- | ----------------------------------- | ----- |
| `"Index not found..."`                 | `semantic-search.ts`, `searcher.ts` | 3     |
| `"Embeddings not found..."`            | `semantic-search.ts`                | 1     |
| `"Document not found in index..."`     | `searcher.ts`                       | 1     |
| `"Failed to create/read/write..."`     | `storage.ts`                        | 4     |
| `"Failed to walk directory..."`        | `indexer.ts`                        | 1     |
| `"Parse error in..."`                  | `indexer.ts`                        | 1     |
| `"Embedding failed..."`                | `semantic-search.ts`                | 1     |
| `"Query embedding failed..."`          | `semantic-search.ts`                | 1     |
| `"Failed to generate query embedding"` | `semantic-search.ts`                | 1     |
| `"At least one file is required..."`   | `context.ts`                        | 1     |

---

## 4. Proposed Error Architecture

### 4.1 Unified Error Type Hierarchy

All errors should follow the Effect tagged union pattern:

```typescript
// Base error interface
interface MdContextError {
  readonly _tag: string;
  readonly message: string;
}

// File system errors
interface IoError extends MdContextError {
  readonly _tag: "IoError";
  readonly path: string;
  readonly operation: "read" | "write" | "stat" | "mkdir" | "walk";
  readonly cause?: unknown;
}

// Parsing errors
interface ParseError extends MdContextError {
  readonly _tag: "ParseError";
  readonly path?: string;
  readonly line?: number;
  readonly column?: number;
}

// Index errors
interface IndexError extends MdContextError {
  readonly _tag: "IndexError";
  readonly kind: "NotFound" | "Corrupted" | "VersionMismatch";
  readonly path: string;
}

// API errors
interface ApiKeyError extends MdContextError {
  readonly _tag: "ApiKeyError";
  readonly kind: "Missing" | "Invalid";
  readonly provider: string;
}

interface EmbeddingError extends MdContextError {
  readonly _tag: "EmbeddingError";
  readonly kind: "GenerationFailed" | "RateLimited" | "QuotaExceeded";
  readonly cause?: unknown;
}

// Search errors
interface SearchError extends MdContextError {
  readonly _tag: "SearchError";
  readonly kind: "NoIndex" | "NoEmbeddings" | "DocumentNotFound";
  readonly path?: string;
}

// CLI errors
interface CliError extends MdContextError {
  readonly _tag: "CliError";
  readonly kind: "ValidationError" | "MissingArgument" | "InvalidOption";
  readonly details?: Record<string, unknown>;
}

// Union type for all errors
type MdContextErrors =
  | IoError
  | ParseError
  | IndexError
  | ApiKeyError
  | EmbeddingError
  | SearchError
  | CliError;
```

### 4.2 Error Constructor Functions

Following Effect conventions:

```typescript
// constructors/errors.ts
export const IoError = (
  operation: IoError["operation"],
  path: string,
  message: string,
  cause?: unknown,
): IoError => ({
  _tag: "IoError",
  operation,
  path,
  message,
  cause,
});

export const ApiKeyError = (
  kind: ApiKeyError["kind"],
  provider: string,
  message?: string,
): ApiKeyError => ({
  _tag: "ApiKeyError",
  kind,
  provider,
  message:
    message ??
    (kind === "Missing"
      ? `${provider} API key not set`
      : `Invalid ${provider} API key`),
});

// etc.
```

### 4.3 Error Handling Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      Effect Pipeline                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Service Layer (returns typed Effect errors)                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ embeddings/openai-provider.ts                            │ │
│  │   → Effect.Effect<Result, ApiKeyError | EmbeddingError>  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                           │                                   │
│                           ▼                                   │
│  Business Logic (propagates or handles errors)                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ search/semantic-search.ts                                │ │
│  │   → Effect.Effect<Results, SearchError | ApiKeyError>    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                           │                                   │
│                           ▼                                   │
│  CLI Layer (formats errors for display)                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ cli/error-renderer.ts                                    │ │
│  │   formatError(error: MdContextErrors): FormattedOutput   │ │
│  │   - User-friendly messages                               │ │
│  │   - Actionable suggestions                               │ │
│  │   - Exit codes                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 4.4 Error Renderer (Separation of Concerns)

```typescript
// cli/error-renderer.ts

interface FormattedError {
  readonly message: string;
  readonly details?: string;
  readonly suggestions?: readonly string[];
  readonly exitCode: number;
}

const formatError = (error: MdContextErrors): FormattedError => {
  switch (error._tag) {
    case "ApiKeyError":
      return {
        message:
          error.kind === "Missing"
            ? "OPENAI_API_KEY not set"
            : "Invalid OPENAI_API_KEY",
        suggestions: [
          "export OPENAI_API_KEY=sk-...",
          "Or add to .env file in project root.",
        ],
        exitCode: 1,
      };

    case "SearchError":
      if (error.kind === "NoIndex") {
        return {
          message: "No index found.",
          suggestions: [
            "Run: mdcontext index /path/to/docs",
            "Add --embed for semantic search capabilities",
          ],
          exitCode: 1,
        };
      }
    // ... more cases

    // ... other error types
  }
};

const renderError = (error: FormattedError): Effect.Effect<never> =>
  Effect.gen(function* () {
    yield* Console.error("");
    yield* Console.error(`Error: ${error.message}`);
    if (error.details) {
      yield* Console.error(`Details: ${error.details}`);
    }
    if (error.suggestions?.length) {
      yield* Console.error("");
      for (const suggestion of error.suggestions) {
        yield* Console.error(`  ${suggestion}`);
      }
    }
    yield* Console.error("");
    return yield* Effect.fail(error); // Keep as Effect failure for exit code
  });
```

### 4.5 Migration Strategy

1. **Phase 1: Define all error types** in `src/errors/types.ts`
2. **Phase 2: Create constructors** in `src/errors/constructors.ts`
3. **Phase 3: Create error renderer** in `src/cli/error-renderer.ts`
4. **Phase 4: Migrate openai-provider.ts** - replace Error classes with tagged unions
5. **Phase 5: Migrate storage.ts** - use IoError constructors
6. **Phase 6: Migrate semantic-search.ts** - use SearchError/EmbeddingError
7. **Phase 7: Migrate CLI commands** - use error renderer at top level
8. **Phase 8: Remove handleApiKeyError** - no longer needed

### 4.6 Key Principles

1. **Never lose type information** - Use tagged unions throughout
2. **Separate error definition from display** - Errors carry data, renderers format it
3. **Single point of error formatting** - All user-facing error output goes through renderer
4. **Effect-native errors** - Use `_tag` discriminators, not `instanceof`
5. **Actionable errors** - Include suggestions where possible
6. **Structured for logging** - JSON-serializable for debugging

---

## 5. Files Requiring Changes

| File                                | Changes Needed                                  |
| ----------------------------------- | ----------------------------------------------- |
| `src/core/types.ts`                 | Expand error types or move to dedicated module  |
| `src/embeddings/openai-provider.ts` | Replace Error classes, remove handleApiKeyError |
| `src/embeddings/semantic-search.ts` | Use typed errors instead of generic Error       |
| `src/index/storage.ts`              | Use IoError constructor                         |
| `src/index/indexer.ts`              | Use typed errors                                |
| `src/index/watcher.ts`              | Use typed errors in callbacks                   |
| `src/search/searcher.ts`            | Use SearchError                                 |
| `src/cli/commands/search.ts`        | Use error renderer                              |
| `src/cli/commands/index-cmd.ts`     | Use error renderer                              |
| `src/cli/commands/context.ts`       | Use error renderer                              |
| `src/cli/main.ts`                   | Centralize error handling                       |
| `src/mcp/server.ts`                 | Use typed errors                                |
| `src/summarize/summarizer.ts`       | Propagate typed errors                          |

---

## 6. Implementation Notes

### Don't Do

- Don't use `new Error(...)` for known error conditions
- Don't mix `console.error` into business logic
- Don't swallow errors silently with `Effect.catchAll(() => Effect.succeed(null))`
- Don't convert typed errors to generic errors
- Don't use JavaScript Error subclasses (use tagged unions)

### Do

- Define all possible errors as tagged unions
- Use constructor functions for consistent error creation
- Keep error handling separate from error display
- Provide actionable suggestions in error messages
- Use Effect's type system to track possible errors
- Log full error context for debugging while showing friendly messages to users
