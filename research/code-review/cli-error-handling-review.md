# CLI Error Handling Review

**Date:** 2026-01-24
**Last Validated:** 2026-01-24 06:38:24 UTC
**Validation Commit:** `07c9e72ba01cda840046b96a1be4743a85e3d4c5`
**Scope:** All CLI command files and error handling infrastructure
**Reviewer:** Claude Sonnet 4.5

---

## Validation Summary

**✓ All Issues Verified**: All 11 issues remain valid and accurately documented.

### Resolution Status
- **✓ VALID:** 10 issues (91%)
- **📍 MOVED:** 1 issue (9%)
- **✅ RESOLVED:** 0 issues (0%)

See `/research/code-review/code-review-validation-report.md` for detailed validation results.

---

## Executive Summary

The CLI codebase demonstrates a **well-architected error handling system** using Effect's tagged error pattern. The centralized error handler (`src/cli/error-handler.ts`) provides consistent formatting and exit codes. However, there are **inconsistencies in error propagation** between commands, with some using graceful degradation while others let errors propagate to the CLI boundary.

**Overall Grade: B+**

### Strengths
- Centralized error handler with comprehensive error mapping
- Type-safe tagged errors using Effect's Data.TaggedError pattern
- Consistent exit code strategy (0=success, 1=user error, 2=system error, 3=API error)
- Rich error context with actionable suggestions
- Clear separation between technical error messages and user-facing formatting

### Areas for Improvement
- Inconsistent error handling strategies across commands (some catch locally, some propagate)
- Multiple `process.exit()` calls scattered across CLI files
- Mixed error handling patterns (Effect.catchTags vs Effect.try)
- Some commands silently degrade on errors without proper logging
- Legacy error handling code for @effect/cli validation errors

---

## Error Handling Architecture

### Centralized Error Handler (`src/cli/error-handler.ts`)

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/cli/error-handler.ts`

The error handler is well-designed with:

1. **Exit Code Constants** (Lines 45-52)
   ```typescript
   export const EXIT_CODE = {
     SUCCESS: 0,
     USER_ERROR: 1,
     SYSTEM_ERROR: 2,
     API_ERROR: 3,
   } as const
   ```

2. **Formatted Error Interface** (Lines 58-64)
   - Provides structured error output with code, message, details, suggestions, and exit code
   - Enables consistent formatting across all error types

3. **Exhaustive Error Formatting** (Lines 129-335)
   - Uses Effect's `Match.value()` pattern matching for type-safe error handling
   - Each error type mapped to user-friendly message with actionable suggestions
   - Special handling for ConfigError with enhanced context

4. **Error Display Functions**
   - `displayError()`: Standard error output to stderr
   - `displayErrorDebug()`: Enhanced output with stack traces for debugging
   - Clean separation of concerns

### Error Type System (`src/errors/index.ts`)

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/errors/index.ts`

Excellent error taxonomy with:
- **Error Codes** (E1xx-E9xx): Stable, machine-readable identifiers
- **Tagged Errors**: Type-safe discriminated unions using Effect's Data.TaggedError
- **Clear Documentation**: Each error type includes purpose and usage examples
- **Rich Context**: Errors carry path, message, cause, and domain-specific metadata

**Error Categories:**
- E1xx: File system errors (FileReadError, FileWriteError, etc.)
- E2xx: Parse errors
- E3xx: API/authentication errors
- E4xx: Index errors
- E5xx: Search errors
- E6xx: Vector store errors
- E7xx: Config errors
- E8xx: Watch errors
- E9xx: CLI validation errors

---

## Command-by-Command Analysis

