# Embeddings Module Error Handling Analysis

> Analysis of the embeddings module against Effect error handling best practices

## Files Analyzed

- `/src/embeddings/openai-provider.ts`
- `/src/embeddings/semantic-search.ts`
- `/src/embeddings/types.ts`
- `/src/embeddings/vector-store.ts`

---

## 1. Current Error Handling Issues Found

### Issue 1.1: Non-Effect Error Classes in openai-provider.ts

**Location**: `openai-provider.ts:24-36`

```typescript
export class MissingApiKeyError extends Error {
  constructor() {
    super('OPENAI_API_KEY not set')
    this.name = 'MissingApiKeyError'
  }
}

export class InvalidApiKeyError extends Error {
  constructor(message?: string) {
    super(message ?? 'Invalid OPENAI_API_KEY')
    this.name = 'InvalidApiKeyError'
  }
}
```

**Problem**: These error classes extend `Error` instead of using `Data.TaggedError`. They lack the `_tag` discriminant field required for `catchTag`/`catchTags` pattern matching.

**Priority**: HIGH

---

### Issue 1.2: Constructor Throws Exception Instead of Effect.fail

**Location**: `openai-provider.ts:56-60`

```typescript
constructor(options: OpenAIProviderOptions = {}) {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new MissingApiKeyError()  // Throws exception!
  }
  // ...
}
```

**Problem**: The constructor throws a synchronous exception instead of returning an Effect that can fail. This bypasses Effect's error tracking entirely and becomes a "defect" when wrapped in Effect operations.

**Priority**: HIGH

---

### Issue 1.3: Unused EmbedError Type in types.ts

**Location**: `types.ts:68-82`

```typescript
export interface EmbedError {
  readonly _tag: 'EmbedError'
  readonly cause: 'RateLimit' | 'ApiKey' | 'Network' | 'Unknown'
  readonly message: string
}

export const embedError = (
  cause: EmbedError['cause'],
  message: string,
): EmbedError => ({
  _tag: 'EmbedError',
  cause,
  message,
})
```

**Problem**: A well-designed `EmbedError` type exists but is never used anywhere in the module. The actual error handling uses plain `Error` classes instead.

**Priority**: MEDIUM

---

### Issue 1.4: Generic Error Type in Effect Return Types

**Location**: `semantic-search.ts:73`, `semantic-search.ts:184`, etc.

```typescript
export const estimateEmbeddingCost = (
  rootPath: string,
  options: { excludePatterns?: readonly string[] | undefined } = {},
): Effect.Effect<EmbeddingEstimate, Error> =>  // Generic Error type
```

**Problem**: All functions return `Effect.Effect<A, Error>` instead of specific tagged error types. This loses type safety and makes exhaustive error handling impossible at the call site.

**Priority**: HIGH

---

### Issue 1.5: Silent Error Swallowing with Empty catch Blocks

**Location**: `semantic-search.ts:329-332`

```typescript
try {
  fileContent = yield* Effect.promise(() =>
    fs.readFile(filePath, 'utf-8'),
  )
} catch {
  // Skip files that can't be read
  continue
}
```

**Location**: `semantic-search.ts:532-534`

```typescript
} catch {
  resultsWithContent.push(result)
}
```

**Problem**: Errors are silently swallowed without logging or tracking. Users have no visibility into which files failed or why.

**Priority**: MEDIUM

---

### Issue 1.6: Inconsistent Error Transformation

**Location**: `semantic-search.ts:366-375`

```typescript
const result = yield* Effect.tryPromise({
  try: () => provider.embed(texts),
  catch: (e) => {
    // Preserve InvalidApiKeyError so handleApiKeyError can catch it
    if (e instanceof InvalidApiKeyError) return e
    return new Error(
      `Embedding failed: ${e instanceof Error ? e.message : String(e)}`,
    )
  },
})
```

