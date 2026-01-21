# Effect: Errors as Values Pattern

> A comprehensive guide to Effect's type-safe error handling system

## Table of Contents

1. [Core Concept: Errors as Values](#core-concept-errors-as-values)
2. [Error Types in Effect](#error-types-in-effect)
3. [Error Handling Patterns](#error-handling-patterns)
4. [Best Practices for CLI Applications](#best-practices-for-cli-applications)
5. [Anti-patterns to Avoid](#anti-patterns-to-avoid)
6. [Sources](#sources)

---

## Core Concept: Errors as Values

### The Problem with Traditional Error Handling

In traditional TypeScript, error handling relies on try/catch and thrown exceptions:

```typescript
// Traditional TypeScript - no type safety for errors
function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Division by zero");
  }
  return a / b;
}

// The type signature gives NO indication this can fail
// TypeScript infers: (a: number, b: number) => number
```

**Problems with this approach:**

- Type signatures don't indicate that functions can throw
- Impossible to know what errors a function might produce
- Easy to forget error handling as codebases grow
- No compile-time enforcement of error handling

### Effect's Solution: Track Errors in the Type System

Effect treats errors as **first-class values** tracked in the type system through the `Effect<A, E, R>` type:

```typescript
Effect<A, E, R>;
//     ^  ^  ^
//     |  |  └── R: Requirements (dependencies/context)
//     |  └───── E: Error type (what can go wrong)
//     └──────── A: Success type (the result)
```

**Key insight**: By making errors explicit in the type signature, you always know:

- What a function returns on success
- What errors it might produce
- What dependencies it requires

### Effect vs Exceptions: A Comparison

```typescript
// Traditional: errors are invisible in types
function parseJSON(str: string): unknown {
  return JSON.parse(str); // Can throw SyntaxError!
}

// Effect: errors are visible and tracked
import { Effect } from "effect";

class ParseError extends Data.TaggedError("ParseError")<{
  message: string;
}> {}

const parseJSON = (str: string): Effect.Effect<unknown, ParseError> =>
  Effect.try({
    try: () => JSON.parse(str),
    catch: (e) => new ParseError({ message: String(e) }),
  });
```

### Automatic Error Union Tracking

When you compose effects, Effect automatically tracks all possible errors as a union:

```typescript
import { Effect, Data } from "effect"

class NetworkError extends Data.TaggedError("NetworkError")<{}> {}
class ValidationError extends Data.TaggedError("ValidationError")<{}> {}

const fetchData: Effect.Effect<Data, NetworkError> = // ...
const validateData: Effect.Effect<ValidData, ValidationError> = // ...

// Composed effect automatically has union error type
const program: Effect.Effect<ValidData, NetworkError | ValidationError> =
  fetchData.pipe(
    Effect.flatMap(data => validateData)
  );
```

### Why This Matters

1. **Compile-time safety**: The compiler forces you to handle all error cases
2. **Exhaustive handling**: You can pattern match on error types
3. **Self-documenting code**: Type signatures tell the full story
4. **Refactoring confidence**: Change an error type and the compiler shows all affected code

---

## Error Types in Effect

### Tagged Errors with Data.TaggedError

The recommended way to define errors in Effect is using `Data.TaggedError`:

```typescript
import { Data } from "effect";

// Define custom errors with unique tags
class NetworkError extends Data.TaggedError("NetworkError")<{
  url: string;
  statusCode: number;
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string;
  message: string;
}> {}

class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
  path: string;
}> {}
```

**Key benefits of TaggedError:**

- Automatically adds a `_tag` discriminant field
- Includes `cause` and `stack` properties
- Can be used both as a value (`new NetworkError(...)`) and a type
- Enables precise error matching with `catchTag`

### Error Hierarchies and Unions

Effect tracks error unions automatically, enabling hierarchical error handling:

```typescript
// Domain-specific errors
class AuthError extends Data.TaggedError("AuthError")<{
  reason: "invalid_token" | "expired" | "forbidden";
}> {}

class ApiError extends Data.TaggedError("ApiError")<{
  endpoint: string;
  statusCode: number;
}> {}

// Application-level error union
type AppError = AuthError | ApiError | ValidationError;

// Effect tracks these automatically
const fetchUser = (id: string): Effect.Effect<User, AuthError | ApiError> =>
  // ...

const validateUser = (user: User): Effect.Effect<ValidUser, ValidationError> =>
  // ...

// Composed: Effect<ValidUser, AuthError | ApiError | ValidationError>
const program = fetchUser("123").pipe(
  Effect.flatMap(validateUser)
);
```

### The Three Types of Failures

Effect distinguishes between three fundamentally different failure modes:

#### 1. Expected Errors (Fail)

Errors that are part of your domain logic and should be handled:

```typescript
import { Effect, Data } from "effect";

class InsufficientFundsError extends Data.TaggedError("InsufficientFunds")<{
  balance: number;
  required: number;
}> {}

const withdraw = (
  amount: number,
): Effect.Effect<number, InsufficientFundsError> =>
  getBalance().pipe(
    Effect.flatMap((balance) =>
      balance < amount
        ? Effect.fail(new InsufficientFundsError({ balance, required: amount }))
        : Effect.succeed(balance - amount),
    ),
  );
```

- Tracked in the `E` type parameter
- Should be handled with `catchTag`, `catchAll`, etc.
- Represent recoverable business logic failures

#### 2. Defects (Die)

Unexpected errors that indicate bugs or unrecoverable situations:

```typescript
import { Effect } from "effect";

// Create a defect - unrecoverable error
const divide = (a: number, b: number): Effect.Effect<number> =>
  b === 0
    ? Effect.die(new Error("Division by zero - this should never happen"))
    : Effect.succeed(a / b);

// Defects don't appear in the error type parameter!
// The effect type is Effect<number, never>
```

- NOT tracked in the `E` type parameter (type is `never`)
- Indicate programming errors or impossible states
- Should NOT be recovered from in normal operation
- Can be caught with `catchAllDefect` for edge cases (e.g., plugin systems)

#### 3. Interruptions (Interrupt)

Represent fiber cancellation:

```typescript
import { Effect, Fiber } from "effect";

// A long-running operation
const longTask = Effect.delay(Effect.succeed("done"), 10000);

// Interruption occurs when the result is no longer needed
const program = Effect.gen(function* () {
  const fiber = yield* Effect.fork(longTask);
  yield* Effect.sleep(100);
  yield* Fiber.interrupt(fiber); // Interrupt the fiber
});
```

- Occur when an Effect is cancelled
- Used for resource cleanup and timeout handling
- Can be handled with `Effect.onInterrupt`

### The Cause Type: Lossless Error Information

Effect uses `Cause<E>` to preserve complete failure information:

```typescript
import { Effect, Cause } from "effect";

const program = Effect.gen(function* () {
  const cause = yield* Effect.cause(
    Effect.all([
      Effect.fail("error 1"),
      Effect.die("defect"),
      Effect.fail("error 2"),
    ]),
  );

  // Extract just failures
  console.log(Cause.failures(cause));
  // { _id: 'Chunk', values: [ 'error 1', 'error 2' ] }

  // Extract just defects
  console.log(Cause.defects(cause));
  // { _id: 'Chunk', values: [ 'defect' ] }
});
```

Cause types include:

- `Cause.fail(E)` - Expected error
- `Cause.die(unknown)` - Defect/unexpected error
- `Cause.interrupt(FiberId)` - Fiber interruption
- `Cause.sequential(cause1, cause2)` - Sequential failure composition
- `Cause.parallel(cause1, cause2)` - Parallel failure composition

---

## Error Handling Patterns

### Pattern 1: catchTag - Handle Specific Tagged Errors

Use `catchTag` to handle one specific error type:

```typescript
import { Effect, Data } from "effect"

class NetworkError extends Data.TaggedError("NetworkError")<{
  message: string;
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string;
}> {}

const program: Effect.Effect<string, NetworkError | ValidationError> = // ...

// Handle only NetworkError, ValidationError still propagates
const handled = program.pipe(
  Effect.catchTag("NetworkError", (error) =>
    Effect.succeed(`Network failed: ${error.message}`)
  )
);
// Type: Effect<string, ValidationError>
```

### Pattern 2: catchTags - Exhaustive Pattern Matching

Handle all tagged errors in a single block:

```typescript
const fullyHandled = program.pipe(
  Effect.catchTags({
    NetworkError: (error) => Effect.succeed(`Network failed: ${error.message}`),
    ValidationError: (error) =>
      Effect.succeed(`Validation failed on ${error.field}`),
  }),
);
// Type: Effect<string, never>
// Error channel is 'never' - all errors handled!
```

### Pattern 3: catchAll - Handle All Errors

Catch any error, regardless of type:

```typescript
const recovered = program.pipe(
  Effect.catchAll((error) => Effect.succeed("Fallback value")),
);
// Type: Effect<string, never>
```

### Pattern 4: catchSome - Conditional Error Handling

Handle errors that match a predicate:

```typescript
const partiallyHandled = program.pipe(
  Effect.catchSome((error) => {
    if (error._tag === "NetworkError" && error.statusCode === 404) {
      return Option.some(Effect.succeed("Not found, using default"));
    }
    return Option.none(); // Let other errors propagate
  }),
);
```

### Pattern 5: catchIf - Predicate-Based Handling

```typescript
const handled = program.pipe(
  Effect.catchIf(
    (error): error is NetworkError => error._tag === "NetworkError",
    (networkError) => Effect.succeed(`Handled: ${networkError.message}`),
  ),
);
```

### Pattern 6: mapError - Transform Error Types

Transform errors without handling them:

```typescript
class AppError extends Data.TaggedError("AppError")<{
  originalError: unknown;
  context: string;
}> {}

const mapped = program.pipe(
  Effect.mapError(
    (error) =>
      new AppError({
        originalError: error,
        context: "User fetch operation",
      }),
  ),
);
// Type: Effect<string, AppError>
```

### Pattern 7: orElse - Provide Fallback Effects

```typescript
const primary: Effect.Effect<User, NetworkError> = fetchUser("123");
const fallback: Effect.Effect<User, CacheError> = getCachedUser("123");

const withFallback = primary.pipe(Effect.orElse(() => fallback));
// Type: Effect<User, CacheError>
// Primary's error is replaced if it fails
```

### Pattern 8: orElseFail - Replace with Different Error

```typescript
class UserNotAvailableError extends Data.TaggedError("UserNotAvailable")<{}> {}

const standardized = program.pipe(
  Effect.orElseFail(() => new UserNotAvailableError()),
);
// All original errors become UserNotAvailableError
```

### Pattern 9: orElseSucceed - Provide Default Value

```typescript
const withDefault = fetchUser("123").pipe(
  Effect.orElseSucceed(() => ({ name: "Anonymous", id: "0" })),
);
// Type: Effect<User, never>
// Error channel becomes 'never' - always succeeds
```

### Pattern 10: retry - Automatic Retries

```typescript
import { Effect, Schedule } from "effect"

const task: Effect.Effect<string, NetworkError> = // ...

// Retry up to 3 times
const retried = task.pipe(
  Effect.retry({ times: 3 })
);

// Retry with exponential backoff
const withBackoff = task.pipe(
  Effect.retry(Schedule.exponential("100 millis"))
);

// Retry only for specific errors
const selectiveRetry = task.pipe(
  Effect.retry({
    times: 3,
    while: (error) => error._tag === "NetworkError"
  })
);
```

### Pattern 11: retryOrElse - Retry with Fallback

```typescript
const robustFetch = task.pipe(
  Effect.retryOrElse({ times: 3 }, (error, retryCount) =>
    Effect.succeed(`Failed after ${retryCount} retries: ${error.message}`),
  ),
);
```

### Pattern 12: matchCause - Handle All Failure Types

Distinguish between failures, defects, and interruptions:

```typescript
const program = Effect.matchCause(task, {
  onFailure: (cause) => {
    switch (cause._tag) {
      case "Fail":
        return `Expected error: ${cause.error.message}`;
      case "Die":
        return `Defect: ${cause.defect}`;
      case "Interrupt":
        return `Interrupted by fiber: ${cause.fiberId}`;
      default:
        return "Other failure";
    }
  },
  onSuccess: (value) => `Success: ${value}`,
});
```

---

## Best Practices for CLI Applications

### 1. Define Domain-Specific Error Types

Create clear, tagged errors for your CLI's domain:

```typescript
import { Data } from "effect";

// Input/parsing errors
class InvalidArgumentError extends Data.TaggedError("InvalidArgument")<{
  argument: string;
  expected: string;
  received: string;
}> {}

class MissingRequiredOptionError extends Data.TaggedError(
  "MissingRequiredOption",
)<{
  option: string;
}> {}

// File system errors
class FileNotFoundError extends Data.TaggedError("FileNotFound")<{
  path: string;
}> {}

class PermissionDeniedError extends Data.TaggedError("PermissionDenied")<{
  path: string;
  operation: "read" | "write" | "execute";
}> {}

// Business logic errors
class ConfigurationError extends Data.TaggedError("ConfigurationError")<{
  field: string;
  message: string;
}> {}
```

### 2. Structured Error Data for Programmatic Handling

Include machine-readable data in errors:

```typescript
class ProcessingError extends Data.TaggedError("ProcessingError")<{
  // Human-readable
  message: string;

  // Machine-readable for programmatic handling
  code: "PARSE_FAILED" | "VALIDATION_FAILED" | "TRANSFORM_FAILED";
  file?: string;
  line?: number;
  column?: number;

  // For debugging
  cause?: unknown;
}> {}
```

### 3. Exit Codes Based on Error Type

Map errors to appropriate exit codes:

```typescript
import { Effect, Exit, Cause } from "effect";

const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGUMENT: 2,
  FILE_NOT_FOUND: 3,
  PERMISSION_DENIED: 4,
  CONFIGURATION_ERROR: 5,
  NETWORK_ERROR: 6,
  INTERNAL_ERROR: 127,
} as const;

const getExitCode = (cause: Cause.Cause<AppError>): number => {
  if (Cause.isFailType(cause)) {
    const error = cause.error;
    switch (error._tag) {
      case "InvalidArgument":
      case "MissingRequiredOption":
        return EXIT_CODES.INVALID_ARGUMENT;
      case "FileNotFound":
        return EXIT_CODES.FILE_NOT_FOUND;
      case "PermissionDenied":
        return EXIT_CODES.PERMISSION_DENIED;
      case "ConfigurationError":
        return EXIT_CODES.CONFIGURATION_ERROR;
      case "NetworkError":
        return EXIT_CODES.NETWORK_ERROR;
      default:
        return EXIT_CODES.GENERAL_ERROR;
    }
  }
  // Defects get internal error code
  return EXIT_CODES.INTERNAL_ERROR;
};
```

### 4. User-Friendly Error Formatting

Format errors for human consumption at the application boundary:

```typescript
import { Effect, Console } from "effect";

// Centralized error formatter
const formatErrorForUser = (error: AppError): string => {
  switch (error._tag) {
    case "FileNotFound":
      return `Error: File not found: ${error.path}\n\nPlease check the path and try again.`;

    case "InvalidArgument":
      return (
        `Error: Invalid value for '${error.argument}'\n` +
        `  Expected: ${error.expected}\n` +
        `  Received: ${error.received}`
      );

    case "ConfigurationError":
      return `Configuration error in '${error.field}': ${error.message}`;

    case "PermissionDenied":
      return `Permission denied: Cannot ${error.operation} '${error.path}'`;

    default:
      return `Error: ${error.message}`;
  }
};

// Apply formatting at the top level
const runCLI = (program: Effect.Effect<void, AppError>) =>
  program.pipe(
    Effect.catchAll((error) =>
      Console.error(formatErrorForUser(error)).pipe(
        Effect.flatMap(() => Effect.fail(error)), // Re-fail for exit code
      ),
    ),
  );
```

### 5. Separate Error Presentation from Error Classes

Keep error classes clean - format at the boundary:

```typescript
// Good: Error class is pure data
class ParseError extends Data.TaggedError("ParseError")<{
  file: string;
  line: number;
  column: number;
  message: string;
}> {}

// Format separately at the CLI boundary
const formatParseError = (error: ParseError): string =>
  `Parse error in ${error.file}:${error.line}:${error.column}\n` +
  `  ${error.message}`;
```

### 6. Preserve Error Context Through Transformations

When transforming errors, preserve the original cause:

```typescript
class HighLevelError extends Data.TaggedError("HighLevelError")<{
  operation: string;
  cause: unknown;
}> {}

const operation = lowLevelEffect.pipe(
  Effect.mapError(
    (error) =>
      new HighLevelError({
        operation: "user fetch",
        cause: error, // Preserve original error
      }),
  ),
);
```

### 7. Use Effect's Built-in Terminal Service

For CLI output, prefer Effect's Terminal service:

```typescript
import { Effect, Terminal } from "@effect/platform";

const displayError = (error: AppError) =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;
    yield* terminal.display(formatErrorForUser(error));
  });
```

---

## Anti-patterns to Avoid

### Anti-pattern 1: console.error Inside Error Classes

**Bad:**

```typescript
// DON'T: Side effects in error constructors
class BadError extends Data.TaggedError("BadError")<{
  message: string;
}> {
  constructor(props: { message: string }) {
    super(props);
    console.error(`Error: ${props.message}`); // Side effect!
  }
}
```

**Why it's bad:**

- Mixes presentation with data
- Cannot control when/how errors are displayed
- Breaks referential transparency
- Makes testing difficult
- Cannot format differently for different contexts (CLI vs JSON API)

**Good:**

```typescript
// DO: Keep errors as pure data
class GoodError extends Data.TaggedError("GoodError")<{
  message: string;
}> {}

// Format at the application boundary
const program = myEffect.pipe(
  Effect.catchAll((error) => Console.error(formatError(error))),
);
```

### Anti-pattern 2: Converting Typed Errors to Generic Error Too Early

**Bad:**

```typescript
// DON'T: Lose type information early
const fetchUser = (id: string) =>
  Effect.tryPromise({
    try: () => api.getUser(id),
    catch: (e) => new Error(String(e)), // Lost all context!
  });
```

**Good:**

```typescript
// DO: Preserve specific error types
const fetchUser = (id: string) =>
  Effect.tryPromise({
    try: () => api.getUser(id),
    catch: (e) => {
      if (e instanceof Response && e.status === 404) {
        return new UserNotFoundError({ userId: id });
      }
      if (e instanceof Response && e.status === 401) {
        return new UnauthorizedError({ resource: `user/${id}` });
      }
      return new NetworkError({
        message: String(e),
        endpoint: `/users/${id}`,
      });
    },
  });
```

### Anti-pattern 3: Mixing Thrown Exceptions with Effect Errors

**Bad:**

```typescript
// DON'T: Throw inside Effect
const process = Effect.sync(() => {
  if (invalidCondition) {
    throw new Error("Invalid!"); // Becomes a defect, not tracked!
  }
  return result;
});
```

**Good:**

```typescript
// DO: Use Effect.fail for expected errors
const process = Effect.gen(function* () {
  if (invalidCondition) {
    return yield* Effect.fail(new ValidationError({ reason: "invalid" }));
  }
  return result;
});
```

### Anti-pattern 4: Swallowing Errors

**Bad:**

```typescript
// DON'T: Silently ignore errors
const risky = effect.pipe(
  Effect.catchAll(() => Effect.succeed(undefined)), // Error vanished!
);
```

**Good:**

```typescript
// DO: Log or preserve error information
const risky = effect.pipe(
  Effect.catchAll((error) =>
    Effect.logWarning(`Operation failed: ${error._tag}`).pipe(
      Effect.map(() => defaultValue),
    ),
  ),
);
```

### Anti-pattern 5: Losing Error Context in Transformations

**Bad:**

```typescript
// DON'T: Throw away the original error
const mapped = effect.pipe(
  Effect.mapError(() => new GenericError({ message: "Something failed" })),
);
```

**Good:**

```typescript
// DO: Preserve the cause chain
const mapped = effect.pipe(
  Effect.mapError(
    (original) =>
      new HighLevelError({
        message: "Operation failed",
        cause: original, // Keep the original
      }),
  ),
);
```

### Anti-pattern 6: Not Using Tagged Errors

**Bad:**

```typescript
// DON'T: Plain objects without tags
const fail = Effect.fail({ message: "error", code: 123 });
// Cannot use catchTag, hard to distinguish error types
```

**Good:**

```typescript
// DO: Use TaggedError for all domain errors
class ApiError extends Data.TaggedError("ApiError")<{
  message: string;
  code: number;
}> {}

const fail = Effect.fail(new ApiError({ message: "error", code: 123 }));
// Now catchTag works, types are clear
```

### Anti-pattern 7: Over-catching with catchAll

**Bad:**

```typescript
// DON'T: Catch everything at low levels
const fetchData = fetchFromApi().pipe(
  Effect.catchAll(() => Effect.succeed(defaultData)), // Hides ALL errors
);
```

**Good:**

```typescript
// DO: Handle specific errors, let others propagate
const fetchData = fetchFromApi().pipe(
  Effect.catchTag(
    "NetworkError",
    (e) =>
      e.statusCode === 404 ? Effect.succeed(defaultData) : Effect.fail(e), // Re-fail for other network errors
  ),
  // Other errors propagate up
);
```

### Anti-pattern 8: Using Defects for Expected Errors

**Bad:**

```typescript
// DON'T: Use die for business logic errors
const validateAge = (age: number) =>
  age < 0
    ? Effect.die(new Error("Age cannot be negative")) // Wrong!
    : Effect.succeed(age);
```

**Good:**

```typescript
// DO: Use fail for expected/recoverable errors
class InvalidAgeError extends Data.TaggedError("InvalidAge")<{
  age: number;
}> {}

const validateAge = (age: number) =>
  age < 0
    ? Effect.fail(new InvalidAgeError({ age })) // Correct!
    : Effect.succeed(age);
```

---

## Sources

### Official Documentation

- [Effect Documentation - Why Effect?](https://effect.website/docs/getting-started/why-effect/)
- [Effect Documentation - The Effect Type](https://effect.website/docs/getting-started/the-effect-type/)
- [Effect Documentation - Expected Errors](https://effect.website/docs/error-management/expected-errors/)
- [Effect Documentation - Unexpected Errors](https://effect.website/docs/error-management/unexpected-errors/)
- [Effect Documentation - Yieldable Errors](https://effect.website/docs/error-management/yieldable-errors/)
- [Effect Documentation - Error Channel Operations](https://effect.website/docs/error-management/error-channel-operations/)
- [Effect Documentation - Fallback](https://effect.website/docs/error-management/fallback/)
- [Effect Documentation - Retrying](https://effect.website/docs/error-management/retrying/)
- [Effect Documentation - Cause](https://effect.website/docs/data-types/cause/)
- [Effect Documentation - Data](https://effect.website/docs/data-types/data/)
- [Effect Documentation - Terminal](https://effect.website/docs/platform/terminal/)
- [Effect Documentation - Error Formatters](https://effect.website/docs/schema/error-formatters/)

### Community Resources

- [TypeOnce - Define Errors with TaggedError](https://www.typeonce.dev/course/effect-beginners-complete-getting-started/type-safe-error-handling-with-effect/define-errors-with-taggederror)
- [Intro to Effect Part 2: Handling Errors](https://ybogomolov.me/02-effect-handling-errors)
- [How to Effect TS? - Best Practices](https://dtech.vision/blog/how-to-effect-ts-best-practices/)
- [Effect Patterns Repository](https://github.com/PaulJPhilp/EffectPatterns)
- [Exploring Effect in TypeScript - Tweag](https://www.tweag.io/blog/2024-11-07-typescript-effect/)
- [TypeScript Errors and Effect](https://davidmyno.rs/blog/typed-errors-and-effect/)
- [DeepWiki - Error Handling with Cause](https://deepwiki.com/Effect-TS/effect/2.5-error-handling-with-cause-either-and-option)

### CLI Framework

- [@effect/cli npm package](https://www.npmjs.com/package/@effect/cli)
- [DeepWiki - CLI Framework](https://deepwiki.com/Effect-TS/effect/8.1-cli-framework)
- [Effect CLI README](https://github.com/Effect-TS/effect/blob/main/packages/cli/README.md)

---

_Document created: 2026-01-22_
_Research scope: Effect's errors-as-values pattern for type-safe error handling_