### 1. index-cmd.ts

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/cli/commands/index-cmd.ts`

**Pattern:** **Graceful Degradation with Local Error Catching**

#### Good Practices ✅

1. **Strategic Error Catching** (Lines 256-276, 308-360)
   - Uses `Effect.catchTags()` to handle expected errors gracefully
   - Distinguishes between critical errors (index build) and optional operations (embeddings)
   - Continues execution when embeddings fail, preserving main index functionality

2. **Context-Aware Error Handling**
   ```typescript
   estimateEmbeddingCost(resolvedDir).pipe(
     Effect.catchTags({
       IndexNotFoundError: () => Effect.succeed(null),
       FileReadError: (e) => {
         Effect.runSync(Effect.logWarning(`Could not read index files: ${e.message}`))
         return Effect.succeed(null)
       },
       // ... more error cases
     }),
   )
   ```

3. **User-Friendly Degradation**
   - Shows informative messages when embeddings fail
   - Doesn't crash the entire operation if optional features fail

#### Issues ⚠️

1. **Inconsistent Process Exit** (Line 117) ✓ VALID
   ```typescript
   process.on('SIGINT', () => {
     watcher.stop()
     console.log('\nStopped watching.')
     process.exit(0)  // Direct exit instead of Effect-based termination
   })
   ```
   - **Impact:** Bypasses Effect's cleanup and error handling
   - **Recommendation:** Use Effect's interrupt mechanism

2. **Effect.runSync in Error Handlers** (Lines 261-262, 268-269, 320, 324, 332-333, 337-338, 347-348, 354-355) ✓ VALID
   ```typescript
   Effect.runSync(Console.error(`\n${e.message}`))
   ```
   - **Issue:** Running effects synchronously within effect chains can cause issues
   - **Impact:** Potential for unhandled errors if Console.error fails
   - **Recommendation:** Return effect-wrapped logging operations

3. **Duplicated Error Handling Code** (Lines 256-276 and 308-360) ✓ VALID
   - Identical `Effect.catchTags()` blocks in two places
   - **Impact:** Maintenance burden, potential for divergence
   - **Recommendation:** Extract to reusable function

### 2. search.ts

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/cli/commands/search.ts`

**Pattern:** **Mixed - Graceful Degradation for Missing Index, Propagation for Search Errors**

#### Good Practices ✅

1. **Early Return for Missing Index** (Lines 134-140)
   ```typescript
   if (!indexInfo.exists && !json) {
     yield* Console.log('No index found.')
     yield* Console.log('')
     yield* Console.log('Run: mdcontext index /path/to/docs')
     yield* Console.log('  Add --embed for semantic search capabilities')
     return
   }
   ```
   - User-friendly message with clear next steps
   - Graceful handling of expected "no index" state

2. **Auto-Index Feature with Error Handling** (Lines 155-165, 359-580)
   - Proactively creates semantic index if missing and under threshold
   - Gracefully falls back to keyword search on embedding errors
   - Good UX design

3. **Helpful Tips** (Lines 310-314, 349)
   - Contextual suggestions based on current state
   - Educates users about available features

#### Issues ⚠️

1. **Triple-Duplicated Error Handling** (Lines 368-386, 416-461, 513-559) ✓ VALID
   - Same `Effect.catchTags()` block appears **three times** in `handleMissingEmbeddings()`
   - **Impact:** High maintenance burden, 150+ lines of duplicated code
   - **Recommendation:** Extract to shared utility function

2. **Silent Error Suppression** (Lines 418-421) ✓ VALID
   ```typescript
   ApiKeyMissingError: (e) => {
     if (!json) {
       Effect.runSync(Console.error(`\n${e.message}`))
     }
     return Effect.succeed(null as BuildEmbeddingsResult | null)
   }
   ```
   - Errors are logged but operation continues
   - Users may miss critical configuration issues
   - **Recommendation:** Consider accumulating errors and displaying summary

3. **Inconsistent Error Propagation** ✓ VALID
   - Semantic search errors propagate (Line 318: `yield* semanticSearch(...)`)
   - Embedding errors are caught and suppressed
   - **Impact:** Confusing for users - why do some operations fail hard, others silently?