**Problem**: Conditional error preservation logic is fragile. Some errors are preserved (`InvalidApiKeyError`), others are converted to generic `Error`, losing type information.

**Priority**: MEDIUM

---

### Issue 1.7: Error Messages Embedded in Code

**Location**: `semantic-search.ts:82-84`, `semantic-search.ts:195-196`, etc.

```typescript
return yield* Effect.fail(
  new Error("Index not found. Run 'mdcontext index' first."),
)
```

**Problem**: User-facing error messages are scattered throughout the codebase rather than being formatted at the application boundary. This violates the Effect best practice of keeping error classes as pure data.

**Priority**: LOW

---

### Issue 1.8: handleApiKeyError Converts to Generic Error

**Location**: `openai-provider.ts:130-165`

```typescript
export const handleApiKeyError = <A, E>(
  effect: Effect.Effect<A, E | MissingApiKeyError | InvalidApiKeyError>,
): Effect.Effect<A, E | Error> =>  // Returns generic Error
  effect.pipe(
    Effect.catchIf(
      (e): e is MissingApiKeyError => e instanceof MissingApiKeyError,
      () =>
        Effect.gen(function* () {
          yield* Console.error('')
          yield* Console.error('Error: OPENAI_API_KEY not set')
          // ...
          return yield* Effect.fail(new Error('Missing API key'))  // Loses type
        }),
    ),
    // ...
  )
```

**Problem**: After displaying the error message, it re-fails with a generic `Error` type, losing the original typed error. Also mixes presentation (Console.error) with error handling logic.

**Priority**: MEDIUM

---

### Issue 1.9: Effect.sync Used Where Effect.try Should Be

**Location**: `vector-store.ts:99-121`, `vector-store.ts:123-169`

```typescript
add(entries: VectorEntry[]): Effect.Effect<void, Error> {
  return Effect.sync(() => {  // Effect.sync doesn't catch errors!
    const index = this.ensureIndex()
    for (const entry of entries) {
      // ... operations that could throw
      index.addPoint(entry.embedding as number[], idx)
    }
  })
}
```

**Problem**: `Effect.sync` is used for operations that could throw (like `addPoint`). If an exception occurs, it becomes an untracked defect instead of a typed error.

**Priority**: HIGH

---

### Issue 1.10: JSON.parse Without Error Handling

**Location**: `vector-store.ts:234`

```typescript
const meta = JSON.parse(metaContent) as VectorIndex
```

**Problem**: `JSON.parse` can throw but is not wrapped in error handling. If the metadata file is corrupted, this throws an untracked exception.

**Priority**: MEDIUM

---

## 2. Specific Violations of Effect Best Practices

### Violation 2.1: Not Using Data.TaggedError

**Best Practice**: "The recommended way to define errors in Effect is using `Data.TaggedError`"

**Current Code**:
```typescript
export class MissingApiKeyError extends Error {
  constructor() {
    super('OPENAI_API_KEY not set')
    this.name = 'MissingApiKeyError'
  }
}
```

**Violation**: Plain `Error` extension lacks `_tag` discriminant, preventing `catchTag` usage.

---

### Violation 2.2: Throwing in Constructors

**Best Practice**: "Effect treats errors as first-class values tracked in the type system"

**Current Code**:
```typescript
constructor(options: OpenAIProviderOptions = {}) {
  if (!apiKey) {
    throw new MissingApiKeyError()
  }
}
```

**Violation**: Synchronous throws bypass Effect's error tracking. Should use factory function returning `Effect.Effect<OpenAIProvider, MissingApiKeyError>`.

---

### Violation 2.3: Mixing Presentation with Error Handling

**Best Practice**: "Keep error classes clean - format at the boundary"

**Current Code**:
```typescript
Effect.catchIf(
  (e): e is MissingApiKeyError => e instanceof MissingApiKeyError,
  () =>
    Effect.gen(function* () {
      yield* Console.error('Error: OPENAI_API_KEY not set')
      // ... presentation logic in error handler
    }),
)
```

