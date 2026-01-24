# Code Review: src/cli/main.ts

**Reviewed:** 2026-01-24
**Last Validated:** 2026-01-24 06:38:24 UTC
**Validation Commit:** `07c9e72ba01cda840046b96a1be4743a85e3d4c5`
**Scope:** Comprehensive review of CLI entry point
**Focus:** Async/await, error handling, TypeScript safety, edge cases

---

## Validation Summary

**✅ Major Progress**: 12 of 16 issues (75%) have been resolved since the original review!

### Resolution Status
- **✅ RESOLVED:** 12 issues (75%)
- **✓ VALID:** 2 issues (13%)
- **📍 MOVED:** 2 issues (13%)

See `/research/code-review/code-review-validation-report.md` for detailed validation results.

---

## Executive Summary

The main entry point has **1 CRITICAL** issue and **7 HIGH** priority issues that could cause runtime failures or undefined behavior. The IIFE async/await pattern is correct, but there are several areas where error handling is incomplete, TypeScript safety is compromised, and edge cases are not properly handled.

### Issue Breakdown
- **Critical:** 1 (✅ 1 resolved)
- **High:** 7 (✅ 5 resolved, ✓ 1 valid, 📍 1 moved)
- **Medium:** 5 (✅ 5 resolved)
- **Low:** 3 (✓ 1 valid, 📍 2 moved)

---

## CRITICAL ISSUES

### C1. Unhandled Promise Rejection in IIFE (Lines 309-320) ✅ RESOLVED

**Severity:** CRITICAL
**Impact:** Silent failures, process hangs, unhandled rejections
**Status:** ✅ RESOLVED - `.catch()` handler added at lines 389-394

**Problem:**
The IIFE wraps the async operation but doesn't return the promise to the top level. If an error occurs that isn't caught by the inner try-catch (e.g., an error in `runCli` itself), it could result in an unhandled promise rejection.

**Current Code:**
```typescript
;(async () => {
  try {
    const configLayer = await loadConfigAsync(customConfigPath!)
    runCli(configLayer)  // ⚠️ Not awaited, returns void
  } catch (error) {
    console.error(`\nError: Failed to load config`)
    if (error instanceof Error) {
      console.error(`  ${error.message}`)
    }
    process.exit(1)
  }
})()  // ⚠️ Promise not handled
```