### 3. context.ts

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/cli/commands/context.ts`

**Pattern:** **Error Propagation to CLI Boundary**

#### Good Practices ✅

1. **Clean Error Propagation**
   - Most errors are allowed to propagate naturally
   - Minimal local error handling
   - Consistent with Effect's error handling philosophy

2. **Explicit Validation** (Lines 74-82)
   ```typescript
   if (fileList.length === 0) {
     yield* Effect.fail(
       new CliValidationError({
         message: 'At least one file is required. Usage: mdcontext context <file> [files...]',
         argument: 'files',
       }),
     )
   }
   ```
   - Uses typed errors for validation failures
   - Clear, actionable error messages

3. **Error Mapping** (Lines 93-105)
   ```typescript
   yield* parseFile(filePath).pipe(
     Effect.mapError((e) =>
       e._tag === 'ParseError'
         ? new ParseError({ ... })
         : new FileReadError({ ... })
     ),
   )
   ```
   - Properly maps internal errors to CLI error types
   - Preserves error context (path, line, column)

#### Issues ⚠️

1. **Continue on Error** (Line 161) 📍 MOVED (Still at line 161, verified)
   ```typescript
   if (extractedSections.length === 0) {
     yield* Console.error(`No sections found matching "${sectionSelector}" in ${file}`)
     yield* Console.error('Use --sections to list available sections.')
     continue  // Continues to next file instead of failing
   }
   ```
   - **Issue:** Silently continues when section not found
   - **Impact:** User may not notice if one of many files failed
   - **Recommendation:** Collect errors and report summary, or fail fast

### 4. tree.ts

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/cli/commands/tree.ts`

**Pattern:** **Error Propagation with Effect.try**

#### Good Practices ✅

1. **Effect.try for File System Operations** (Lines 32-40)
   ```typescript
   const stat = yield* Effect.try({
     try: () => fs.statSync(resolvedPath),
     catch: (e) =>
       new FileReadError({
         path: resolvedPath,
         message: `Cannot access path: ${e instanceof Error ? e.message : String(e)}`,
         cause: e,
       }),
   })
   ```
   - Proper error wrapping with typed errors
   - Preserves original error as cause
   - Good error message construction

2. **Consistent Error Mapping** (Lines 44-58)
   - Same pattern as context.ts for parseFile errors
   - Maps internal errors to CLI error types

#### Issues ⚠️

None identified. This is a good example of clean error handling.

### 5. links.ts & backlinks.ts

**Location:**
- `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/cli/commands/links.ts`
- `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/cli/commands/backlinks.ts`

**Pattern:** **Pure Error Propagation**

#### Good Practices ✅

1. **Minimal Error Handling**
   - No try/catch blocks
   - Errors propagate naturally
   - Relies on centralized error handler

2. **Clean Command Implementation**
   - Simple, focused logic
   - No defensive error handling
   - Trusts underlying functions to return proper errors

#### Issues ⚠️

None identified. These are excellent examples of letting errors propagate.

### 6. stats.ts

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/cli/commands/stats.ts`

**Pattern:** **Graceful Degradation for Missing Index**

#### Good Practices ✅

1. **Null Check for Missing Index** (Lines 52-60)
   ```typescript
   if (!docIndex || !sectionIndex) {
     if (json) {
       yield* Console.log(formatJson({ error: 'No index found' }, pretty))
     } else {
       yield* Console.log('No index found.')
       yield* Console.log("Run 'mdcontext index <path>' to create an index.")
     }
     return
   }
   ```
   - Handles expected "no index" case gracefully
   - Different output for JSON vs text mode
   - Clear user guidance

#### Issues ⚠️

1. **No Error Propagation from loadDocumentIndex** (Line 48)
   ```typescript
   const docIndex = yield* loadDocumentIndex(storage)
   const sectionIndex = yield* loadSectionIndex(storage)
   ```
   - Assumes these functions return `null` on error
   - **Issue:** If these functions throw different errors (corruption, permission issues), they won't be caught
   - **Recommendation:** Verify these functions handle errors internally or add error handling

### 7. config-cmd.ts

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/cli/commands/config-cmd.ts`

**Pattern:** **Mixed - Effect.try for File Operations, catchTag for Config Errors**

#### Good Practices ✅

1. **Effect.try for File Operations** (Lines 249-252)
   ```typescript
   yield* Effect.try({
     try: () => fs.writeFileSync(filepath, content, 'utf-8'),
     catch: (e) => new Error(`Failed to write config file: ${e}`),
   })
   ```
   - Wraps sync file operations properly
   - Good error message

2. **catchTag for Expected Errors** (Lines 527-531)
   ```typescript
   const configResult = yield* loadConfigFile(cwd).pipe(
     Effect.catchTag('ConfigError', (e) => {
       errors.push(e.message)
       return Effect.succeed({ found: false, searched: [] } as const)
     }),
   )
   ```
   - Catches expected config errors
   - Accumulates errors for reporting
   - Graceful degradation

