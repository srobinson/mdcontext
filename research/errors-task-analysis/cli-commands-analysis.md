# CLI Commands Module: Effect Error Handling Analysis

> Analysis of mdcontext CLI commands against Effect error handling best practices

**Files analyzed:**

- `/src/cli/main.ts`
- `/src/cli/commands/search.ts`
- `/src/cli/commands/index-cmd.ts`
- `/src/cli/commands/context.ts`
- `/src/cli/commands/tree.ts`
- `/src/cli/commands/links.ts`
- `/src/cli/commands/backlinks.ts`
- `/src/cli/commands/stats.ts`
- `/src/embeddings/openai-provider.ts`
- `/src/parser/parser.ts`

**Date:** 2026-01-22

---

## Executive Summary

The CLI commands module has several violations of Effect error handling best practices. The most significant issues are:

1. **Using plain `Error` objects instead of tagged errors** - Loses type safety and discriminated union benefits
2. **Manual error type inspection in main.ts** - Fragile pattern that relies on internal error structure
3. **Inconsistent error transformation** - Mix of `mapError`, `catchAll`, and error swallowing
4. **Console.error inside error handling flow** - Violates separation of error data from presentation
5. **Error class throwing in constructors** - OpenAI provider throws in constructor instead of returning Effect

---

## 1. Current Error Handling Issues Found

### Issue 1.1: Plain Error Objects Instead of Tagged Errors

**Location:** Multiple command files

**Current code:**

```typescript
// context.ts:70-74
if (fileList.length === 0) {
  yield *
    Effect.fail(
      new Error(
        "At least one file is required. Usage: mdcontext context <file> [files...]",
      ),
    );
}

// context.ts:85-87
const document =
  yield *
  parseFile(filePath).pipe(
    Effect.mapError((e) => new Error(`${e._tag}: ${e.message}`)),
  );

// tree.ts:35-37
const result =
  yield *
  parseFile(resolvedPath).pipe(
    Effect.mapError((e) => new Error(`${e._tag}: ${e.message}`)),
  );
```

**Problem:** Using `new Error()` loses all type safety. The error type becomes `Error` which:

- Cannot be handled with `catchTag`
- Loses structured error information
- Makes exhaustive error handling impossible
- Type signature doesn't indicate what can fail

**Priority:** HIGH

---

### Issue 1.2: Manual Error Type Inspection in main.ts

**Location:** `/src/cli/main.ts:71-97`

**Current code:**

```typescript
const formatCliError = (error: unknown): string => {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (err._tag === "ValidationError" && err.error) {
      const validationError = err.error as Record<string, unknown>;
      // Extract the actual error message
      if (validationError._tag === "Paragraph" && validationError.value) {
        const paragraph = validationError.value as Record<string, unknown>;
        if (paragraph._tag === "Text" && typeof paragraph.value === "string") {
          return paragraph.value;
        }
      }
    }
    // ... more manual inspection
  }
  return String(error);
};
```

**Problem:** This is extremely fragile code that:

- Relies on internal @effect/cli error structure that could change
- Uses unsafe type assertions (`as Record<string, unknown>`)
- Doesn't leverage Effect's error handling patterns
- Cannot be type-checked by TypeScript

**Priority:** HIGH

---

### Issue 1.3: Error Swallowing with catchAll

**Location:** Multiple files

**Current code:**

```typescript
// search.ts:347-349
const estimate = yield* estimateEmbeddingCost(resolvedDir).pipe(
  Effect.catchAll(() => Effect.succeed(null)),
)

// search.ts:376-377
).pipe(handleApiKeyError, Effect.catchAll(() => Effect.succeed(null)))

// index-cmd.ts:231-233
const estimate = yield* estimateEmbeddingCost(resolvedDir).pipe(
  Effect.catchAll(() => Effect.succeed(null)),
)
```

**Problem:** Using `catchAll` to swallow all errors and return `null`:

- Hides actual error conditions
- Makes debugging difficult
- Violates "fail fast" principle
- No logging or indication of what went wrong

**Priority:** MEDIUM

---

### Issue 1.4: Console.error Inside Error Handling

**Location:** `/src/embeddings/openai-provider.ts:130-165`

**Current code:**

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
          yield* Console.error("");
          // ... more console output
          return yield* Effect.fail(new Error("Missing API key"));
        }),
    ),
    // ...
  );
