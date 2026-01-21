/**
 * Vitest global setup - handles cleanup of native resources
 */

import { afterAll } from 'vitest'

afterAll(async () => {
  // Free tiktoken encoder to release WebAssembly resources
  // This prevents the test process from hanging after tests complete
  const { freeEncoder } = await import('./src/utils/tokens.js')
  freeEncoder()
})