**Violation**: Error handler contains `Console.error` calls. Error formatting should happen at the CLI boundary, not in domain code.

---

### Violation 2.4: Swallowing Errors Without Logging

**Best Practice**: "DO: Log or preserve error information"

**Current Code**:
```typescript
} catch {
  // Skip files that can't be read
  continue
}
```

**Violation**: Errors are silently ignored. Should at minimum use `Effect.logWarning` to track failures.

---

### Violation 2.5: Losing Error Context in Transformations

**Best Practice**: "When transforming errors, preserve the original cause"

**Current Code**:
```typescript
return new Error(
  `Embedding failed: ${e instanceof Error ? e.message : String(e)}`,
)
```

**Violation**: Original error object is converted to string, losing stack trace and error type. Should preserve as `cause` property.

---

### Violation 2.6: Converting Typed Errors to Generic Error

**Best Practice**: "DO: Preserve specific error types"

**Current Code**:
```typescript
): Effect.Effect<A, E | Error> =>  // Returns generic Error
  // ...
  return yield* Effect.fail(new Error('Missing API key'))
```

**Violation**: Specific `MissingApiKeyError` is transformed to generic `Error`, losing discriminated union benefits.

---

### Violation 2.7: Using Defects for Expected Errors (Implicit)

**Best Practice**: "Use fail for expected/recoverable errors, die for bugs/invariant violations"

**Current Code**:
```typescript
return Effect.sync(() => {
  index.addPoint(entry.embedding as number[], idx)  // Can throw
})
```

**Violation**: `Effect.sync` converts thrown errors to defects. These are expected operational errors that should be recoverable.

---

### Violation 2.8: Defined Error Type Not Used

**Best Practice**: "Define domain-specific error types... Create clear, tagged errors for your CLI's domain"

**Current Code**: `EmbedError` interface exists but is never used.

**Violation**: Well-designed error type is ignored in favor of generic `Error` and plain classes.

---

## 3. Recommended Changes with Code Examples

### Recommendation 3.1: Convert Error Classes to Data.TaggedError

**Priority**: HIGH

```typescript
// src/embeddings/errors.ts
import { Data } from 'effect'

export class MissingApiKeyError extends Data.TaggedError('MissingApiKeyError')<{
  readonly provider: string
}> {}

export class InvalidApiKeyError extends Data.TaggedError('InvalidApiKeyError')<{
  readonly provider: string
  readonly details: string
}> {}

export class EmbeddingError extends Data.TaggedError('EmbeddingError')<{
  readonly cause: 'RateLimit' | 'Network' | 'Unknown'
  readonly message: string
  readonly originalError?: unknown
}> {}

export class IndexNotFoundError extends Data.TaggedError('IndexNotFoundError')<{
  readonly path: string
  readonly indexType: 'document' | 'section' | 'vector'
}> {}

export class VectorStoreError extends Data.TaggedError('VectorStoreError')<{
  readonly operation: 'add' | 'search' | 'save' | 'load'
  readonly message: string
  readonly cause?: unknown
}> {}

export class FileReadError extends Data.TaggedError('FileReadError')<{
  readonly path: string
  readonly cause: string
}> {}
```

---

### Recommendation 3.2: Factory Function Instead of Throwing Constructor

**Priority**: HIGH

```typescript
// src/embeddings/openai-provider.ts
import { Effect } from 'effect'
import { MissingApiKeyError, InvalidApiKeyError } from './errors.js'

export const createOpenAIProvider = (
  options: OpenAIProviderOptions = {},
): Effect.Effect<OpenAIProvider, MissingApiKeyError> =>
  Effect.gen(function* () {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY

    if (!apiKey) {
      return yield* Effect.fail(
        new MissingApiKeyError({ provider: 'openai' })
      )
    }

    return new OpenAIProvider(apiKey, options)
  })

// Private constructor - only accessible via factory
class OpenAIProvider implements EmbeddingProvider {
  private constructor(
    private readonly apiKey: string,
    options: OpenAIProviderOptions,
  ) {
    this.client = new OpenAI({ apiKey })
    this.model = options.model ?? 'text-embedding-3-small'
    // ...
  }
}
```