**Issues:**
1. `runCli()` is called but not awaited (though it's synchronous, this is confusing)
2. The IIFE promise is not caught with `.catch()`
3. If the IIFE throws before the try block, it's unhandled
4. Node.js will emit an unhandledRejection warning

**Recommended Fix:**
```typescript
;(async () => {
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
})().catch((error) => {
  // Catch any errors that escape the try-catch
  console.error('\nUnexpected error during initialization')
  console.error(error)
  process.exit(1)
})
```

---

## HIGH PRIORITY ISSUES

### H1. Non-null Assertion Unsafe (Line 311) ✅ RESOLVED

**Severity:** HIGH
**Impact:** Potential runtime crash if logic changes
**Status:** ✅ RESOLVED - Explicit null check added at lines 368-371

**Problem:**
Using non-null assertion operator `!` bypasses TypeScript's safety checks.

**Current Code:**
```typescript
const configLayer = await loadConfigAsync(customConfigPath!)
```

**Issue:**
While `needsAsyncLoading()` checks that `customConfigPath` is defined, this creates a dependency between functions that TypeScript can't verify. If someone modifies `needsAsyncLoading()` or the control flow, this could crash.

**Recommended Fix:**
```typescript
if (!customConfigPath) {
  console.error('\nError: Config path is required for async loading')
  process.exit(1)
}
const configLayer = await loadConfigAsync(customConfigPath)
```

---

### H2. handleConfigLoadError Has Unreachable Return (Line 239) ✅ RESOLVED

**Severity:** HIGH
**Impact:** TypeScript type confusion, misleading code
**Status:** ✅ RESOLVED - Explanatory comment added at lines 279-281

**Problem:**
Function declares `return handleConfigLoadError(...)` but the function signature is `never`, which means it never returns.

**Current Code:**
```typescript
async function loadConfigAsync(
  configPath: string,
): Promise<Layer.Layer<ConfigService, never, never>> {
  // ...
  try {
    // ...
  } catch (error) {
    // handleConfigLoadError always calls process.exit(1) and returns never
    return handleConfigLoadError(error, resolvedPath)  // ⚠️ Unreachable return
  }
}
```

**Issue:**
The `return` keyword is unnecessary because `handleConfigLoadError` calls `process.exit(1)` and never returns. This is confusing and suggests the author doesn't understand the `never` type.

**Recommended Fix:**
```typescript
} catch (error) {
  handleConfigLoadError(error, resolvedPath)
  // No return needed - function signature is `never`
}
```

Or better, make it explicit:
```typescript
} catch (error) {
  handleConfigLoadError(error, resolvedPath)
  // TypeScript knows this is unreachable
  return undefined as never  // Explicit unreachable marker
}
```

---

### H3. Same Issue in createConfigLayerSync (Line 273) ✅ RESOLVED

**Severity:** HIGH
**Impact:** Same as H2
**Status:** ✅ RESOLVED - Consistent with H2, comment added at lines 325-327

**Current Code:**
```typescript
try {
  const content = fs.readFileSync(resolvedPath, 'utf-8')
  const fileConfig = JSON.parse(content) as PartialMdContextConfig
  return createConfigLayerFromConfig(fileConfig)
} catch (error) {
  // handleConfigLoadError always calls process.exit(1) and returns never
  return handleConfigLoadError(error, resolvedPath)  // ⚠️ Unreachable return
}
```

**Recommended Fix:**
```typescript
} catch (error) {
  handleConfigLoadError(error, resolvedPath)
}
```

---

### H4. Unsafe Type Assertion in JSON.parse (Line 269) ✅ RESOLVED

**Severity:** HIGH
**Impact:** Runtime errors if JSON is invalid structure
**Status:** ✅ RESOLVED - Proper JSON validation with try-catch at lines 308-320

**Problem:**
Using `as PartialMdContextConfig` assumes the JSON structure is valid without validation.

**Current Code:**
```typescript
const content = fs.readFileSync(resolvedPath, 'utf-8')
const fileConfig = JSON.parse(content) as PartialMdContextConfig
return createConfigLayerFromConfig(fileConfig)
```

**Issue:**
If the JSON file contains `{"foo": "bar"}`, TypeScript will happily cast it to `PartialMdContextConfig`, but it's not actually valid. This will cause runtime errors later when the config is used.

**Recommended Fix:**
```typescript
const content = fs.readFileSync(resolvedPath, 'utf-8')
let parsed: unknown
try {
  parsed = JSON.parse(content)
} catch (parseError) {
  console.error(`\nError: Invalid JSON in config file: ${resolvedPath}`)
  console.error(`  ${parseError instanceof Error ? parseError.message : String(parseError)}`)
  process.exit(1)
}

// Validate it's an object before using
validateConfigObject(parsed, resolvedPath)
const fileConfig = parsed
return createConfigLayerFromConfig(fileConfig)
```

---

### H5. Missing Error Handling in runCli (Line 289-303) ✅ RESOLVED

**Severity:** HIGH
**Impact:** Uncaught errors could crash the process
**Status:** ✅ RESOLVED - Catch-all error handler added at lines 353-356

**Problem:**
The `runCli` function only catches `CliValidationError` but lets all other errors through with `throw error`.

**Current Code:**
```typescript
Effect.suspend(() => cli(filteredArgv)).pipe(
  Effect.provide(appLayers),
  Effect.catchAll((error) =>
    Effect.sync(() => {
      if (isEffectCliValidationError(error)) {
        const message = formatEffectCliError(error)
        console.error(`\nError: ${message}`)
        console.error('\nRun "mdcontext --help" for usage information.')
        process.exit(1)
      }
      throw error  // ⚠️ Uncaught errors rethrown
    }),
  ),
  NodeRuntime.runMain,
)
```

**Issue:**
Any error that isn't an `EffectCliValidationError` is rethrown and will be handled by `NodeRuntime.runMain`. If that doesn't handle it properly, it could crash the process or leave it hanging.

**Recommended Fix:**
```typescript
Effect.suspend(() => cli(filteredArgv)).pipe(
  Effect.provide(appLayers),
  Effect.catchAll((error) =>
    Effect.sync(() => {
      if (isEffectCliValidationError(error)) {
        const message = formatEffectCliError(error)
        console.error(`\nError: ${message}`)
        console.error('\nRun "mdcontext --help" for usage information.')
        process.exit(1)
      }
      // Handle all other errors
      console.error('\nUnexpected error:')
      console.error(error)
      process.exit(2)  // Different exit code for unexpected errors
    }),
  ),
  NodeRuntime.runMain,
)
```

---

### H6. Race Condition in Help Checks (Lines 90-98) ✓ VALID

**Severity:** HIGH
**Impact:** Process hangs or unexpected behavior
**Status:** ✓ VALID - Code unchanged, issue remains but acceptable (no module-level async)

**Problem:**
Help checks call `process.exit(0)` synchronously, but if async config loading has started, there could be pending promises.

**Current Code:**
```typescript
// Check for subcommand help before anything else
checkSubcommandHelp()  // May call process.exit(0)

// Check for bare subcommand that has nested subcommands (e.g., "config")
checkBareSubcommandHelp()  // May call process.exit(0)

// Check if we should show main help
if (shouldShowMainHelp()) {
  showMainHelp()
  process.exit(0)  // ⚠️ Abrupt exit during module loading
}
```

**Issue:**
These run during module initialization, before any async operations start. However, if any module-level code starts async work, calling `process.exit(0)` could interrupt it.

**Current State:** Acceptable (no module-level async work detected)

**Recommended:** Add comment explaining why this is safe:
```typescript
// SAFETY: Help checks run during module initialization, before any async
// operations start. If we add module-level async work in the future,
// we must refactor these to wait for cleanup.
checkSubcommandHelp()
checkBareSubcommandHelp()
```

---

### H7. validateConfigObject Type Guard Too Permissive (Lines 182-198) ✅ RESOLVED

**Severity:** HIGH
**Impact:** Invalid configs could pass validation
**Status:** ✅ RESOLVED - Structure validation with VALID_CONFIG_KEYS at lines 213-239

**Problem:**
The type guard only checks that the value is a non-null, non-array object. It doesn't validate the actual structure.

**Current Code:**
```typescript
function validateConfigObject(
  config: unknown,
  resolvedPath: string,
): asserts config is PartialMdContextConfig {
  if (
    !config ||
    typeof config !== 'object' ||
    config === null ||  // ⚠️ Redundant check (!config catches null)
    Array.isArray(config)
  ) {
    console.error(
      `\nError: Config file must export a default object or named "config" export`,
    )
    console.error(`  File: ${resolvedPath}`)
    process.exit(1)
  }
}
```

**Issues:**
1. `config === null` is redundant because `!config` already catches null
2. Doesn't actually validate structure - `{}` passes but isn't a valid config
3. TypeScript thinks it's safe but it's not

**Recommended Fix:**
```typescript
function validateConfigObject(
  config: unknown,
  resolvedPath: string,
): asserts config is PartialMdContextConfig {
  // Check it's an object
  if (
    !config ||
    typeof config !== 'object' ||
    Array.isArray(config)
  ) {
    console.error(
      `\nError: Config file must export a default object or named "config" export`,
    )
    console.error(`  File: ${resolvedPath}`)
    process.exit(1)
  }

  // Validate it has expected top-level keys (at least one)
  const validKeys = ['index', 'search', 'embeddings', 'summarization', 'output', 'paths']
  const configKeys = Object.keys(config)
  const hasValidKey = configKeys.some(key => validKeys.includes(key))

  if (configKeys.length > 0 && !hasValidKey) {
    console.error(`\nError: Config file has no recognized configuration keys`)
    console.error(`  File: ${resolvedPath}`)
    console.error(`  Found keys: ${configKeys.join(', ')}`)
    console.error(`  Expected at least one of: ${validKeys.join(', ')}`)
    process.exit(1)
  }
}
```

---

## MEDIUM PRIORITY ISSUES

### M1. extractConfigPath Edge Case: Empty String (Lines 112-146) ✅ RESOLVED

**Severity:** MEDIUM
**Impact:** Silent bugs if user passes empty config path
**Status:** ✅ RESOLVED - Empty path validation at lines 123-141

**Problem:**
If user passes `--config=` or `--config ""`, the function sets `configPath = ""` which is falsy but still a string.

**Current Code:**
```typescript
// --config=path or -c=path
if (arg.startsWith('--config=')) {
  configPath = arg.slice('--config='.length)  // Could be ""
  continue
}
```

**Edge Case:**
```bash
mdcontext --config= index
# configPath === ""
# needsAsyncLoading("") returns false
# createConfigLayerSync() checks !customConfigPath and uses default
```

**Recommended Fix:**
```typescript
// --config=path or -c=path
if (arg.startsWith('--config=')) {
  const value = arg.slice('--config='.length)
  if (value.length === 0) {
    console.error('\nError: --config requires a path')
    console.error('  Usage: --config=path/to/config.js')
    process.exit(1)
  }
  configPath = value
  continue
}
```

---

### M2. validateConfigFileExists Type Annotation Misleading (Line 160) ✅ RESOLVED

**Severity:** MEDIUM
**Impact:** Confusing function signature
**Status:** ✅ RESOLVED - Signature changed to `void` at line 178

**Problem:**
The assertion function signature uses `asserts resolvedPath` but the parameter name suggests it's the value being asserted.

**Current Code:**
```typescript
function validateConfigFileExists(resolvedPath: string): asserts resolvedPath {
  if (!fs.existsSync(resolvedPath)) {
    console.error(`\nError: Config file not found: ${resolvedPath}`)
    process.exit(1)
  }
}
```

**Issue:**
This reads as "assert that `resolvedPath` is truthy" which is confusing. The function actually asserts that the file exists, not the type of the parameter.

**Recommended Fix:**
Remove the assertion signature since it doesn't narrow types:
```typescript
function validateConfigFileExists(resolvedPath: string): void {
  if (!fs.existsSync(resolvedPath)) {
    console.error(`\nError: Config file not found: ${resolvedPath}`)
    process.exit(1)
  }
}
```

Or use a type guard pattern:
```typescript
function ensureConfigFileExists(resolvedPath: string): asserts resolvedPath is string {
  if (!fs.existsSync(resolvedPath)) {
    console.error(`\nError: Config file not found: ${resolvedPath}`)
    process.exit(1)
  }
}
```

---

### M3. needsAsyncLoading Doesn't Handle .cjs or .mjs (Line 246) ✅ RESOLVED

**Severity:** MEDIUM
**Impact:** .cjs and .mjs files handled incorrectly
**Status:** ✅ RESOLVED - Extension-based check at lines 289-294 handles all JS/TS variants

**Problem:**
Only checks for `.ts`, `.js`, `.mjs` but not `.cjs` (CommonJS).

**Current Code:**
```typescript
const needsAsyncLoading = (configPath: string | undefined): boolean => {
  if (!configPath) return false
  const resolved = path.resolve(configPath)
  return (
    resolved.endsWith('.ts') ||
    resolved.endsWith('.js') ||
    resolved.endsWith('.mjs')
  )
}
```

**Issue:**
`.cjs` files need dynamic import too, but will fall through to the sync JSON path.

**Recommended Fix:**
```typescript
const needsAsyncLoading = (configPath: string | undefined): boolean => {
  if (!configPath) return false
  const resolved = path.resolve(configPath)
  return (
    resolved.endsWith('.ts') ||
    resolved.endsWith('.js') ||
    resolved.endsWith('.mjs') ||
    resolved.endsWith('.cjs')
  )
}
```

**Better Fix:**
```typescript
const needsAsyncLoading = (configPath: string | undefined): boolean => {
  if (!configPath) return false
  const ext = path.extname(configPath).toLowerCase()
  // Async load for all JS/TS variants, sync for JSON
  return ext !== '.json'
}
```

---

### M4. Error Message Duplication in IIFE Catch (Lines 314-317) ✅ RESOLVED

**Severity:** MEDIUM
**Impact:** Redundant error handling
**Status:** ✅ RESOLVED - Specific error message at lines 376-388

**Problem:**
The IIFE catch block duplicates error handling that's already in `loadConfigAsync`.

**Current Code:**
```typescript
;(async () => {
  try {
    const configLayer = await loadConfigAsync(customConfigPath!)
    runCli(configLayer)
  } catch (error) {
    // loadConfigAsync already calls handleConfigLoadError which exits
    // This catch block is unreachable if loadConfigAsync fails
    console.error(`\nError: Failed to load config`)
    if (error instanceof Error) {
      console.error(`  ${error.message}`)
    }
    process.exit(1)
  }
})()
```

**Issue:**
`loadConfigAsync` calls `handleConfigLoadError` which calls `process.exit(1)`. This catch block will never run for config loading errors, only for errors in `runCli`.

**Recommended Fix:**
Make the error message more specific:
```typescript
} catch (error) {
  // This catches errors from runCli, not loadConfigAsync
  console.error(`\nError: Failed to initialize CLI`)
  if (error instanceof Error) {
    console.error(`  ${error.message}`)
    if (error.stack) {
      console.error(`\nStack trace:`)
      console.error(error.stack)
    }
  }
  process.exit(1)
}
```

---

### M5. Missing Validation for --config Path (Line 134) ✅ RESOLVED

**Severity:** MEDIUM
**Impact:** Confusing error if user passes flag as path
**Status:** ✅ RESOLVED - Comprehensive validation at lines 145-159

**Problem:**
Checks `!nextArg.startsWith('-')` but doesn't validate it's a reasonable file path.

**Current Code:**
```typescript
if (arg === '--config' || arg === '-c') {
  const nextArg = argv[i + 1]
  if (nextArg && !nextArg.startsWith('-')) {
    configPath = nextArg
    i++ // Skip the path argument
    continue
  }
}
```

**Edge Case:**
```bash
mdcontext --config --help
# nextArg === "--help", doesn't set configPath (correct)
# But what if:
mdcontext --config ./path --help
# nextArg === "./path", sets configPath (correct)
# But also:
mdcontext -c ''
# nextArg === '', sets configPath to empty string
```

**Recommended Fix:**
```typescript
if (arg === '--config' || arg === '-c') {
  const nextArg = argv[i + 1]
  if (nextArg && !nextArg.startsWith('-')) {
    if (nextArg.length === 0) {
      console.error('\nError: --config requires a path')
      process.exit(1)
    }
    configPath = nextArg
    i++
    continue
  }
  // If no next arg or next arg is a flag, show error
  console.error('\nError: --config requires a path')
  console.error('  Usage: --config path/to/config.js')
  process.exit(1)
}
```

---

## LOW PRIORITY ISSUES

### L1. Magic Number in extractConfigPath (Line 118) 📍 MOVED

**Severity:** LOW
**Impact:** Code readability
**Status:** 📍 MOVED - Now at line 119, still has unnecessary undefined check

**Problem:**
Uses magic numbers for array bounds checking.

**Current Code:**
```typescript
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]
  if (arg === undefined) continue  // ⚠️ Unnecessary check in for loop
```

**Issue:**
In a standard for loop, `arg` can never be undefined if `i < argv.length`. This check is unnecessary.

**Recommended Fix:**
```typescript
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]!  // Use non-null assertion since loop bounds guarantee it
  // ... rest of code
```

Or just remove the check:
```typescript
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]
  // Continue directly without undefined check
```

---

### L2. Inconsistent String Interpolation (Line 162) ✓ VALID

**Severity:** LOW
**Impact:** Code style consistency
**Status:** ✓ VALID - Pattern used consistently, now at line 180

**Problem:**
Mixes template literals and string concatenation.

**Current Code:**
```typescript
console.error(`\nError: Config file not found: ${resolvedPath}`)
```

**Issue:**
Consistent, but the leading `\n` is in the template literal. Could be clearer.

**Recommended Fix:**
```typescript
console.error('\n' + `Error: Config file not found: ${resolvedPath}`)
```

Or keep it but add comment:
```typescript
// Blank line before error message
console.error(`\nError: Config file not found: ${resolvedPath}`)
```

---

### L3. Effect.runSync Not Wrapped in Try-Catch (Line 210) 📍 MOVED

**Severity:** LOW
**Impact:** Potential crash if config parsing fails
**Status:** 📍 MOVED - Now at lines 244-255, still not wrapped but acceptable

**Problem:**
`Effect.runSync` can throw if the Effect fails, but it's not wrapped in try-catch.

**Current Code:**
```typescript
const createConfigLayerFromConfig = (
  fileConfig: PartialMdContextConfig,
): Layer.Layer<ConfigService, never, never> => {
  const provider = createConfigProviderSync({
    fileConfig,
    skipEnv: false,
  })
  const configResult = Effect.runSync(
    MdContextConfig.pipe(Effect.withConfigProvider(provider)),
  )
  return Layer.succeed(ConfigService, configResult)
}
```

**Issue:**
If `MdContextConfig` parsing fails (invalid config values), `Effect.runSync` will throw and crash. This function is called inside try-catch blocks in the callers, so it's handled, but not obviously.

**Recommended Fix:**
Add explicit error handling or document the throw behavior:
```typescript
/**
 * Create a ConfigService Layer from a validated config object.
 * @throws {ConfigError} If config validation fails
 */
const createConfigLayerFromConfig = (
  fileConfig: PartialMdContextConfig,
): Layer.Layer<ConfigService, never, never> => {
  try {
    const provider = createConfigProviderSync({
      fileConfig,
      skipEnv: false,
    })
    const configResult = Effect.runSync(
      MdContextConfig.pipe(Effect.withConfigProvider(provider)),
    )
    return Layer.succeed(ConfigService, configResult)
  } catch (error) {
    // Re-throw with more context
    console.error('\nError: Invalid configuration values')
    if (error instanceof Error) {
      console.error(`  ${error.message}`)
    }
    process.exit(1)
  }
}
```

---

## SUMMARY OF RECOMMENDATIONS

### Immediate Actions (Critical/High)

1. **C1:** Add `.catch()` handler to IIFE to prevent unhandled rejections
2. **H1:** Remove non-null assertion, add explicit check
3. **H2, H3:** Remove unreachable `return` statements
4. **H4:** Add JSON validation before casting
5. **H5:** Add catch-all error handler in `runCli`
6. **H7:** Improve `validateConfigObject` to check actual structure

### Important Improvements (Medium)

1. **M1, M5:** Add validation for empty/missing config paths
2. **M3:** Handle `.cjs` files in `needsAsyncLoading`
3. **M4:** Improve IIFE error message specificity

### Code Quality (Low)

1. **L1:** Remove unnecessary undefined check
2. **L3:** Document or wrap `Effect.runSync` throw behavior

---

## TESTING RECOMMENDATIONS

Create tests for:

1. **Config loading edge cases:**
   - Empty config path `--config=`
   - Non-existent file
   - Invalid JSON syntax
   - Valid JSON but invalid structure
   - .cjs, .mjs, .ts files

2. **Async error scenarios:**
   - Errors thrown in `loadConfigAsync`
   - Errors thrown in `runCli`
   - Unhandled promise rejections

3. **Help flag interactions:**
   - `--config` with `--help`
   - Bare subcommand help
   - Invalid subcommands

4. **Type safety:**
   - Verify TypeScript catches unsafe operations
   - Test assertion functions actually narrow types

---

## DIFF: Proposed Changes

```typescript
// ============================================================================
// CRITICAL FIX: C1 - Unhandled Promise Rejection
// ============================================================================

// OLD:
;(async () => {
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

// NEW:
;(async () => {
  try {
    // H1: Remove non-null assertion
    if (!customConfigPath) {
      console.error('\nError: Config path is required for async loading')
      process.exit(1)
    }
    const configLayer = await loadConfigAsync(customConfigPath)
    runCli(configLayer)
  } catch (error) {
    // M4: More specific error message
    console.error(`\nError: Failed to initialize CLI`)
    if (error instanceof Error) {
      console.error(`  ${error.message}`)
    }
    process.exit(1)
  }
})().catch((error) => {
  // C1: Catch unhandled promise rejections
  console.error('\nUnexpected error during initialization')
  console.error(error)
  process.exit(1)
})

// ============================================================================
// HIGH FIX: H2, H3 - Remove Unreachable Returns
// ============================================================================

// loadConfigAsync (H2):
async function loadConfigAsync(
  configPath: string,
): Promise<Layer.Layer<ConfigService, never, never>> {
  const resolvedPath = path.resolve(configPath)
  validateConfigFileExists(resolvedPath)

  try {
    const fileUrl = `file://${resolvedPath}`
    const module = (await import(fileUrl)) as {
      default?: PartialMdContextConfig
      config?: PartialMdContextConfig
    }
    const fileConfig = module.default ?? module.config

    validateConfigObject(fileConfig, resolvedPath)
    return createConfigLayerFromConfig(fileConfig)
  } catch (error) {
    // OLD: return handleConfigLoadError(error, resolvedPath)
    // NEW: Remove unreachable return
    handleConfigLoadError(error, resolvedPath)
  }
}