```

**Problem:** While better than console.error in constructors, this still:

- Mixes error handling with presentation
- Cannot be customized for different output formats (JSON vs human-readable)
- Prevents error reuse in non-CLI contexts
- Returns generic `Error` losing type information

**Priority:** MEDIUM

---

### Issue 1.5: Error Classes Not Using Data.TaggedError

**Location:** `/src/embeddings/openai-provider.ts:24-36`

**Current code:**

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

**Problem:** Using plain `Error` extension instead of `Data.TaggedError`:

- Cannot use `Effect.catchTag` directly
- No automatic `_tag` discriminant
- Requires `catchIf` with type guards instead of cleaner patterns
- Not structural equals comparable

**Priority:** MEDIUM

---

### Issue 1.6: Throwing in Constructor

**Location:** `/src/embeddings/openai-provider.ts:56-60`

**Current code:**

```typescript
constructor(options: OpenAIProviderOptions = {}) {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new MissingApiKeyError()
  }
  // ...
}
```

**Problem:** Throwing in a constructor:

- Makes error unrecoverable at construction site
- Requires try/catch instead of Effect error channel
- Violates Effect's "errors as values" principle
- Cannot be composed with other effects

**Priority:** MEDIUM

---

### Issue 1.7: Inline Object Errors Without Type Definition

**Location:** `/src/parser/parser.ts:369-395`

**Current code:**

```typescript
export const parseFile = (
  filePath: string,
): Effect.Effect<
  MdDocument,
  ParseError | { _tag: "IoError"; message: string; path: string }
> =>
  Effect.gen(function* () {
    // ...
    return yield* Effect.fail({
      _tag: "IoError" as const,
      message: error instanceof Error ? error.message : "Unknown error",
      path: filePath,
    });
  });