---

### Recommendation 3.3: Typed Error Returns with Proper Transformation

**Priority**: HIGH

```typescript
// src/embeddings/semantic-search.ts
import {
  IndexNotFoundError,
  MissingApiKeyError,
  EmbeddingError,
  FileReadError
} from './errors.js'

type BuildEmbeddingsError =
  | IndexNotFoundError
  | MissingApiKeyError
  | InvalidApiKeyError
  | EmbeddingError

export const buildEmbeddings = (
  rootPath: string,
  options: BuildEmbeddingsOptions = {},
): Effect.Effect<BuildEmbeddingsResult, BuildEmbeddingsError> =>
  Effect.gen(function* () {
    // ...
    if (!docIndex || !sectionIndex) {
      return yield* Effect.fail(
        new IndexNotFoundError({
          path: resolvedRoot,
          indexType: 'document'
        })
      )
    }

    // Provider creation now returns Effect
    const provider = options.provider ?? (yield* createOpenAIProvider())

    // ...
  })
```

---

### Recommendation 3.4: Replace Silent Catches with Logged Failures

**Priority**: MEDIUM

```typescript
// Instead of silent catch:
for (let fileIndex = 0; fileIndex < docPaths.length; fileIndex++) {
  const docPath = docPaths[fileIndex]!
  const filePath = path.join(resolvedRoot, docPath)

  const fileContentResult = yield* Effect.tryPromise({
    try: () => fs.readFile(filePath, 'utf-8'),
    catch: (e) => new FileReadError({
      path: filePath,
      cause: e instanceof Error ? e.message : String(e)
    })
  }).pipe(
    Effect.catchTag('FileReadError', (error) =>
      Effect.gen(function* () {
        yield* Effect.logWarning(`Skipping unreadable file: ${error.path}`)
        return null  // Return null to indicate skip
      })
    )
  )

  if (fileContentResult === null) continue

  // Process file content...
}
```

---

### Recommendation 3.5: Move Error Formatting to CLI Boundary

**Priority**: MEDIUM

```typescript
// src/embeddings/openai-provider.ts - Keep it simple
export const handleApiKeyError = <A, E>(
  effect: Effect.Effect<A, E | MissingApiKeyError | InvalidApiKeyError>,
): Effect.Effect<A, E | MissingApiKeyError | InvalidApiKeyError> =>
  effect  // Just pass through - let CLI layer format

// src/cli/error-formatter.ts - Centralize formatting
export const formatEmbeddingError = (error: EmbeddingModuleError): string => {
  switch (error._tag) {
    case 'MissingApiKeyError':
      return [
        '',
        'Error: OPENAI_API_KEY not set',
        '',
        'To use semantic search, set your OpenAI API key:',
        '  export OPENAI_API_KEY=sk-...',
        '',
        'Or add to .env file in project root.',
      ].join('\n')

    case 'InvalidApiKeyError':
      return [
        '',
        'Error: Invalid OPENAI_API_KEY',
        '',
        'The provided API key was rejected by OpenAI.',
        `Details: ${error.details}`,
      ].join('\n')

    case 'IndexNotFoundError':
      return `Error: ${error.indexType} index not found. Run 'mdcontext index' first.`

    // ... other cases
  }
}
```

---

### Recommendation 3.6: Use Effect.try for Fallible Operations

**Priority**: HIGH

