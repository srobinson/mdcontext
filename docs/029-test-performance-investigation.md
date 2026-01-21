# Test Performance Investigation

## Problem Statement

Tests appear to complete quickly but the test runner hangs after completion. This investigation identifies the root causes and proposes fixes.

## Investigation Summary

After reviewing all test files and their dependencies, I identified **two primary causes** for the test hang issue:

### Root Cause 1: Tiktoken Encoder Not Released (CRITICAL)

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/utils/tokens.ts`

The tiktoken encoder is lazily loaded and cached at the module level, but **never freed**:

```typescript
// Line 8-18 in tokens.ts
let encoder: Awaited<
  ReturnType<typeof import('tiktoken').get_encoding>
> | null = null

const getEncoder = Effect.gen(function* () {
  if (encoder === null) {
    const { get_encoding } = yield* Effect.promise(() => import('tiktoken'))
    encoder = get_encoding('cl100k_base')  // Never freed!
  }
  return encoder
})
```

The tiktoken library uses WebAssembly and creates native resources. When these resources are not freed, Node.js keeps the process alive waiting for them to be garbage collected.

**Affected Tests:**
- `src/utils/tokens.test.ts` - Uses `countTokens()` directly
- `src/summarize/verify-bugs.test.ts` - Uses `countTokens()` for accuracy testing
- Any test that imports modules using the token counter

### Root Cause 2: hnswlib-node Vector Index Not Closed (SECONDARY)

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/embeddings/vector-store.ts`

The `HierarchicalNSW` instance from `hnswlib-node` is created but has no cleanup mechanism:

```typescript
// Line 62-97 in vector-store.ts
private index: HierarchicalNSW.HierarchicalNSW | null = null

private ensureIndex(): HierarchicalNSW.HierarchicalNSW {
  if (!this.index) {
    this.index = new HierarchicalNSW.HierarchicalNSW(
      'cosine',
      this.dimensions,
    )
    this.index.initIndex(10000, 16, 200, 100)
  }
  return this.index
}
// No close/dispose method implemented
```

This is less critical because the CLI tests use `execSync` which spawns separate processes, but if any unit tests start using the embedding functionality directly, this would cause additional hangs.

### Root Cause 3: CLI Tests Using execSync Are Slow But Not Hanging

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/src/cli/cli.test.ts`

The CLI tests spawn external processes using `execSync`, which is appropriate for E2E testing:

```typescript
// Line 12-30 in cli.test.ts
const run = (
  args: string,
  options: { cwd?: string; expectError?: boolean } = {},
): string => {
  const cwd = options.cwd ?? TEST_DIR
  try {
    return execSync(`${CLI} ${args}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch (error: unknown) {
    // ...
  }
}
```

While `execSync` is synchronous and blocks, it properly terminates when the command completes. The spawned processes are independent and do not contribute to the hang. However, these tests are **slow** (each spawns a new Node.js process).

## Vitest Configuration Analysis

**Location:** `/Users/alphab/Dev/LLM/DEV/md-tldr/vitest.config.ts`

Current configuration is minimal:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

Missing: teardown hooks, pool options, force exit configuration.

## Proposed Fixes

### Fix 1: Add Encoder Cleanup Function (Required)

```typescript
// In src/utils/tokens.ts

// Add export to free the encoder
export const freeEncoder = (): void => {
  if (encoder !== null) {
    encoder.free()  // tiktoken provides this method
    encoder = null
  }
}
```

### Fix 2: Add Global Test Teardown (Required)

Create `/Users/alphab/Dev/LLM/DEV/md-tldr/vitest.setup.ts`:

```typescript
import { afterAll } from 'vitest'

afterAll(async () => {
  // Free tiktoken encoder
  const { freeEncoder } = await import('./src/utils/tokens.js')
  freeEncoder()
})
```

Update vitest.config.ts:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

### Fix 3: Add Pool Configuration for Better Isolation (Recommended)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    pool: 'forks',  // Better isolation for native modules
    poolOptions: {
      forks: {
        singleFork: true,  // Reduce overhead
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

### Fix 4: Add Vector Store Cleanup (Recommended)

```typescript
// In src/embeddings/vector-store.ts

export interface VectorStore {
  // ... existing methods ...
  close(): void  // Add this
}

class HnswVectorStore implements VectorStore {
  // ... existing code ...

  close(): void {
    // hnswlib-node doesn't have an explicit close,
    // but setting to null allows GC
    this.index = null
    this.entries.clear()
    this.idToIndex.clear()
  }
}
```

### Fix 5: Alternative - Force Exit (Quick Fix)

If immediate resolution is needed without code changes:

```typescript
// In vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    forceExit: true,  // Force exit after tests complete
    // ... rest of config
  },
})
```

**Warning:** `forceExit` masks the underlying issue and may hide legitimate resource leaks.

## Test File Summary

| Test File | Uses tiktoken | Uses hnswlib | Spawns Processes |
|-----------|---------------|--------------|------------------|
| `cli.test.ts` | No (via execSync) | No (via execSync) | Yes |
| `parser.test.ts` | Indirect (via parse) | No | No |
| `searcher.test.ts` | Indirect (via index) | Possible | No |
| `tokens.test.ts` | Yes (direct) | No | No |
| `summarizer.test.ts` | Yes (via formatSummary) | No | No |
| `budget-bugs.test.ts` | Yes (via formatSummary) | No | No |
| `verify-bugs.test.ts` | Yes (direct) | No | No |
| `query-parser.test.ts` | No | No | No |
| `typo-suggester.test.ts` | No | No | No |
| `argv-preprocessor.test.ts` | No | No | No |

## Recommendation Priority

1. **High Priority:** Implement Fix 1 (encoder cleanup function) + Fix 2 (global teardown)
2. **Medium Priority:** Implement Fix 3 (pool configuration for better test isolation)
3. **Low Priority:** Implement Fix 4 (vector store cleanup) - only needed if embedding tests are added
4. **Not Recommended:** Fix 5 (forceExit) - masks issues

## Additional Notes

### searcher.test.ts Cleanup

The search test file has proper cleanup but could be improved:

```typescript
// Current - good
afterAll(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true })
})
```

Consider adding tiktoken cleanup here as well if running in isolation.

### Why Tests "Complete" Then Hang

The test assertions complete successfully, vitest reports all tests passed, but then waits for the event loop to drain. The tiktoken encoder holds a reference to WASM memory that prevents the event loop from exiting naturally.

## Testing the Fix

After implementing fixes, run:

```bash
# Should exit cleanly now
pnpm test

# Verify no hanging handles
node --detect-handle-leaks node_modules/.bin/vitest run
```