#### Issues ⚠️

None identified. Good example of mixing patterns appropriately.

---

## Cross-Cutting Concerns

### 1. Process Exit Calls ✓ VALID

**Issue:** Direct `process.exit()` calls bypass Effect's cleanup mechanism

**Locations:** (All verified as of commit 07c9e72)
- `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/cli/main.ts` (Lines 98, 128, 138, 150, 154, 181, 193, 319)
- `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/cli/commands/index-cmd.ts` (Line 117)
- `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/cli/help.ts` (Lines 291, 404, 427)
- `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/cli/argv-preprocessor.ts` (Line 93)

**Impact:**
- Resource cleanup may not execute
- Effect finalizers are bypassed
- Potential for leaked resources (file handles, network connections)

**Recommendation:**
```typescript
// Instead of:
process.exit(1)

// Use Effect-based failure:
yield* Effect.fail(new CliValidationError({ message: '...' }))

// Or for success:
yield* Effect.succeed(void 0)
```

### 2. Effect.runSync in Error Handlers ✓ VALID

**Issue:** Running effects synchronously within effect chains

**Pattern:**
```typescript
ApiKeyMissingError: (e) => {
  Effect.runSync(Console.error(`\n${e.message}`))
  return Effect.succeed(null)
}
```

**Locations:** (All verified as of commit 07c9e72)
- `index-cmd.ts`: Lines 261-262, 268-269, 320, 324, 332-333, 337-338, 347-348, 354-355
- `search.ts`: Lines 373-374, 418-419, 424-425, 433-434, 440-441, 448-449, 454-455

**Impact:**
- Potential for unhandled errors if Console.error fails
- Breaks Effect's composition model
- Can't be tested or mocked easily

**Recommendation:**
```typescript
// Instead of Effect.runSync:
ApiKeyMissingError: (e) =>
  Console.error(`\n${e.message}`).pipe(
    Effect.flatMap(() => Effect.succeed(null))
  )
```

### 3. Duplicated Error Handling Code ✓ VALID

**Issue:** Same error handling blocks repeated multiple times

**Examples:** (All verified as of commit 07c9e72)
1. **search.ts**: `handleMissingEmbeddings()` has identical catchTags blocks 3 times at lines 368-386, 416-461, 513-559 (150+ lines)
2. **index-cmd.ts**: Embedding error handling duplicated 2 times at lines 256-276 and 308-360 (100+ lines)

**Impact:**
- Maintenance burden
- Risk of bugs when updating one instance but not others
- Code bloat

**Recommendation:**
```typescript
// Extract shared error handler:
const handleEmbeddingErrors = (json: boolean) => ({
  ApiKeyMissingError: (e: ApiKeyMissingError) =>
    Console.error(`\n${e.message}`).pipe(
      Effect.when(() => !json),
      Effect.flatMap(() => Effect.succeed(null as BuildEmbeddingsResult | null))
    ),
  // ... other error handlers
})

// Use it:
buildEmbeddings(resolvedDir, { ... }).pipe(
  Effect.catchTags(handleEmbeddingErrors(json))
)
```

### 4. Legacy Error Handling ✓ VALID

**Location:** `/Users/alphab/Dev/LLM/DEV/mdcontext/worktrees/nancy-ALP-139/src/cli/error-handler.ts` (Lines 446-491)

**Issue:** Code for handling @effect/cli validation errors (Verified at commit 07c9e72)

```typescript
export const isEffectCliValidationError = (error: unknown): boolean => {
  // ... legacy error checking
}
```

**Impact:**
- Technical debt
- Suggests migration in progress
- Code complexity

**Recommendation:**
- If migration to custom error types is complete, remove this code
- If still needed, add comment explaining why
- Consider deprecation timeline

### 5. Inconsistent Error Messages ✓ VALID

**Issue:** Some commands use console.error directly, others use Console.error

**Examples:**
```typescript
// Direct console usage (bypasses Effect)
console.error(`Watch error: ${error.message}`)  // index-cmd.ts:109

// Effect-based (proper)
yield* Console.error('No index found.')  // stats.ts:56
```

**Impact:**
- Inconsistent error output
- Can't intercept/test direct console calls
- Mixed paradigms

**Recommendation:** Always use Effect's Console for consistency

