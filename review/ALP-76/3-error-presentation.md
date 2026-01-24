# ALP-76 Error Presentation & CLI Boundary Review

**Reviewer:** Claude Sonnet 4.5
**Date:** 2026-01-24
**Worktree:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-76`

---

## Executive Summary

**Overall Assessment:** ✅ **PASS with Minor Concerns**

The ALP-76 refactoring successfully establishes clear separation between error presentation and business logic. Error formatting is properly isolated at the CLI boundary, domain errors contain technical data (not user messages), and the error handler provides comprehensive user-friendly formatting. There are a few minor areas where presentation concerns leak into business logic, but these are edge cases that don't compromise the overall architecture.

### Acceptance Criteria Status

| Criterion | Status | Notes |
|-----------|--------|-------|
| Error formatting only at CLI entry points | ✅ PASS | Centralized in `error-handler.ts` |
| Clear separation between domain errors and user messages | ✅ PASS | Domain errors use technical fields, presentation in handler |
| No presentation logic in core modules | ⚠️ MOSTLY | One console.warn in parser, graceful degradation messages in commands |
| Consistent formatting and tone | ✅ PASS | Standardized message structure across all error types |
| Appropriate detail level for users | ✅ PASS | Technical details separated from actionable suggestions |

---

## 1. CLI Boundary Analysis

### 1.1 Centralized Error Handler

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-76/src/cli/error-handler.ts`

The error handler provides excellent separation of concerns:

✅ **Strengths:**
- Single `formatError()` function handles all error types using exhaustive pattern matching
- Uses `Match.exhaustive` to ensure all error types are covered at compile time
- Returns structured `FormattedError` objects with consistent shape
- Separate display functions for normal and debug modes
- Exit codes mapped to error categories (user error, system error, API error)

**Key Pattern (lines 74-287):**
```typescript
export const formatError = (error: MdContextError): FormattedError =>
  Match.value(error).pipe(
    Match.tag('FileReadError', (e) => ({
      code: e.code,
      message: `Cannot read file: ${e.path}`,
      details: e.message,
      suggestions: [
        'Check that the file exists',
        'Check file permissions',
      ] as const,
      exitCode: EXIT_CODE.SYSTEM_ERROR,
    })),
    // ... all other error types
    Match.exhaustive,
  )
```

✅ **User Message Quality:**
- Primary message is user-friendly: "Cannot read file: /path/to/file"
- Technical details preserved in `details` field: "ENOENT: no such file or directory"
- Actionable suggestions provided for each error type
- Error codes included for scripting/automation

### 1.2 Command-Level Error Handling

Commands properly propagate typed errors to the CLI boundary without formatting them:

**Example: context.ts (lines 92-106)**
```typescript
const document = yield* parseFile(filePath).pipe(
  Effect.mapError((e) =>
    e._tag === 'ParseError'
      ? new ParseError({
          message: e.message,
          path: filePath,
          ...(e.line !== undefined && { line: e.line }),
          ...(e.column !== undefined && { column: e.column }),
        })
      : new FileReadError({
          path: e.path,
          message: e.message,
        }),
  ),
)
```

✅ The command:
- Preserves technical error data (message, path, line, column)
- Does NOT format error messages for users
- Allows errors to propagate to CLI boundary for formatting

### 1.3 Main Entry Point

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-76/src/cli/main.ts`

The main CLI file handles legacy Effect CLI validation errors during the transition period:

**Lines 95-106:**
```typescript
Effect.catchAll((error) =>
  Effect.sync(() => {
    // Only show friendly error for Effect CLI validation errors
    if (isEffectCliValidationError(error)) {
      const message = formatEffectCliError(error)
      console.error(`\nError: ${message}`)
      console.error('\nRun "mdcontext --help" for usage information.')
      process.exit(1)
    }
    // Re-throw other errors to be handled normally
    throw error
  }),
)
```

✅ This is appropriate for the transition period but should be documented as temporary.

---

## 2. Domain Error Separation

### 2.1 Error Definition Convention

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-76/src/errors/index.ts`

Excellent documentation of the error message convention (lines 10-37):

```typescript
/**
 * ## Error Message Convention
 *
 * The `message` field in errors should contain **technical details** from the
 * underlying operation, NOT user-facing formatted messages.
 *
 * **Good (technical):**
 * ```typescript
 * new FileReadError({
 *   path: '/path/to/file',
 *   message: e.message,  // e.g., "ENOENT: no such file or directory"
 *   cause: e,
 * })
 * ```
 *
 * **Bad (user-facing):**
 * ```typescript
 * new FileReadError({
 *   path: '/path/to/file',
 *   message: 'Cannot read file. Please check permissions.',  // NO!
 * })
 * ```
 */
```