```

**Problem:** Ad-hoc error objects:

- Not a proper class, cannot use `instanceof`
- Type assertion needed (`as const`)
- No reusable error type
- Cannot extend with methods or additional behavior

**Priority:** LOW

---

### Issue 1.8: Inconsistent Error Handling Across Commands

**Location:** All command files

**Analysis:**

| Command      | Error Pattern Used                     | Issues                          |
| ------------ | -------------------------------------- | ------------------------------- |
| search.ts    | `handleApiKeyError`, `catchAll`        | Swallows errors, mixed patterns |
| index-cmd.ts | `handleApiKeyError`, `catchAll`        | Swallows errors                 |
| context.ts   | `Effect.fail(new Error())`, `mapError` | Loses type info                 |
| tree.ts      | `Effect.fail(new Error())`, `mapError` | Loses type info                 |
| links.ts     | None (propagates)                      | Actually good!                  |
| backlinks.ts | None (propagates)                      | Actually good!                  |
| stats.ts     | None (propagates)                      | Actually good!                  |

**Priority:** MEDIUM

---

## 2. Specific Violations of Effect Best Practices

### Violation 2.1: Anti-pattern - Converting to Generic Error Too Early

**Best practice:** Preserve specific error types throughout the call chain, only transform at the boundary.

**Violated in:**

- `context.ts:86`: `Effect.mapError((e) => new Error(\`${e.\_tag}: ${e.message}\`))`
- `tree.ts:36`: Same pattern

**Reference:** "Anti-pattern 2: Converting Typed Errors to Generic Error Too Early" from research docs

---

### Violation 2.2: Anti-pattern - Not Using Tagged Errors

**Best practice:** Use `Data.TaggedError` for all domain errors.

**Violated in:**

- `openai-provider.ts`: Uses `extends Error` instead of `Data.TaggedError`
- Multiple commands: Uses `new Error()` directly

**Reference:** "Anti-pattern 6: Not Using Tagged Errors" from research docs

---

### Violation 2.3: Anti-pattern - Over-catching with catchAll

**Best practice:** Handle specific errors with `catchTag`, let others propagate.

**Violated in:**

- `search.ts:347-349`: `catchAll(() => Effect.succeed(null))`
- `index-cmd.ts:231-233`: Same pattern

**Reference:** "Anti-pattern 7: Over-catching with catchAll" from research docs

---

### Violation 2.4: Anti-pattern - Mixing Error Handling with Presentation

**Best practice:** Keep errors as pure data, format at the boundary.

**Violated in:**

- `openai-provider.ts:130-165`: `handleApiKeyError` does Console.error inside

**Reference:** "Anti-pattern 1: console.error Inside Error Classes" and "Best Practice 5: Separate Error Presentation from Error Classes" from research docs

---

### Violation 2.5: Best Practice Not Followed - Structured Error Data

**Best practice:** Include machine-readable data in errors for programmatic handling.

**Current state:** Errors contain only string messages, no structured data like:

- Error codes
- Affected file paths (in some cases)
- Suggested fixes
- Exit codes

**Reference:** "Best Practice 2: Structured Error Data for Programmatic Handling" from research docs

---

## 3. Recommended Changes with Code Examples

### Recommendation 3.1: Create Centralized Error Types

**File:** `src/errors/cli-errors.ts` (new file)

```typescript
import { Data } from "effect";

// ============================================================================
// CLI/User-Facing Errors
// ============================================================================

export class MissingArgumentError extends Data.TaggedError(
  "MissingArgumentError",
)<{
  readonly argument: string;
  readonly usage: string;
}> {}

export class InvalidOptionError extends Data.TaggedError("InvalidOptionError")<{
  readonly option: string;
  readonly value: string;
  readonly expected: string;
}> {}

// ============================================================================
// File System Errors
// ============================================================================

export class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
  readonly path: string;
}> {}

export class FileReadError extends Data.TaggedError("FileReadError")<{
  readonly path: string;
  readonly cause: string;
}> {}

// ============================================================================
// Index Errors
// ============================================================================

export class IndexNotFoundError extends Data.TaggedError("IndexNotFoundError")<{
  readonly directory: string;
}> {}

// ============================================================================
// API Errors
// ============================================================================

export class ApiKeyMissingError extends Data.TaggedError("ApiKeyMissingError")<{
  readonly provider: string;
  readonly envVar: string;
}> {}

export class ApiKeyInvalidError extends Data.TaggedError("ApiKeyInvalidError")<{
  readonly provider: string;
  readonly details: string;
}> {}

// ============================================================================
// Parse Errors
// ============================================================================

export class ParseError extends Data.TaggedError("ParseError")<{
  readonly path: string;
  readonly message: string;
  readonly line?: number;
}> {}

export class IoError extends Data.TaggedError("IoError")<{
  readonly path: string;
  readonly message: string;
  readonly operation: "read" | "write" | "stat";
}> {}
```

**Priority:** HIGH

---

### Recommendation 3.2: Create Centralized Error Handler

**File:** `src/cli/error-handler.ts` (new file)

```typescript
import { Effect, Console } from "effect";
import type {
  MissingArgumentError,
  FileNotFoundError,
  ParseError,
  IoError,
  ApiKeyMissingError,
  ApiKeyInvalidError,
  IndexNotFoundError,
} from "../errors/cli-errors.js";

type CliError =
  | MissingArgumentError
  | FileNotFoundError
  | ParseError
  | IoError
  | ApiKeyMissingError
  | ApiKeyInvalidError
  | IndexNotFoundError;

interface FormatOptions {
  readonly json: boolean;
  readonly verbose?: boolean;
}

// Format errors for CLI output - ONLY at the boundary
export const formatError = (
  error: CliError,
  options: FormatOptions,
): string => {
  if (options.json) {
    return JSON.stringify({
      error: {
        code: error._tag,
        ...error,
      },
    });
  }

  switch (error._tag) {
    case "MissingArgumentError":
      return `Error: Missing required argument '${error.argument}'\n\nUsage: ${error.usage}`;

    case "FileNotFoundError":
      return `Error: File not found: ${error.path}`;

    case "ParseError":
      return error.line
        ? `Error: Parse error in ${error.path}:${error.line}\n  ${error.message}`
        : `Error: Parse error in ${error.path}\n  ${error.message}`;

    case "IoError":
      return `Error: Could not ${error.operation} file: ${error.path}\n  ${error.message}`;

    case "ApiKeyMissingError":
      return [
        `Error: ${error.envVar} not set`,
        "",
        `To use ${error.provider}, set your API key:`,
        `  export ${error.envVar}=sk-...`,
        "",
        "Or add to .env file in project root.",
      ].join("\n");

    case "ApiKeyInvalidError":
      return [
        `Error: Invalid ${error.provider} API key`,
        "",
        "The provided API key was rejected.",
        `Details: ${error.details}`,
      ].join("\n");

    case "IndexNotFoundError":
      return [
        "No index found.",
        "",
        `Run: mdcontext index ${error.directory}`,
        "  Add --embed for semantic search capabilities",
      ].join("\n");

    default:
      return `Error: ${String(error)}`;
  }
};

// Exit code mapping
export const getExitCode = (error: CliError): number => {
  switch (error._tag) {
    case "MissingArgumentError":
    case "InvalidOptionError":
      return 2; // Invalid argument

    case "FileNotFoundError":
      return 3;

    case "ParseError":
    case "IoError":
      return 4;

    case "ApiKeyMissingError":
    case "ApiKeyInvalidError":
      return 5;

    case "IndexNotFoundError":
      return 6;

    default:
      return 1;
  }
};

// Handler to apply at command level
export const handleCliErrors = <A>(
  effect: Effect.Effect<A, CliError>,
  options: FormatOptions,
): Effect.Effect<A, never> =>
  effect.pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Console.error(formatError(error, options));
        return yield* Effect.die({ exitCode: getExitCode(error) });
      }),
    ),
  );
```

**Priority:** HIGH

---

### Recommendation 3.3: Update context.ts to Use New Error Types

**Before:**

```typescript
if (fileList.length === 0) {
  yield *
    Effect.fail(
      new Error(
        "At least one file is required. Usage: mdcontext context <file> [files...]",
      ),
    );
}

const document =
  yield *
  parseFile(filePath).pipe(
    Effect.mapError((e) => new Error(`${e._tag}: ${e.message}`)),
  );
```

**After:**

```typescript
import { MissingArgumentError } from "../../errors/cli-errors.js";

if (fileList.length === 0) {
  yield *
    Effect.fail(
      new MissingArgumentError({
        argument: "files",
        usage: "mdcontext context <file> [files...]",
      }),
    );
}

// Let errors propagate - handle at boundary
const document = yield * parseFile(filePath);
```

**Priority:** HIGH

---

### Recommendation 3.4: Update OpenAI Provider to Use Tagged Errors

**Before:**

```typescript
export class MissingApiKeyError extends Error {
  constructor() {
    super("OPENAI_API_KEY not set");
    this.name = "MissingApiKeyError";
  }
}

// In constructor:
if (!apiKey) {
  throw new MissingApiKeyError();
}
```

**After:**

```typescript
import { Data, Effect } from "effect";
import {
  ApiKeyMissingError,
  ApiKeyInvalidError,
} from "../errors/cli-errors.js";

// Factory function instead of throwing constructor
export const createOpenAIProvider = (
  options?: OpenAIProviderOptions,
): Effect.Effect<EmbeddingProvider, ApiKeyMissingError> =>
  Effect.gen(function* () {
    const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return yield* Effect.fail(
        new ApiKeyMissingError({
          provider: "OpenAI",
          envVar: "OPENAI_API_KEY",
        }),
      );
    }
    return new OpenAIProvider(apiKey, options);
  });
```

**Priority:** MEDIUM

---

### Recommendation 3.5: Update handleApiKeyError to Not Do Console Output

**Before:**

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
          // ...
          return yield* Effect.fail(new Error("Missing API key"));
        }),
    ),
  );