---

## Error Message Quality

### Good Examples ✅

1. **Actionable Suggestions**
   ```typescript
   suggestions: [
     "Run 'mdcontext index' first to build the index",
   ]
   ```

2. **Context-Rich Messages**
   ```typescript
   message: `Cannot read file: ${e.path}`,
   details: e.message,  // Technical details
   suggestions: [
     'Check that the file exists',
     'Check file permissions',
   ]
   ```

3. **Progressive Disclosure**
   - Brief message for common cases
   - Details available with --debug flag

### Areas for Improvement ⚠️

1. **Vague Error Messages** (stats.ts:54)
   ```typescript
   yield* Console.log(formatJson({ error: 'No index found' }, pretty))
   ```
   - **Issue:** Generic message, no path information
   - **Better:** `{ error: 'No index found', path: resolvedRoot, suggestion: 'Run mdcontext index' }`

2. **Missing Error Codes in Some Messages**
   - Some errors logged without error codes
   - Inconsistent with centralized error handler

---

## Exit Code Correctness

### ✅ Correct Usage

**Centralized Exit Codes** (error-handler.ts:45-52)
```typescript
export const EXIT_CODE = {
  SUCCESS: 0,      // Successful operation
  USER_ERROR: 1,   // Invalid arguments, missing config
  SYSTEM_ERROR: 2, // File system, network errors
  API_ERROR: 3,    // Authentication, rate limits
} as const
```

**Proper Mapping:**
- File system errors → SYSTEM_ERROR (2)
- API key errors → API_ERROR (3)
- Validation errors → USER_ERROR (1)

### ⚠️ Issues

1. **Direct Exit Calls Without Proper Codes**
   ```typescript
   process.exit(0)  // OK for success
   process.exit(1)  // Generic error, loses context
   ```
   - Should use centralized exit code constants
   - Should route through error handler

2. **Main.ts Exit Strategy** (Lines 291-302)
   ```typescript
   Effect.catchAll((error) =>
     Effect.sync(() => {
       if (isEffectCliValidationError(error)) {
         const message = formatEffectCliError(error)
         console.error(`\nError: ${message}`)
         console.error('\nRun "mdcontext --help" for usage information.')
         process.exit(1)  // Always exit 1 for validation errors
       }
       throw error  // Re-throw for other errors
     }),
   )
   ```
   - **Issue:** Hardcoded exit code 1
   - **Better:** Map to EXIT_CODE.USER_ERROR for clarity

---

## Unhandled Promise Rejections

### ✅ Good Practices

All async operations are properly wrapped in Effect:
- `Effect.promise()` for user prompts (index-cmd.ts:286, search.ts:492)
- `Effect.try()` for file operations (tree.ts:32, config-cmd.ts:249)
- No naked promises in command handlers

### ⚠️ Potential Issues

1. **SIGINT Handler** (index-cmd.ts:113-119)
   ```typescript
   yield* Effect.async<never, never>(() => {
     process.on('SIGINT', () => {
       watcher.stop()
       console.log('\nStopped watching.')
       process.exit(0)
     })
   })
   ```
   - **Issue:** If `watcher.stop()` throws, it won't be caught
   - **Recommendation:** Wrap in try/catch or Effect.try

2. **Dynamic Import in main.ts** (Lines 309-320)
   ```typescript
   (async () => {
     try {
       const configLayer = await loadConfigAsync(customConfigPath!)
       runCli(configLayer)
     } catch (error) {
       console.error(`\nError: Failed to load config`)
       if (error instanceof Error) {
         console.error(`  ${error.message}`)
       }
       process.exit(1)
     }
   })()
   ```
   - **Issue:** IIFE async function - rejection not attached to process
   - **Better:** Add `.catch()` or use top-level await

---

## Pattern Recommendations

### Ideal Error Handling Pattern for This Codebase

Based on the analysis, here's the recommended pattern:

