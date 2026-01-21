# Test Setup Recommendations: CLI E2E Tests

## Current Problem

The CLI E2E tests in `src/cli/cli.test.ts` require `mdcontext index docs/` to be run manually before tests will pass. This creates several issues:

1. **CI/CD Failures**: Fresh clones fail tests without pre-indexing
2. **Developer Friction**: New contributors must discover and run the index command
3. **Inconsistent State**: Index state varies between developer machines
4. **Hidden Dependency**: Test file doesn't declare its prerequisites

## Analysis of Current Test Structure

The test file (`src/cli/cli.test.ts`) runs actual CLI commands against `./docs`:

```typescript
const TEST_DIR = './docs'
const CLI = 'pnpm mdcontext'

const run = (args: string, options: { cwd?: string; expectError?: boolean } = {}): string => {
  const cwd = options.cwd ?? TEST_DIR
  execSync(`${CLI} ${args}`, { cwd, encoding: 'utf-8' })
}
```

**Commands that require an index:**
- `search` - Needs document/section index; semantic search needs embeddings
- `stats` - Reads index statistics
- `links` / `backlinks` - Reads link index

**Commands that work without an index:**
- `--version`, `--help`, subcommand `--help`
- `tree` - Parses files directly
- `context` - Parses files directly

## Recommended Solution: Hybrid Approach

Use a combination of a minimal test fixture with `beforeAll` index building.

### Implementation

#### 1. Create Minimal Test Fixture

Create `tests/fixtures/cli/` with 2-3 tiny markdown files (~100 tokens total):

```
tests/fixtures/cli/
  README.md       (~30 tokens)
  getting-started.md  (~40 tokens)
  api-reference.md    (~30 tokens)
```

**Benefits:**
- Index builds in <100ms
- Deterministic content for assertions
- Small enough to commit the fixture files (not the index)

#### 2. Add `beforeAll` Hook

```typescript
// src/cli/cli.test.ts
import { execSync } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const TEST_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'cli')
const CLI = 'pnpm mdcontext'

describe('mdcontext CLI e2e', () => {
  beforeAll(async () => {
    // Ensure test fixture exists
    const fixtureExists = await fs.stat(TEST_DIR).catch(() => null)
    if (!fixtureExists) {
      throw new Error(`Test fixture directory not found: ${TEST_DIR}`)
    }

    // Build index (fast with minimal fixture)
    execSync(`${CLI} index ${TEST_DIR}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
  })

  afterAll(async () => {
    // Clean up generated index
    const indexDir = path.join(TEST_DIR, '.mdcontext')
    await fs.rm(indexDir, { recursive: true, force: true })
  })

  // ... tests
})
```

#### 3. Update Test Assertions for Deterministic Content

Replace dynamic assertions with fixture-specific ones:

```typescript
// Before (relies on docs/ content)
it('performs search by default', () => {
  const output = run('search "memory" docs/')
  expect(output).toContain('Results:')
})

// After (uses known fixture content)
it('performs keyword search', () => {
  const output = run(`search "getting started" ${TEST_DIR}`)
  expect(output).toContain('getting-started.md')
  expect(output).toContain('Results:')
})
```

### Test Fixture Files

Create these minimal markdown files:

**`tests/fixtures/cli/README.md`:**
```markdown
# Test Project

Welcome to the test project for CLI e2e tests.

## Overview

This fixture provides deterministic content for testing.

See [Getting Started](./getting-started.md) for more info.
```

**`tests/fixtures/cli/getting-started.md`:**
```markdown
# Getting Started

Quick guide to using the test fixture.

## Installation

Run the install command to get started.

## Usage

Basic usage examples for testing search.
```

**`tests/fixtures/cli/api-reference.md`:**
```markdown
# API Reference

Technical documentation for API endpoints.

## Endpoints

List of available endpoints for testing.

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/v1  | GET    | Main entry  |
```

### Directory Structure

```
tests/
  fixtures/
    cli/                    # CLI e2e test fixture
      README.md
      getting-started.md
      api-reference.md
    search/                 # Existing searcher unit test fixture (created at runtime)
```

## Alternative Approaches Considered

### Option A: Pre-built Index Committed to Repo

**Approach:** Commit `.mdcontext/` folder with test fixtures.

**Pros:**
- Zero setup time in tests
- Consistent across all environments

**Cons:**
- Index files contain absolute paths (`rootPath` field)
- Binary embedding files (.hnsw) are large and non-portable
- Index must be regenerated when format changes
- Violates `.gitignore` pattern for `.mdcontext/`

**Verdict:** Not recommended due to path portability issues.

### Option B: Mock the Index for E2E Tests

**Approach:** Mock `loadDocumentIndex`, `loadSectionIndex`, etc.

**Pros:**
- Fast, no actual index needed
- Full control over test data

**Cons:**
- Defeats purpose of E2E tests
- Doesn't test actual index loading code
- Mocks can drift from real implementation

**Verdict:** Not recommended for E2E tests; appropriate for unit tests only.

### Option C: Use Real `docs/` with `beforeAll`

**Approach:** Keep using `docs/` but add index building in `beforeAll`.

**Pros:**
- No fixture creation needed
- Tests against real documentation

**Cons:**
- `docs/` is large (~170k tokens across sections)
- Index build takes 2-5 seconds
- Test assertions depend on evolving docs content
- Semantic search tests would need API keys (expensive)

**Verdict:** Acceptable fallback if minimal fixture is too much work.

### Option D: globalSetup in vitest.config.ts

**Approach:** Use Vitest's `globalSetup` to build index before any tests run.

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globalSetup: './tests/setup.ts',
  },
})

// tests/setup.ts
export async function setup() {
  execSync('pnpm mdcontext index tests/fixtures/cli')
}

export async function teardown() {
  await fs.rm('tests/fixtures/cli/.mdcontext', { recursive: true, force: true })
}
```