```

**After:**

```typescript
import {
  ApiKeyMissingError,
  ApiKeyInvalidError,
} from "../errors/cli-errors.js";

// Simply transform to tagged errors - no presentation
export const normalizeApiKeyErrors = <A, E>(
  effect: Effect.Effect<A, E | MissingApiKeyError | InvalidApiKeyError>,
): Effect.Effect<A, E | ApiKeyMissingError | ApiKeyInvalidError> =>
  effect.pipe(
    Effect.catchTag("MissingApiKeyError", () =>
      Effect.fail(
        new ApiKeyMissingError({
          provider: "OpenAI",
          envVar: "OPENAI_API_KEY",
        }),
      ),
    ),
    Effect.catchTag("InvalidApiKeyError", (e) =>
      Effect.fail(
        new ApiKeyInvalidError({
          provider: "OpenAI",
          details: e.message,
        }),
      ),
    ),
  );
```

**Priority:** MEDIUM

---

### Recommendation 3.6: Replace catchAll with Explicit Error Handling

**Before:**

```typescript
const estimate =
  yield *
  estimateEmbeddingCost(resolvedDir).pipe(
    Effect.catchAll(() => Effect.succeed(null)),
  );
```

**After:**

```typescript
const estimate =
  yield *
  estimateEmbeddingCost(resolvedDir).pipe(
    Effect.catchTag(
      "IndexNotFoundError",
      () => Effect.succeed(null), // Explicitly OK to skip if no index
    ),
    Effect.catchTag(
      "ApiKeyMissingError",
      () => Effect.succeed(null), // Can't estimate without API key
    ),
    // Other errors propagate
  );