✅ This establishes clear expectations for error construction throughout the codebase.

### 2.2 Error Construction in Core Modules

**Indexer (indexer.ts:295-302):**
```typescript
Effect.mapError(
  (e) =>
    new ParseError({
      message: e.message,
      path: relativePath,
      ...(e.line !== undefined && { line: e.line }),
      ...(e.column !== undefined && { column: e.column }),
    }),
)
```

✅ Preserves technical error message from underlying parser.

**OpenAI Provider (openai-provider.ts:96-103):**
```typescript
if (error instanceof OpenAI.AuthenticationError) {
  throw new ApiKeyInvalidError({
    provider: 'OpenAI',
    details: error.message,  // Technical error from API
  })
}
```

✅ Uses API error message as technical details, not user presentation.

**Semantic Search (semantic-search.ts:500-507):**
```typescript
if (!queryVector) {
  return yield* Effect.fail(
    new EmbeddingError({
      reason: 'Unknown',
      message: 'Failed to generate query embedding',  // Technical description
      provider: 'OpenAI',
    }),
  )
}
```

✅ Technical description of what went wrong, not user instructions.

### 2.3 Dynamic Message Generation

Some errors generate user-friendly messages dynamically via getters:

**ApiKeyMissingError (errors/index.ts:224-227):**
```typescript
get message(): string {
  return `${this.envVar} not set`
}
```

**EmbeddingsNotFoundError (errors/index.ts:399-401):**
```typescript
get message(): string {
  return `Embeddings not found at ${this.path}. Run 'mdcontext index --embed' first.`
}
```

⚠️ **Minor Concern:** These messages include user instructions ("Run 'mdcontext index --embed' first"). While not ideal, the error handler overrides these in `formatError()`, so the impact is minimal. However, it creates duplication and potential inconsistency.

**Recommendation:** Consider removing user instructions from error class getters and keeping only technical descriptions. Let the error handler provide all user guidance.

---

## 3. User Experience Assessment

### 3.1 Error Message Quality

The error handler provides excellent user-facing messages across all error types:

**File System Errors (error-handler.ts:77-117):**
```typescript
Match.tag('FileReadError', (e) => ({
  code: e.code,
  message: `Cannot read file: ${e.path}`,
  details: e.message,
  suggestions: [
    'Check that the file exists',
    'Check file permissions',
  ],
  exitCode: EXIT_CODE.SYSTEM_ERROR,
}))
```

✅ **Strengths:**
- Clear primary message identifies the problem
- Technical details available but separate
- Actionable suggestions for remediation
- Appropriate exit code for error category

**API Errors (error-handler.ts:131-192):**
```typescript
Match.tag('ApiKeyMissingError', (e) => ({
  code: e.code,
  message: `${e.envVar} not set`,
  suggestions: [
    `export ${e.envVar}=your-api-key`,
    'Or add to .env file in project root',
  ],
  exitCode: EXIT_CODE.API_ERROR,
}))
```

✅ Provides concrete setup instructions with example commands.

**Embedding Error Nuance (error-handler.ts:153-192):**
```typescript
Match.tag('EmbeddingError', (e) =>
  Match.value(e.reason).pipe(
    Match.when('RateLimit', () => ({
      code: e.code,
      message: 'Rate limit exceeded',
      details: e.message,
      suggestions: [
        'Wait a few minutes and try again',
        'Consider using a smaller batch size',
      ],
      exitCode: EXIT_CODE.API_ERROR,
    })),
    Match.when('QuotaExceeded', () => ({
      // Different message and suggestions
    })),
    Match.when('Network', () => ({
      // Network-specific guidance
    })),
    // ...
  ),
)
```

✅ **Excellent:** Different error reasons within the same type get tailored messages and suggestions.

### 3.2 Message Consistency

All error messages follow a consistent structure:

1. **Code:** Machine-readable error code (e.g., "E100", "E300")
2. **Message:** User-friendly description of what went wrong
3. **Details:** Technical information from the underlying error (optional)
4. **Suggestions:** Actionable steps to resolve (1-3 items)
5. **Exit Code:** Appropriate exit code for scripting

**Display Format (error-handler.ts:297-316):**
```typescript
export const displayError = (formatted: FormattedError): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    yield* Console.error('')
    yield* Console.error(`Error [${formatted.code}]: ${formatted.message}`)

    if (formatted.details) {
      yield* Console.error(`  ${formatted.details}`)
    }

    if (formatted.suggestions && formatted.suggestions.length > 0) {
      yield* Console.error('')
      for (const suggestion of formatted.suggestions) {
        yield* Console.error(`  ${suggestion}`)
      }
    }

    yield* Console.error('')
  })
```