```typescript
/**
 * Recommended Error Handling Pattern for mdcontext CLI Commands
 */

// 1. Let critical errors propagate to CLI boundary
//    The centralized error handler will format and display them
export const myCommand = Command.make('my-command', options, (args) =>
  Effect.gen(function* () {
    // Critical operation - let errors propagate
    const result = yield* criticalOperation(args)

    // ... use result
  })
)

// 2. For optional operations, use graceful degradation
export const myCommandWithOptional = Command.make('my-command', options, (args) =>
  Effect.gen(function* () {
    // Critical operation
    const result = yield* criticalOperation(args)

    // Optional operation - catch and continue
    const optional = yield* optionalOperation(args).pipe(
      Effect.catchTags({
        ExpectedError: (e) =>
          Console.log(`Note: ${e.message}`).pipe(
            Effect.map(() => null)
          )
      })
    )

    // Use both results
    displayResults(result, optional)
  })
)

// 3. For batch operations, accumulate errors
export const myBatchCommand = Command.make('my-command', options, (args) =>
  Effect.gen(function* () {
    const errors: Error[] = []
    const results: Result[] = []

    for (const item of args.items) {
      const result = yield* processItem(item).pipe(
        Effect.catchAll((e) =>
          Effect.sync(() => {
            errors.push(e)
            return null
          })
        )
      )
      if (result) results.push(result)
    }

    // Report summary
    if (errors.length > 0) {
      yield* Console.log(`Completed with ${errors.length} errors:`)
      for (const error of errors) {
        yield* Console.error(`  - ${error.message}`)
      }
    }

    return results
  })
)

// 4. Extract shared error handlers for reuse
const createEmbeddingErrorHandler = (json: boolean) => ({
  ApiKeyMissingError: (e: ApiKeyMissingError) =>
    Console.error(e.message).pipe(
      Effect.when(() => !json),
      Effect.map(() => null as BuildEmbeddingsResult | null)
    ),

  ApiKeyInvalidError: (e: ApiKeyInvalidError) =>
    Console.error(e.message).pipe(
      Effect.when(() => !json),
      Effect.map(() => null as BuildEmbeddingsResult | null)
    ),

  // ... other handlers
})

// Use shared handler
buildEmbeddings(path, options).pipe(
  Effect.catchTags(createEmbeddingErrorHandler(json))
)

// 5. Use Effect.try for all external/sync operations
const stat = yield* Effect.try({
  try: () => fs.statSync(path),
  catch: (e) => new FileReadError({
    path,
    message: e instanceof Error ? e.message : String(e),
    cause: e,
  })
})

// 6. Map errors to domain types
const document = yield* parseFile(path).pipe(
  Effect.mapError((e) =>
    e._tag === 'ParseError'
      ? new ParseError({ message: e.message, path, line: e.line })
      : new FileReadError({ path: e.path, message: e.message })
  )
)

// 7. Never use process.exit() in command handlers
// Instead, fail with typed errors:
yield* Effect.fail(
  new CliValidationError({
    message: 'Invalid argument',
    argument: 'path',
    expected: 'directory',
    received: typeof args.path,
  })
)
```

### Anti-Patterns to Avoid

```typescript
// ❌ DON'T: Use process.exit() in command handlers
process.exit(1)

// ✅ DO: Fail with typed errors
yield* Effect.fail(new CliValidationError({ message: '...' }))

// ❌ DON'T: Use Effect.runSync in error handlers
Effect.runSync(Console.error('message'))

// ✅ DO: Return effect-wrapped operations
Console.error('message').pipe(Effect.map(() => null))

// ❌ DON'T: Catch errors and silently continue without logging
.pipe(Effect.catchAll(() => Effect.succeed(null)))

// ✅ DO: Log before continuing
.pipe(
  Effect.catchAll((e) =>
    Console.log(`Note: Operation failed: ${e.message}`).pipe(
      Effect.map(() => null)
    )
  )
)

// ❌ DON'T: Duplicate error handling code
// (see index-cmd.ts and search.ts for examples)

// ✅ DO: Extract to shared functions
const handleEmbeddingErrors = createEmbeddingErrorHandler(json)

// ❌ DON'T: Mix paradigms
console.error('error')  // Direct console
yield* Console.error('error')  // Effect-based

// ✅ DO: Use Effect consistently
yield* Console.error('error')
```

---

## Specific Issues with File Paths and Line Numbers

### Critical Issues

1. **index-cmd.ts:117** - Direct process.exit in SIGINT handler
   - Priority: Medium
   - Fix: Use Effect interrupt mechanism