```

**Priority:** MEDIUM

---

### Recommendation 3.7: Update main.ts Error Handling

**Before:**

```typescript
const formatCliError = (error: unknown): string => {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (err._tag === "ValidationError" && err.error) {
      // ... deep manual inspection
    }
  }
  return String(error);
};

Effect.suspend(() => cli(processedArgv)).pipe(
  Effect.catchAll((error) =>
    Effect.sync(() => {
      if (isValidationError(error)) {
        const message = formatCliError(error);
        console.error(`\nError: ${message}`);
        process.exit(1);
      }
      throw error;
    }),
  ),
  NodeRuntime.runMain,
);
```

**After:**

```typescript
import { formatError, getExitCode } from "./error-handler.js";

Effect.suspend(() => cli(processedArgv)).pipe(
  Effect.provide(Layer.merge(NodeContext.layer, cliConfigLayer)),
  Effect.catchTags({
    // Handle our domain errors
    MissingArgumentError: (e) => displayErrorAndExit(e),
    FileNotFoundError: (e) => displayErrorAndExit(e),
    ParseError: (e) => displayErrorAndExit(e),
    IoError: (e) => displayErrorAndExit(e),
    ApiKeyMissingError: (e) => displayErrorAndExit(e),
    ApiKeyInvalidError: (e) => displayErrorAndExit(e),
    IndexNotFoundError: (e) => displayErrorAndExit(e),
  }),
  // Let @effect/cli handle its own ValidationError
  NodeRuntime.runMain,
);

const displayErrorAndExit = (error: CliError) =>
  Effect.gen(function* () {
    yield* Console.error(formatError(error, { json: false }));
    return yield* Effect.die({ exitCode: getExitCode(error) });
  });
```

**Priority:** HIGH

---

## 4. Priority Summary

### High Priority (Address First)

| Issue | Description                                  | Effort |
| ----- | -------------------------------------------- | ------ |
| 1.1   | Plain Error objects instead of tagged errors | Medium |
| 1.2   | Manual error type inspection in main.ts      | Medium |
| 3.1   | Create centralized error types               | Low    |
| 3.2   | Create centralized error handler             | Low    |
| 3.3   | Update context.ts                            | Low    |
| 3.7   | Update main.ts                               | Medium |

### Medium Priority (Address Second)

| Issue | Description                              | Effort |
| ----- | ---------------------------------------- | ------ |
| 1.3   | Error swallowing with catchAll           | Low    |
| 1.4   | Console.error inside error handling      | Medium |
| 1.5   | Error classes not using Data.TaggedError | Medium |
| 1.6   | Throwing in constructor                  | Medium |
| 1.8   | Inconsistent error handling              | Medium |
| 3.4   | Update OpenAI provider                   | Medium |
| 3.5   | Update handleApiKeyError                 | Low    |
| 3.6   | Replace catchAll                         | Low    |

### Low Priority (Address Later)

| Issue | Description          | Effort |
| ----- | -------------------- | ------ |
| 1.7   | Inline object errors | Low    |

---

## Migration Path

### Phase 1: Foundation (High Priority)

1. Create `src/errors/cli-errors.ts` with tagged error classes
2. Create `src/cli/error-handler.ts` with formatters
3. Export from index files

### Phase 2: Command Updates (High Priority)

1. Update `context.ts` and `tree.ts` to use new error types
2. Update `main.ts` to use centralized error handling
3. Remove manual error inspection code

### Phase 3: Provider Updates (Medium Priority)

1. Migrate OpenAI provider errors to tagged errors
2. Update `handleApiKeyError` to be presentation-free
3. Add factory functions instead of throwing constructors

### Phase 4: Refinement (Medium/Low Priority)

1. Replace `catchAll` with explicit `catchTag`
2. Add logging for swallowed errors
3. Ensure all commands have consistent patterns

---

## Testing Recommendations

After implementing changes:

1. **Unit tests for error types:**
   - Verify `_tag` discriminant exists
   - Test error creation with all required fields
   - Test `catchTag` works correctly

2. **Integration tests for CLI:**
   - Test each error scenario produces correct output
   - Test JSON format error output
   - Test exit codes are correct

3. **Snapshot tests for error messages:**
   - Ensure user-facing messages remain clear
   - Verify formatting is consistent