✅ Clean, consistent format across all error types.

### 3.3 Debug Mode Support

**Lines 321-340:**
```typescript
export const displayErrorDebug = (
  error: MdContextError,
  formatted: FormattedError,
): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    yield* displayError(formatted)

    yield* Console.error('--- Debug Info ---')
    yield* Console.error(`Code: ${formatted.code}`)
    yield* Console.error(`Tag: ${error._tag}`)
    yield* Console.error(`Error: ${JSON.stringify(error, null, 2)}`)

    // Show cause/stack if available
    if ('cause' in error && error.cause) {
      yield* Console.error(`Cause: ${String(error.cause)}`)
      if (error.cause instanceof Error && error.cause.stack) {
        yield* Console.error(`Stack: ${error.cause.stack}`)
      }
    }
  })
```

✅ **Excellent:** Debug mode preserves all technical details including:
- Full error object as JSON
- Error tag for type identification
- Cause chain with stack traces
- User-friendly message still shown first

---

## 4. Separation of Concerns Evaluation

### 4.1 Presentation Leaks in Core Modules

#### ⚠️ Issue #1: Parser Warning Message

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-76/src/parser/parser.ts:311-313`

```typescript
console.warn(
  `Warning: Malformed frontmatter in ${path}, skipping: ${msg.split('\n')[0]}`,
)
```

**Concern:** Direct console output in a core parsing module bypasses the error handling system.

**Impact:** Low - This is a warning for malformed YAML frontmatter that doesn't prevent parsing. The parser gracefully continues.

**Recommendation:** Consider using `Effect.logWarning()` instead of `console.warn()` to integrate with Effect's logging system.

#### ⚠️ Issue #2: Graceful Degradation Messages in Commands

**Location:** Multiple command files show this pattern for optional features.

**Example: search.ts (lines 393-411):**
```typescript
Effect.catchTags({
  ApiKeyMissingError: (e) => {
    if (!json) {
      Effect.runSync(Console.error(`\n${e.message}`))
    }
    return Effect.succeed(null)
  },
  ApiKeyInvalidError: (e) => {
    if (!json) {
      Effect.runSync(Console.error(`\n${e.message}`))
    }
    return Effect.succeed(null)
  },
  // ...
})
```

**Analysis:** This is graceful degradation for optional embedding features. The command catches errors and displays them inline rather than failing the entire operation.

**Is this presentation logic?** Debatable:
- ✅ Pro: These are informational messages for optional features, not error formatting
- ⚠️ Con: Direct console output bypasses the centralized error handler
- ✅ Pro: Allows the main operation to continue despite embedding failures
- ⚠️ Con: Creates duplicate error display logic

**Recommendation:** Consider creating a helper function like `displayInlineWarning(error)` that maintains consistent formatting while allowing graceful degradation.

#### ⚠️ Issue #3: MCP Server Fatal Error

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-76/src/mcp/server.ts:487`

```typescript
console.error('Fatal error:', error)
```

**Context:** This is in the MCP server's fatal error handler, separate from the CLI.

**Impact:** Minimal - MCP server has different presentation requirements than CLI.

✅ **Acceptable:** Different entry points (CLI vs MCP server) may have different error presentation needs.

### 4.2 Business Logic Cleanliness

Core business logic modules are clean of presentation concerns:

**Indexer (indexer.ts:389-400):**
```typescript
Effect.catchAll((error) => {
  // Extract message from typed errors or generic errors
  const message =
    'message' in error && typeof error.message === 'string'
      ? error.message
      : String(error)
  errors.push({
    path: relativePath,
    message,
  })
  return Effect.void
})
```

✅ Collects error data without formatting or displaying it.

**Semantic Search (semantic-search.ts:367-374):**
```typescript
Effect.catchAll(() =>
  Effect.succeed({ ok: false as const, content: '' }),
)
```

✅ Returns error state without logging or displaying.

**Vector Store - Not reviewed in detail but no console output detected in grep.**

---

## 5. Logging vs Presentation

### 5.1 Technical Logging

The codebase uses `Effect.logWarning()` appropriately for technical logging:

**Semantic Search (semantic-search.ts:377):**
```typescript
yield* Effect.logWarning(`Skipping file (cannot read): ${docPath}`)
```

**Search Command (search.ts:355-360):**
```typescript
Effect.runSync(
  Effect.logWarning(
    `Could not estimate embedding cost: ${e instanceof Error ? e.message : String(e)}`,
  ),
)
```

✅ **Appropriate:** These are debug/operational logs, not user-facing error messages.

### 5.2 Stack Traces

Stack traces are only shown in debug mode:

