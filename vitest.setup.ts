/**
 * Vitest global setup - handles cleanup of native resources.
 *
 * Note: do NOT import from `src/providers/` here. This setup file loads
 * before every test file in the process, including ones that use
 * `vi.mock('openai', ...)`. Importing the providers barrel transitively
 * loads the real `openai` module and breaks the mock hoisting. Tests
 * that need `registerDefaultProviders()` call it from their own
 * `beforeAll` hook so the provider imports happen inside the isolated
 * test-file context.
 */

import { afterAll } from 'vitest'

afterAll(async () => {
  // Free tiktoken encoder to release WebAssembly resources
  // This prevents the test process from hanging after tests complete
  const { freeEncoder } = await import('./src/utils/tokens.js')
  freeEncoder()
})