```typescript
// src/embeddings/vector-store.ts
add(entries: VectorEntry[]): Effect.Effect<void, VectorStoreError> {
  return Effect.try({
    try: () => {
      const index = this.ensureIndex()
      for (const entry of entries) {
        if (this.idToIndex.has(entry.id)) continue

        const idx = this.nextIndex++
        if (idx >= index.getMaxElements()) {
          index.resizeIndex(index.getMaxElements() * 2)
        }

        index.addPoint(entry.embedding as number[], idx)
        this.entries.set(idx, entry)
        this.idToIndex.set(entry.id, idx)
      }
    },
    catch: (e) => new VectorStoreError({
      operation: 'add',
      message: e instanceof Error ? e.message : String(e),
      cause: e,
    })
  })
}
```

---

### Recommendation 3.7: Wrap JSON.parse with Error Handling

**Priority**: MEDIUM

```typescript
// src/embeddings/vector-store.ts
load(): Effect.Effect<boolean, VectorStoreError> {
  return Effect.gen(function* (this: HnswVectorStore) {
    // ...
    const metaContent = yield* Effect.promise(() =>
      fs.readFile(metaPath, 'utf-8'),
    )

    const meta = yield* Effect.try({
      try: () => JSON.parse(metaContent) as VectorIndex,
      catch: (e) => new VectorStoreError({
        operation: 'load',
        message: 'Failed to parse vector metadata',
        cause: e,
      })
    })

    // ...
  }.bind(this))
}
```

---

### Recommendation 3.8: Update Types to Use Tagged Errors

**Priority**: MEDIUM

Replace `types.ts` `EmbedError` with proper `Data.TaggedError` or remove it in favor of the errors defined in `errors.ts`:

```typescript
// src/embeddings/types.ts
// Remove the EmbedError interface and embedError factory
// Import from errors.ts instead:
export type {
  MissingApiKeyError,
  InvalidApiKeyError,
  EmbeddingError,
  // ...
} from './errors.js'
```

---

## 4. Priority Summary

### HIGH Priority (Address First)
| Issue | Description | Impact |
|-------|-------------|--------|
| 1.1 | Non-Effect error classes | Cannot use `catchTag`, breaks type safety |
| 1.2 | Constructor throws exception | Errors become defects, untracked |
| 1.4 | Generic `Error` return types | No exhaustive error handling |
| 1.9 | `Effect.sync` for fallible ops | Exceptions become untracked defects |

### MEDIUM Priority
| Issue | Description | Impact |
|-------|-------------|--------|
| 1.3 | Unused `EmbedError` type | Code inconsistency |
| 1.5 | Silent error swallowing | Users blind to failures |
| 1.6 | Inconsistent transformation | Fragile error handling |
| 1.8 | `handleApiKeyError` loses type | Type safety degradation |
| 1.10 | Unhandled `JSON.parse` | Potential crash on corrupt data |

### LOW Priority
| Issue | Description | Impact |
|-------|-------------|--------|
| 1.7 | Messages in code | Harder to maintain/localize |

---

## 5. Migration Strategy

### Phase 1: Create Error Types
1. Create `/src/embeddings/errors.ts` with `Data.TaggedError` classes
2. Export from module index
3. No breaking changes yet

### Phase 2: Update OpenAI Provider
1. Convert constructor to factory function
2. Update error classes to use new tagged errors
3. Remove presentation logic from `handleApiKeyError`

### Phase 3: Update Vector Store
1. Replace `Effect.sync` with `Effect.try`
2. Add error handling for `JSON.parse`
3. Use `VectorStoreError` for all operations

### Phase 4: Update Semantic Search
1. Update return types to use union of tagged errors
2. Replace silent catches with logged failures
3. Use proper error transformation with cause preservation

### Phase 5: CLI Integration
1. Create centralized error formatter
2. Update CLI commands to use `catchTags` at boundary
3. Add verbosity support for error detail levels

---

_Analysis created: 2026-01-22_
_Based on: effect-errors-as-values.md, effect-cli-error-handling.md_