**error-handler.ts:334-339:**
```typescript
if ('cause' in error && error.cause) {
  yield* Console.error(`Cause: ${String(error.cause)}`)
  if (error.cause instanceof Error && error.cause.stack) {
    yield* Console.error(`Stack: ${error.cause.stack}`)
  }
}
```

✅ **Excellent:** Normal users see friendly messages; debug mode shows full technical details.

---

## 6. Test Coverage

The error handling is well-tested:

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-76/src/errors/errors.test.ts`

✅ **Comprehensive Tests:**
- Error construction with correct `_tag` (lines 42-88)
- Error code getters return correct values (lines 50-56)
- Error data field access (lines 59-65)
- Cause chain preservation (lines 68-76)
- `catchTag` pattern matching (lines 78-88)
- Dynamic message generation (lines 186-231)
- Multiple error handling with `catchTags` (lines 522-553)
- Error code uniqueness and format (lines 560-609)

⚠️ **Missing:** Tests for the error handler's `formatError()` and `displayError()` functions.

**Recommendation:** Add tests for `error-handler.ts` to verify:
- Correct formatting for each error type
- Exhaustive matching (all error types handled)
- Exit code mapping
- Debug mode output

---

## 7. Code References

### Well-Separated Components

| Component | Path | Lines | Assessment |
|-----------|------|-------|------------|
| Error Definitions | `src/errors/index.ts` | 1-484 | ✅ Clean domain errors |
| Error Formatter | `src/cli/error-handler.ts` | 74-287 | ✅ Centralized presentation |
| Error Display | `src/cli/error-handler.ts` | 297-340 | ✅ Consistent output |
| Error Handler Factory | `src/cli/error-handler.ts` | 376-395 | ✅ Type-safe handlers |
| Main CLI | `src/cli/main.ts` | 93-109 | ✅ Proper error routing |

### Areas Needing Attention

| Issue | Location | Lines | Severity |
|-------|----------|-------|----------|
| Parser console.warn | `src/parser/parser.ts` | 311-313 | Minor |
| Graceful degradation messages | `src/cli/commands/search.ts` | 393-411 | Minor |
| Graceful degradation messages | `src/cli/commands/index-cmd.ts` | 294-333 | Minor |
| Dynamic user messages in errors | `src/errors/index.ts` | 399-401 | Minor |
| MCP server console.error | `src/mcp/server.ts` | 487 | Acceptable |

---

## 8. Recommendations

### High Priority

1. **Add Error Handler Tests**
   - Test `formatError()` for all error types
   - Verify exhaustive matching
   - Test exit code mapping
   - Test debug mode output

### Medium Priority

2. **Remove User Instructions from Error Classes**
   - Move instructions from `EmbeddingsNotFoundError.message` getter to error handler
   - Keep error class messages purely technical
   - Eliminates duplication and potential inconsistency

3. **Replace console.warn in Parser**
   ```typescript
   // Replace:
   console.warn(`Warning: Malformed frontmatter in ${path}, skipping: ${msg.split('\n')[0]}`)

   // With:
   yield* Effect.logWarning(`Malformed frontmatter in ${path}, skipping: ${msg.split('\n')[0]}`)
   ```

4. **Create Graceful Degradation Helper**
   ```typescript
   // In cli/utils.ts:
   export const displayInlineWarning = (error: MdContextError, json: boolean): void => {
     if (json) return
     const formatted = formatError(error)
     console.error(`\nWarning: ${formatted.message}`)
     if (formatted.suggestions?.length > 0) {
       console.error(`  ${formatted.suggestions[0]}`)
     }
   }
   ```

### Low Priority

5. **Document Temporary Legacy Error Handling**
   - Add comment explaining Effect CLI validation error handling is transitional
   - Track removal in issue/backlog

6. **Consider Error Logging Hook**
   - Allow attaching logger to error handler for observability
   - Separate from user presentation

---

## 9. Conclusion

The ALP-76 error handling refactoring successfully achieves its goal of separating error presentation from business logic. The implementation demonstrates:

✅ **Strengths:**
- Centralized error formatting at CLI boundary
- Domain errors contain technical data, not user messages
- Comprehensive error coverage with exhaustive matching
- Excellent user experience with actionable suggestions
- Debug mode preserves technical details
- Clean separation in core modules

⚠️ **Minor Issues:**
- One console.warn in parser (easily fixed)
- Graceful degradation messages bypass error handler (design trade-off)
- Some dynamic user messages in error classes (minor duplication)

The architecture is solid and maintainable. The minor issues are edge cases that don't compromise the overall design. The error handling system provides a strong foundation for consistent, user-friendly error presentation across the application.

**Final Verdict:** ✅ **PASS** - Acceptance criteria met with minor improvement opportunities.
