# Effect CLI Error Handling Research

This document explores best practices for error handling in Effect-based CLI applications, with specific recommendations for mdcontext.

## Table of Contents

1. [@effect/cli Error Patterns](#1-effectcli-error-patterns)
2. [Layered Error Handling](#2-layered-error-handling)
3. [Error Presentation](#3-error-presentation)
4. [Real-world Examples](#4-real-world-examples)
5. [Recommendations for mdcontext](#5-recommendations-for-mdcontext)

---

## 1. @effect/cli Error Patterns

### Command Type Signature

The @effect/cli `Command` type uses three type parameters:

```typescript
Command<R, E, A>;
```

- **R** (Environment): Dependencies or context needed by the command's handler
- **E** (Expected Errors): Types of errors the command might produce during execution
- **A** (Arguments/Configuration): Configuration object the handler receives

### ValidationError Types

@effect/cli provides built-in validation errors through the `ValidationError` module. These are returned when parsing fails:

| Error Type               | Description                        |
| ------------------------ | ---------------------------------- |
| `CommandMismatch`        | Command name doesn't match         |
| `CorrectedFlag`          | Auto-corrected misspelled flag     |
| `HelpRequested`          | User requested `--help`            |
| `InvalidArgument`        | Argument failed validation         |
| `InvalidValue`           | Value doesn't meet constraints     |
| `MissingValue`           | Required value not provided        |
| `MissingFlag`            | Required flag not provided         |
| `MultipleValuesDetected` | Multiple values where one expected |
| `MissingSubcommand`      | Subcommand required but missing    |
| `UnclusteredFlag`        | Cluster format issue               |

Each `ValidationError` contains an `error: HelpDoc` field with formatted documentation.

### Built-in Error Handling

The `Command.run` method handles:

1. **Argument parsing** - Validates against command structure
2. **Help text generation** - Automatic `--help` and `--version`
3. **Error formatting** - User-friendly error messages

```typescript
import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";

const myCommand = Command.make(
  "myapp",
  {
    // args and options...
  },
  (args) =>
    Effect.gen(function* () {
      // handler logic
    }),
);

const cli = Command.run(myCommand, {
  name: "myapp",
  version: "1.0.0",
});

cli(process.argv).pipe(
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain, // Pretty error formatting by default
);
```

### Excess Arguments Protection

```
npx tsx myapp.ts unexpected extra args
# Output: Received unknown argument: 'extra'
```

This prevents execution of malformed commands.

---

## 2. Layered Error Handling

### The Three-Layer Model

Effect applications typically organize errors into three layers:

```
+----------------------------------+
|         User-Facing Errors       |  CLI output, JSON responses
+----------------------------------+
              |
              v (transform)
+----------------------------------+
|         Domain Errors            |  Business logic failures
+----------------------------------+
              |
              v (transform)
+----------------------------------+
|      Infrastructure Errors       |  API calls, file system, DB
+----------------------------------+
```

### Tagged Errors with Data.TaggedError

Create type-safe, discriminated union errors:

```typescript
import { Data, Effect, Console } from "effect";

// Domain errors
class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
  path: string;
}> {}

class ParseError extends Data.TaggedError("ParseError")<{
  path: string;
  message: string;
  line?: number;
}> {}

class IndexNotFoundError extends Data.TaggedError("IndexNotFoundError")<{
  directory: string;
}> {}

// Infrastructure errors
class ApiKeyMissingError extends Data.TaggedError("ApiKeyMissingError")<{}> {}

class ApiKeyInvalidError extends Data.TaggedError("ApiKeyInvalidError")<{
  details: string;
}> {}

class NetworkError extends Data.TaggedError("NetworkError")<{
  url: string;
  statusCode?: number;
}> {}
```

### Transforming Errors Between Layers

Use `Effect.mapError` to transform errors at layer boundaries:

```typescript
import { Effect } from "effect";

// Infrastructure layer: raw file system errors
const readFileRaw = (
  path: string,
): Effect.Effect<string, NodeJS.ErrnoException> =>
  Effect.tryPromise({
    try: () => fs.readFile(path, "utf-8"),
    catch: (e) => e as NodeJS.ErrnoException,
  });

// Domain layer: transform to domain error
const readFile = (path: string): Effect.Effect<string, FileNotFoundError> =>
  readFileRaw(path).pipe(
    Effect.mapError((e) => new FileNotFoundError({ path })),
  );
```

### Catching Specific Errors with catchTag

```typescript
import { Effect, Data } from "effect";

class HttpError extends Data.TaggedError("HttpError")<{}> {}
class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string;
  message: string;
}> {}

const program = Effect.gen(function* () {
  // ... operations that may fail
});

// Handle specific error types
const recovered = program.pipe(
  Effect.catchTag("HttpError", (error) =>
    Effect.succeed("Recovered from HTTP error"),
  ),
  Effect.catchTag("ValidationError", (error) =>
    Effect.succeed(`Validation failed: ${error.message}`),
  ),
);
```

### Handling Multiple Errors with catchTags

```typescript
const recovered = program.pipe(
  Effect.catchTags({
    HttpError: (error) => Effect.succeed("HTTP recovery"),
    ValidationError: (error) => Effect.succeed(`Validation: ${error.message}`),
    NetworkError: (error) => Effect.succeed(`Network issue: ${error.url}`),
  }),
);
```

### Expected Errors vs Defects

**Expected Errors (E channel):**

- Recoverable failures the caller can handle
- Validation errors, "not found", permission denied
- Tracked in the type system: `Effect<A, E, R>`

**Defects (Unexpected Errors):**

- Unrecoverable situations: bugs, invariant violations
- Use `Effect.die` or `Effect.dieMessage`
- Handle once at system boundary (logging, crash reporting)

```typescript
// Expected error - caller can recover
const divide = (a: number, b: number): Effect.Effect<number, DivisionError> =>
  b === 0
    ? Effect.fail(new DivisionError({ dividend: a }))
    : Effect.succeed(a / b);

// Defect - unrecoverable, terminates fiber
const assertPositive = (n: number): Effect.Effect<number, never> =>
  n < 0
    ? Effect.dieMessage("Invariant violated: expected positive number")
    : Effect.succeed(n);
```

### Converting Errors to Defects

```typescript
// Convert all failures to defects
const program = divide(1, 0).pipe(Effect.orDie);

// Convert with custom transformation
const programWithContext = divide(1, 0).pipe(
  Effect.orDieWith((error) => new Error(`Critical: ${error.message}`)),
);
```

---

## 3. Error Presentation

### Terminal Output with runMain

The `runMain` function from `@effect/platform-node` provides built-in pretty error formatting:

```typescript
import { NodeRuntime } from "@effect/platform-node";

cli(process.argv).pipe(
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain, // Pretty logger enabled by default
);

// Or disable pretty formatting:
NodeRuntime.runMain({ disablePrettyLogger: true });
```

### Custom Error Formatting

For CLI-specific error messages:

```typescript
const formatCliError = (error: unknown): string => {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;

    // Handle ValidationError from @effect/cli
    if (err._tag === "ValidationError" && err.error) {
      // Extract HelpDoc content
      return extractHelpDocText(err.error);
    }

    // Handle custom tagged errors
    if (err._tag && typeof err._tag === "string") {
      return formatTaggedError(err);
    }
  }
  return String(error);
};
```

### JSON Error Output for Machine Consumption

Support `--json` flag for structured error output:

```typescript
interface JsonError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

const formatJsonError = (error: TaggedError): JsonError => ({
  error: {
    code: error._tag,
    message: error.message ?? String(error),
    details: { ...error }, // Include all error properties
  },
});

// In command handler:
if (jsonOutput) {
  yield * Console.log(JSON.stringify(formatJsonError(error)));
} else {
  yield * Console.error(formatUserFriendlyError(error));
}
```

### Verbosity Levels

Implement `--verbose` and `--debug` flags:

```typescript
type LogLevel = "quiet" | "normal" | "verbose" | "debug";

const logError = (error: Error, level: LogLevel): Effect.Effect<void> =>
  Effect.gen(function* () {
    switch (level) {
      case "quiet":
        // Just exit code
        break;
      case "normal":
        yield* Console.error(error.message);
        break;
      case "verbose":
        yield* Console.error(error.message);
        yield* Console.error(`  Type: ${error.constructor.name}`);
        if ("path" in error) {
          yield* Console.error(`  Path: ${error.path}`);
        }
        break;
      case "debug":
        yield* Console.error(error.message);
        yield* Console.error(error.stack ?? "");
        yield* Console.error("Full error object:");
        yield* Console.error(JSON.stringify(error, null, 2));
        break;
    }
  });
```

### Color and ANSI Formatting

@effect/cli integrates with terminal styling:

```typescript
// Check terminal capabilities
const supportsColor = process.stdout.isTTY;

// ANSI codes for styling
const bold = (text: string) => (supportsColor ? `\x1b[1m${text}\x1b[0m` : text);
const red = (text: string) => (supportsColor ? `\x1b[31m${text}\x1b[0m` : text);
const yellow = (text: string) =>
  supportsColor ? `\x1b[33m${text}\x1b[0m` : text;

const formatError = (error: Error) => `${red(bold("Error:"))} ${error.message}`;
```

### Schema Error Formatting

Effect Schema provides formatters for validation errors:

```typescript
import { Schema, ParseResult, Either } from "effect";

// Tree formatter - hierarchical view
const result = Schema.decodeUnknownEither(MySchema)(data);
if (Either.isLeft(result)) {
  console.error(ParseResult.TreeFormatter.formatErrorSync(result.left));
}
/* Output:
{ readonly name: string; readonly age: number }
└─ ["name"]
   └─ is missing
*/

// Array formatter - flat list for programmatic use
if (Either.isLeft(result)) {
  const errors = ParseResult.ArrayFormatter.formatErrorSync(result.left);
  // [{ _tag: 'Missing', path: ['name'], message: 'is missing' }]
}
```

---

## 4. Real-world Examples

### Example 1: File Operation with Layered Errors

```typescript
import { Data, Effect, Console } from "effect";
import * as fs from "node:fs/promises";

// Error types
class FileReadError extends Data.TaggedError("FileReadError")<{
  path: string;
  cause: Error;
}> {}

class ConfigParseError extends Data.TaggedError("ConfigParseError")<{
  path: string;
  message: string;
}> {}

// Infrastructure layer
const readFileRaw = (path: string) =>
  Effect.tryPromise({
    try: () => fs.readFile(path, "utf-8"),
    catch: (e) => new FileReadError({ path, cause: e as Error }),
  });

// Domain layer
const parseConfig = (content: string, path: string) =>
  Effect.try({
    try: () => JSON.parse(content),
    catch: (e) =>
      new ConfigParseError({
        path,
        message: e instanceof Error ? e.message : "Invalid JSON",
      }),
  });

// Combined operation
const loadConfig = (path: string) =>
  Effect.gen(function* () {
    const content = yield* readFileRaw(path);
    return yield* parseConfig(content, path);
  });

// CLI layer - transform to user-facing messages
const loadConfigForCli = (path: string, json: boolean) =>
  loadConfig(path).pipe(
    Effect.catchTags({
      FileReadError: (e) =>
        json
          ? Effect.fail({
              code: "FILE_NOT_FOUND",
              message: `Cannot read: ${e.path}`,
            })
          : Effect.gen(function* () {
              yield* Console.error(`Error: Cannot read file "${e.path}"`);
              yield* Console.error(`  ${e.cause.message}`);
              return yield* Effect.fail(new Error("File read failed"));
            }),
      ConfigParseError: (e) =>
        json
          ? Effect.fail({ code: "PARSE_ERROR", message: e.message })
          : Effect.gen(function* () {
              yield* Console.error(`Error: Invalid config file "${e.path}"`);
              yield* Console.error(`  ${e.message}`);
              return yield* Effect.fail(new Error("Parse failed"));
            }),
    }),
  );
```

### Example 2: API Key Validation Pattern

From a real CLI (similar to mdcontext's approach):

```typescript
import { Console, Effect } from "effect";

class MissingApiKeyError extends Error {
  readonly _tag = "MissingApiKeyError";
}

class InvalidApiKeyError extends Error {
  readonly _tag = "InvalidApiKeyError";
  constructor(readonly details: string) {
    super("Invalid API key");
  }
}

// Reusable error handler
const handleApiKeyError = <A, E>(
  effect: Effect.Effect<A, E | MissingApiKeyError | InvalidApiKeyError>,
): Effect.Effect<A, E | Error> =>
  effect.pipe(
    Effect.catchIf(
      (e): e is MissingApiKeyError => e instanceof MissingApiKeyError,
      () =>
        Effect.gen(function* () {
          yield* Console.error("");
          yield* Console.error("Error: API key not set");
          yield* Console.error("");
          yield* Console.error("Set your API key:");
          yield* Console.error("  export OPENAI_API_KEY=sk-...");
          yield* Console.error("");
          yield* Console.error("Or add to .env file.");
          return yield* Effect.fail(new Error("Missing API key"));
        }),
    ),
    Effect.catchIf(
      (e): e is InvalidApiKeyError => e instanceof InvalidApiKeyError,
      (e) =>
        Effect.gen(function* () {
          yield* Console.error("");
          yield* Console.error("Error: Invalid API key");
          yield* Console.error("");
          yield* Console.error("The API key was rejected.");
          yield* Console.error(`Details: ${e.details}`);
          return yield* Effect.fail(new Error("Invalid API key"));
        }),
    ),
  );

// Usage in command
const searchCommand = Command.make(
  "search",
  {
    /* ... */
  },
  (args) =>
    Effect.gen(function* () {
      const results = yield* semanticSearch(args.query).pipe(handleApiKeyError);
      // ...
    }),
);
```

### Example 3: Graceful Degradation

```typescript
const searchWithFallback = (query: string, options: SearchOptions) =>
  Effect.gen(function* () {
    // Try semantic search first
    const semanticResult = yield* semanticSearch(query).pipe(
      Effect.catchTag("MissingApiKeyError", () => Effect.succeed(null)),
      Effect.catchTag("IndexNotFoundError", () => Effect.succeed(null)),
    );

    if (semanticResult) {
      return { mode: "semantic", results: semanticResult };
    }

    // Fall back to keyword search
    yield* Console.log("Falling back to keyword search...");
    const keywordResult = yield* keywordSearch(query);
    return { mode: "keyword", results: keywordResult };
  });
```

---

## 5. Recommendations for mdcontext

### Current State Analysis

Based on code review, mdcontext currently:

1. **Uses `Effect.fail(new Error(...))` directly** - Loses type safety
2. **Has ad-hoc error handling** in `main.ts` with manual `_tag` checking
3. **Mixes infrastructure and domain errors** - `IoError` and `ParseError` at same level
4. **Has good API key error handling** in `openai-provider.ts` as a pattern to follow

### Current Issues

1. **Untyped errors**: Using `new Error()` loses discriminated union benefits

   ```typescript
   // Current
   yield * Effect.fail(new Error("At least one file is required..."));

   // Better
   yield * Effect.fail(new MissingArgumentError({ argument: "files" }));
   ```

2. **Manual error formatting**: The `formatCliError` function manually inspects error structure

   ```typescript
   // Current - fragile, relies on internal structure
   if (err._tag === "ValidationError" && err.error) {
     const validationError = err.error as Record<string, unknown>;
     // ...deeply nested extraction
   }
   ```

3. **Inconsistent error transformation**: Some places use `Effect.mapError`, others use `Effect.catchAll`

4. **Silent failures**: `catch (_e)` in `assembleContext` swallows errors

   ```typescript
   } catch (_e) {
     // Skip files that can't be processed
     overflow.push(sourcePath)
   }
   ```

### Proposed Error Hierarchy

```typescript
// src/errors/index.ts

import { Data } from "effect";

// Base error for all mdcontext errors
export class MdcontextError extends Data.TaggedError("MdcontextError")<{
  message: string;
}> {}

// ============================================================================
// Infrastructure Errors
// ============================================================================

export class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
  path: string;
}> {}

export class FileReadError extends Data.TaggedError("FileReadError")<{
  path: string;
  cause: string;
}> {}

export class ApiKeyMissingError extends Data.TaggedError(
  "ApiKeyMissingError",
)<{}> {}

export class ApiKeyInvalidError extends Data.TaggedError("ApiKeyInvalidError")<{
  details: string;
}> {}

export class NetworkError extends Data.TaggedError("NetworkError")<{
  url: string;
  statusCode?: number;
  message: string;
}> {}

// ============================================================================
// Domain Errors
// ============================================================================

export class ParseError extends Data.TaggedError("ParseError")<{
  path: string;
  message: string;
  line?: number;
}> {}

export class IndexNotFoundError extends Data.TaggedError("IndexNotFoundError")<{
  directory: string;
}> {}

export class IndexOutdatedError extends Data.TaggedError("IndexOutdatedError")<{
  directory: string;
  indexAge: number;
}> {}

export class SectionNotFoundError extends Data.TaggedError(
  "SectionNotFoundError",
)<{
  selector: string;
  availableSections: string[];
}> {}

export class SearchError extends Data.TaggedError("SearchError")<{
  query: string;
  message: string;
}> {}

// ============================================================================
// CLI/User-Facing Errors
// ============================================================================

export class MissingArgumentError extends Data.TaggedError(
  "MissingArgumentError",
)<{
  argument: string;
  usage: string;
}> {}

export class InvalidOptionError extends Data.TaggedError("InvalidOptionError")<{
  option: string;
  value: string;
  expected: string;
}> {}
```

### Proposed Error Handler

```typescript
// src/cli/error-handler.ts

import { Effect, Console } from "effect";
import type {
  FileNotFoundError,
  ParseError,
  IndexNotFoundError,
  ApiKeyMissingError,
  MissingArgumentError,
} from "../errors/index.js";

type CliError =
  | FileNotFoundError
  | ParseError
  | IndexNotFoundError
  | ApiKeyMissingError
  | MissingArgumentError;

interface ErrorOutput {
  json: boolean;
  verbose: boolean;
}

export const handleCliError =
  (options: ErrorOutput) =>
  <A, E extends CliError>(
    effect: Effect.Effect<A, E>,
  ): Effect.Effect<A, never> =>
    effect.pipe(
      Effect.catchTags({
        FileNotFoundError: (e) => formatFileNotFound(e, options),
        ParseError: (e) => formatParseError(e, options),
        IndexNotFoundError: (e) => formatIndexNotFound(e, options),
        ApiKeyMissingError: (e) => formatApiKeyMissing(e, options),
        MissingArgumentError: (e) => formatMissingArgument(e, options),
      }),
      Effect.catchAll((e) => formatUnknownError(e, options)),
    );

const formatFileNotFound = (error: FileNotFoundError, options: ErrorOutput) =>
  Effect.gen(function* () {
    if (options.json) {
      yield* Console.log(
        JSON.stringify({
          error: { code: "FILE_NOT_FOUND", path: error.path },
        }),
      );
    } else {
      yield* Console.error(`Error: File not found: ${error.path}`);
    }
    return yield* Effect.die("exit");
  });

// ... similar handlers for each error type
```

### Migration Path

**Phase 1: Define Error Types (Low Risk)**

1. Create `src/errors/index.ts` with tagged error classes
2. Export from main index

**Phase 2: Update Infrastructure Layer**

1. Update `parser.ts` to use new `ParseError`/`FileReadError`
2. Update `openai-provider.ts` to use standard tagged errors
3. Update file system operations in indexer, storage

**Phase 3: Update Domain Layer**

1. Add `mapError` at service boundaries
2. Ensure consistent error transformation

**Phase 4: Update CLI Layer**

1. Create centralized error handler
2. Update `main.ts` to use new handler
3. Add JSON error output support

**Phase 5: Add Verbosity Support**

1. Add `--verbose` and `--debug` global options
2. Adjust error output detail based on level

### Example Refactored Command

```typescript
// Before
export const contextCommand = Command.make(
  "context",
  { files: Args.file({ name: "files" }).pipe(Args.repeated) },
  ({ files }) =>
    Effect.gen(function* () {
      if (files.length === 0) {
        yield* Effect.fail(new Error("At least one file is required..."));
      }
      const document = yield* parseFile(filePath).pipe(
        Effect.mapError((e) => new Error(`${e._tag}: ${e.message}`)),
      );
      // ...
    }),
);

// After
export const contextCommand = Command.make(
  "context",
  {
    files: Args.file({ name: "files" }).pipe(Args.repeated),
    json: jsonOption,
    verbose: verboseOption,
  },
  ({ files, json, verbose }) =>
    Effect.gen(function* () {
      if (files.length === 0) {
        yield* Effect.fail(
          new MissingArgumentError({
            argument: "files",
            usage: "mdcontext context <file> [files...]",
          }),
        );
      }

      const document = yield* parseFile(filePath);
      // Errors automatically typed and handled by outer handler

      // ...
    }).pipe(handleCliError({ json, verbose })),
);
```

---

## Sources

- [Effect Documentation - Expected Errors](https://effect.website/docs/error-management/expected-errors/)
- [Effect Documentation - Error Channel Operations](https://effect.website/docs/error-management/error-channel-operations/)
- [Effect Documentation - Unexpected Errors](https://effect.website/docs/error-management/unexpected-errors/)
- [Effect Documentation - Schema Error Formatters](https://effect.website/docs/schema/error-formatters/)
- [Effect Documentation - Logging](https://effect.website/docs/observability/logging/)
- [Effect Documentation - Cause](https://effect.website/docs/data-types/cause/)
- [@effect/cli npm package](https://www.npmjs.com/package/@effect/cli)
- [@effect/cli API - ValidationError](https://effect-ts.github.io/effect/cli/ValidationError.ts.html)
- [CLI Framework - DeepWiki](https://deepwiki.com/Effect-TS/effect/8.1-cli-framework)
- [Effect-TS Examples Repository](https://github.com/Effect-TS/examples)
- [EffectPatterns Community Repository](https://github.com/PaulJPhilp/EffectPatterns)
- [Exploring Effect in TypeScript - Tweag](https://www.tweag.io/blog/2024-11-07-typescript-effect/)
- [How to Effect TS - DTech Vision](https://dtech.vision/blog/how-to-effect-ts-best-practices/)
- [Effect Solutions - CLI Documentation](https://www.effect.solutions/cli)