2. **index-cmd.ts:262, 269, 320, etc.** - Effect.runSync in error handlers (15 occurrences)
   - Priority: High
   - Fix: Replace with Effect.flatMap chains

3. **search.ts:368-580** - Triple-duplicated error handling (150+ lines)
   - Priority: High
   - Fix: Extract to shared function

4. **main.ts:163, 175, 196, 297, 318** - Multiple process.exit calls
   - Priority: Medium
   - Fix: Route through error handler or use typed errors

### Medium Priority Issues

5. **context.ts:161** - Silent continue on section not found
   - Priority: Medium
   - Fix: Accumulate errors and report summary

6. **stats.ts:48** - No error handling for loadDocumentIndex
   - Priority: Medium
   - Fix: Add catchTag or verify function handles errors internally

7. **error-handler.ts:453-491** - Legacy error handling code
   - Priority: Low
   - Fix: Add deprecation comment or remove if no longer needed

### Low Priority Issues

8. **All commands** - Inconsistent use of console.error vs Console.error
   - Priority: Low
   - Fix: Standardize on Effect's Console

9. **main.ts:309** - IIFE async without top-level await
   - Priority: Low
   - Fix: Add .catch() handler or use top-level await (Node 14.8+)

---

## Testing Recommendations

1. **Error Path Testing**
   - Add tests for each error type in each command
   - Verify correct exit codes
   - Test error message formatting

2. **Error Handler Testing**
   - Unit tests for formatError()
   - Verify all error tags are handled
   - Test debug mode output

3. **Integration Tests**
   - Test full error flow from command to exit
   - Verify cleanup on errors
   - Test interrupt handling

4. **Example Test Structure**
   ```typescript
   describe('index command error handling', () => {
     it('should exit with code 1 when index not found', async () => {
       const result = await runCommand(['index', '/nonexistent'])
       expect(result.exitCode).toBe(EXIT_CODE.USER_ERROR)
       expect(result.stderr).toContain('Index not found')
     })

     it('should exit with code 2 on file system error', async () => {
       const result = await runCommand(['index', '/no-permission'])
       expect(result.exitCode).toBe(EXIT_CODE.SYSTEM_ERROR)
       expect(result.stderr).toContain('permissions')
     })
   })
   ```

---

## Migration Path

### Phase 1: Quick Wins (1-2 days)

1. Extract duplicated error handlers to shared functions
   - `createEmbeddingErrorHandler()` in shared utilities
   - Reduces 250+ lines of duplication

2. Replace Effect.runSync with proper Effect chains
   - Search and replace pattern
   - Low risk, high value

3. Document legacy error handling
   - Add comments explaining migration status
   - Set deprecation timeline

### Phase 2: Consistency Improvements (2-3 days)

1. Standardize on Effect's Console throughout
   - Replace all console.error with Console.error
   - Consistent error output

2. Remove direct process.exit() calls
   - Replace with typed errors where possible
   - Use Effect.interrupt for signal handling

3. Add error accumulation to batch operations
   - context command with multiple files
   - Better user feedback

### Phase 3: Structural Improvements (3-5 days)

1. Refactor error handling strategy
   - Document when to catch vs propagate
   - Add guidelines to contributing docs

2. Improve error messages
   - Add context to generic errors
   - Ensure all errors have actionable suggestions

3. Add comprehensive error tests
   - Cover all error types
   - Verify exit codes
   - Test error message formatting

---

## Conclusion

The mdcontext CLI has a **solid foundation** for error handling with its centralized error handler and typed error system. The main issues are:

1. **Inconsistent application** of error handling patterns across commands
2. **Code duplication** in error handlers (250+ lines)
3. **Mixed paradigms** (Effect vs direct console/process.exit)
4. **Graceful degradation without proper logging** in some commands

Addressing these issues will result in a **more maintainable, consistent, and user-friendly** CLI with clear error messages and proper exit codes.

**Recommended Priority:**
1. Extract duplicated error handlers (high impact, low effort)
2. Replace Effect.runSync calls (high impact, medium effort)
3. Document error handling strategy (medium impact, low effort)
4. Remove process.exit() calls (medium impact, medium effort)
5. Add error tests (high value, high effort)

Total estimated effort: **1-2 weeks** for complete implementation with tests.