**Pros:**
- Runs once for all test files
- Cleaner than per-file `beforeAll`

**Cons:**
- Overkill when only one test file needs it
- Less obvious dependency for readers of cli.test.ts

**Verdict:** Consider if more test files need indexes.

## Implementation Checklist

1. [ ] Create `tests/fixtures/cli/` directory
2. [ ] Add minimal markdown files (README.md, getting-started.md, api-reference.md)
3. [ ] Update `src/cli/cli.test.ts`:
   - Add `beforeAll` hook to build index
   - Add `afterAll` hook to clean up index
   - Update `TEST_DIR` to use fixture path
   - Update assertions to use deterministic fixture content
4. [ ] Update tests that use `docs/` paths to use `TEST_DIR` variable
5. [ ] Verify tests pass on fresh clone without manual index step
6. [ ] Update CI workflow if needed (should work automatically)

## Test Categories

### Tests That Need Index (use fixture)

- `search command` tests
- `stats command` tests
- `links command` tests
- `backlinks command` tests

### Tests That Don't Need Index (can use any path)

- `--version` test
- `--help` tests
- `subcommand --help` tests
- `tree command` tests (parses files directly)
- `context command` tests (parses files directly)
- `error handling` tests
- `unknown flag handling` tests

Consider splitting these into separate describe blocks for clarity.

## Semantic Search Considerations

The current tests include semantic search tests:

```typescript
it('auto-creates embeddings when forcing semantic without them', () => {
  const output = run('search --mode semantic "memory" docs/')
  expect(output).toContain('[semantic]')
})
```

**Problem:** This test requires:
1. An OpenAI API key (`OPENAI_API_KEY`)
2. Actual API calls (slow, costs money)

**Recommendations:**

1. **Skip in CI by default:**
   ```typescript
   it.skipIf(!process.env.OPENAI_API_KEY)('semantic search works', () => {
     // ...
   })
   ```

2. **Or mock the embeddings provider for E2E:**
   - Pre-generate embeddings for tiny fixture
   - Commit the embedding index (small for 3 files)
   - This tests the search flow without live API calls

3. **Or test semantic behavior separately:**
   - Have unit tests for semantic search with mocked embeddings
   - E2E tests only verify the CLI correctly invokes semantic search
   - Verify error message when no embeddings exist

## Example Updated Test File

```typescript
import { execSync } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const TEST_FIXTURE_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'cli')
const CLI = 'pnpm mdcontext'

const run = (
  args: string,
  options: { cwd?: string; expectError?: boolean } = {},
): string => {
  const cwd = options.cwd ?? TEST_FIXTURE_DIR
  try {
    return execSync(`${CLI} ${args}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch (error: unknown) {
    if (options.expectError) {
      const execError = error as { stderr?: string; stdout?: string }
      return execError.stderr || execError.stdout || ''
    }
    throw error
  }
}

describe('mdcontext CLI e2e', () => {
  beforeAll(async () => {
    // Build index for test fixture
    execSync(`${CLI} index ${TEST_FIXTURE_DIR}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
  })

  afterAll(async () => {
    // Clean up generated index
    const indexDir = path.join(TEST_FIXTURE_DIR, '.mdcontext')
    await fs.rm(indexDir, { recursive: true, force: true })
  })

  describe('--version', () => {
    it('shows version number', () => {
      const output = run('--version')
      expect(output).toMatch(/^\d+\.\d+\.\d+$/)
    })
  })

  describe('search command', () => {
    it('performs keyword search', () => {
      const output = run(`search -k "getting started"`)
      expect(output).toContain('[keyword]')
      expect(output).toContain('getting-started.md')
    })

    it('searches by heading', () => {
      const output = run(`search -k -H "API Reference"`)
      expect(output).toContain('api-reference.md')
    })
  })

  describe('links command', () => {
    it('shows outgoing links from file', () => {
      const output = run('links README.md')
      expect(output).toContain('Outgoing links')
      expect(output).toContain('getting-started.md')
    })
  })

  // ... more tests
})
```

## References

- [Vitest beforeAll documentation](https://vitest.dev/api/#beforeall)
- [Vitest globalSetup](https://vitest.dev/config/#globalsetup)
- Existing pattern in `src/search/searcher.test.ts` (creates fixture in beforeAll)