// createConfigLayerSync (H3):
function createConfigLayerSync(): Layer.Layer<ConfigService, never, never> {
  if (!customConfigPath) {
    return defaultCliConfigLayerSync
  }

  const resolvedPath = path.resolve(customConfigPath)
  validateConfigFileExists(resolvedPath)

  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8')

    // H4: Better JSON parsing with validation
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch (parseError) {
      console.error(`\nError: Invalid JSON in config file: ${resolvedPath}`)
      console.error(`  ${parseError instanceof Error ? parseError.message : String(parseError)}`)
      process.exit(1)
    }

    validateConfigObject(parsed, resolvedPath)
    const fileConfig = parsed
    return createConfigLayerFromConfig(fileConfig)
  } catch (error) {
    // OLD: return handleConfigLoadError(error, resolvedPath)
    // NEW: Remove unreachable return
    handleConfigLoadError(error, resolvedPath)
  }
}

// ============================================================================
// HIGH FIX: H5 - Better Error Handling in runCli
// ============================================================================

const runCli = (
  configLayer: Layer.Layer<ConfigService, never, never>,
): void => {
  const appLayers = Layer.mergeAll(
    NodeContext.layer,
    cliConfigLayer,
    configLayer,
  )

  Effect.suspend(() => cli(filteredArgv)).pipe(
    Effect.provide(appLayers),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        if (isEffectCliValidationError(error)) {
          const message = formatEffectCliError(error)
          console.error(`\nError: ${message}`)
          console.error('\nRun "mdcontext --help" for usage information.')
          process.exit(1)
        }
        // NEW: Handle all other errors instead of rethrowing
        console.error('\nUnexpected error:')
        console.error(error)
        process.exit(2)
      }),
    ),
    NodeRuntime.runMain,
  )
}

