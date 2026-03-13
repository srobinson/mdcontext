import { describe, expect, it } from 'vitest'
import { batchTexts } from './batching.js'

describe('batchTexts', () => {
  it('splits by max text count when token budget allows', () => {
    const batches = batchTexts(['a', 'b', 'c', 'd', 'e'], {
      maxTextsPerBatch: 2,
      maxTokensPerBatch: 1_000,
    })

    expect(batches).toHaveLength(3)
    expect(batches.map((batch) => batch.texts)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e'],
    ])
  })

  it('splits by token budget before reaching max text count', () => {
    const largeText = 'a'.repeat(300_000)

    const batches = batchTexts(
      [largeText, largeText, largeText, largeText],
      {
        maxTextsPerBatch: 100,
        maxTokensPerBatch: 250_000,
      },
    )

    expect(batches).toHaveLength(2)
    expect(batches[0]?.texts).toHaveLength(2)
    expect(batches[1]?.texts).toHaveLength(2)
    expect(batches[0]?.estimatedTokens).toBeLessThanOrEqual(250_000)
    expect(batches[1]?.estimatedTokens).toBeLessThanOrEqual(250_000)
  })

  it('isolates a single oversized text in its own batch', () => {
    const hugeText = 'a'.repeat(900_000)

    const batches = batchTexts([hugeText, 'small'], {
      maxTextsPerBatch: 100,
      maxTokensPerBatch: 250_000,
    })

    expect(batches).toHaveLength(2)
    expect(batches[0]?.texts).toEqual([hugeText])
    expect(batches[1]?.texts).toEqual(['small'])
    expect(batches[0]?.estimatedTokens).toBeGreaterThan(250_000)
  })
})