// ============================================================================
// HIGH FIX: H7 - Improved Config Validation
// ============================================================================

function validateConfigObject(
  config: unknown,
  resolvedPath: string,
): asserts config is PartialMdContextConfig {
  // Check it's an object (H7: removed redundant null check)
  if (
    !config ||
    typeof config !== 'object' ||
    Array.isArray(config)
  ) {
    console.error(
      `\nError: Config file must export a default object or named "config" export`,
    )
    console.error(`  File: ${resolvedPath}`)
    process.exit(1)
  }

  // H7: Validate structure
  const validKeys = ['index', 'search', 'embeddings', 'summarization', 'output', 'paths']
  const configKeys = Object.keys(config)
  const hasValidKey = configKeys.some(key => validKeys.includes(key))

  if (configKeys.length > 0 && !hasValidKey) {
    console.error(`\nError: Config file has no recognized configuration keys`)
    console.error(`  File: ${resolvedPath}`)
    console.error(`  Found keys: ${configKeys.join(', ')}`)
    console.error(`  Expected at least one of: ${validKeys.join(', ')}`)
    process.exit(1)
  }
}

// ============================================================================
// MEDIUM FIX: M1, M5 - Config Path Validation
// ============================================================================

const extractConfigPath = (
  argv: string[],
): { configPath: string | undefined; filteredArgv: string[] } => {
  const filteredArgv: string[] = []
  let configPath: string | undefined

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    // L1: Removed unnecessary undefined check

    // M1: Validate empty paths
    if (arg.startsWith('--config=')) {
      const value = arg.slice('--config='.length)
      if (value.length === 0) {
        console.error('\nError: --config requires a path')
        console.error('  Usage: --config=path/to/config.js')
        process.exit(1)
      }
      configPath = value
      continue
    }
    if (arg.startsWith('-c=')) {
      const value = arg.slice('-c='.length)
      if (value.length === 0) {
        console.error('\nError: -c requires a path')
        console.error('  Usage: -c=path/to/config.js')
        process.exit(1)
      }
      configPath = value
      continue
    }

    // M5: Better validation for flag-value pairs
    if (arg === '--config' || arg === '-c') {
      const nextArg = argv[i + 1]
      if (!nextArg || nextArg.startsWith('-')) {
        console.error('\nError: --config requires a path')
        console.error('  Usage: --config path/to/config.js')
        process.exit(1)
      }
      if (nextArg.length === 0) {
        console.error('\nError: --config path cannot be empty')
        process.exit(1)
      }
      configPath = nextArg
      i++
      continue
    }

    filteredArgv.push(arg)
  }

  return { configPath, filteredArgv }
}

// ============================================================================
// MEDIUM FIX: M3 - Handle All JS Extensions
// ============================================================================

const needsAsyncLoading = (configPath: string | undefined): boolean => {
  if (!configPath) return false
  const ext = path.extname(configPath).toLowerCase()
  // Async load for all JS/TS variants, sync for JSON
  return ext !== '.json'
}

// ============================================================================
// MEDIUM FIX: M2 - Fix Type Annotation
// ============================================================================

// OLD:
function validateConfigFileExists(resolvedPath: string): asserts resolvedPath {
  // ...
}

// NEW:
function validateConfigFileExists(resolvedPath: string): void {
  if (!fs.existsSync(resolvedPath)) {
    console.error(`\nError: Config file not found: ${resolvedPath}`)
    process.exit(1)
  }
}

// ============================================================================
// LOW FIX: L3 - Document Throw Behavior
// ============================================================================

/**
 * Create a ConfigService Layer from a validated config object.
 *
 * @throws Will call process.exit(1) if config validation fails
 */
const createConfigLayerFromConfig = (
  fileConfig: PartialMdContextConfig,
): Layer.Layer<ConfigService, never, never> => {
  try {
    const provider = createConfigProviderSync({
      fileConfig,
      skipEnv: false,
    })
    const configResult = Effect.runSync(
      MdContextConfig.pipe(Effect.withConfigProvider(provider)),
    )
    return Layer.succeed(ConfigService, configResult)
  } catch (error) {
    console.error('\nError: Invalid configuration values')
    if (error instanceof Error) {
      console.error(`  ${error.message}`)
    }
    process.exit(1)
  }
}
```

---

## CONCLUSION

The main entry point has **significant issues** that need to be addressed:

1. **Unhandled promise rejections** (Critical)
2. **Type safety violations** (High)
3. **Incomplete error handling** (High)
4. **Missing edge case validation** (Medium)

These issues are fixable with the changes outlined above. The async/await pattern in the IIFE is fundamentally correct, but needs better error handling. The config loading logic is sound but needs validation improvements.

**Estimated effort:** 2-3 hours for all fixes + comprehensive testing
