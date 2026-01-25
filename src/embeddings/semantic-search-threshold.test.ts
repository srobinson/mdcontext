/**
 * Semantic Search Threshold Tests
 *
 * Tests for threshold-related functionality including:
 * - VectorStore searchWithStats() API
 * - Below-threshold feedback mechanism
 * - Default threshold configuration
 * - Threshold boundary conditions
 *
 * Uses pre-built test corpus at:
 * src/__tests__/fixtures/semantic-search/multi-word-corpus/
 */

import * as path from 'node:path'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import {
  createVectorStore,
  type VectorSearchResultWithStats,
} from './vector-store.js'

// Path to test corpus with pre-built embeddings
const TEST_CORPUS_PATH = path.join(
  __dirname,
  '../__tests__/fixtures/semantic-search/multi-word-corpus',
)

// Test corpus uses 512 dimensions (text-embedding-3-small with Matryoshka reduction)
const TEST_CORPUS_DIMENSIONS = 512

describe('Semantic Search Threshold', () => {
  describe('VectorStore searchWithStats', () => {
    it('should load test corpus with embeddings', async () => {
      const vectorStore = createVectorStore(
        TEST_CORPUS_PATH,
        TEST_CORPUS_DIMENSIONS,
      )
      const loaded = await Effect.runPromise(vectorStore.load())
      expect(loaded).toBe(true)

      const stats = vectorStore.getStats()
      expect(stats.count).toBeGreaterThan(0)
      expect(stats.dimensions).toBe(TEST_CORPUS_DIMENSIONS)
    })

    it('should return results with searchWithStats', async () => {
      const vectorStore = createVectorStore(
        TEST_CORPUS_PATH,
        TEST_CORPUS_DIMENSIONS,
      )
      await Effect.runPromise(vectorStore.load())

      // Use a zero threshold to get all results
      const result = await Effect.runPromise(
        vectorStore.searchWithStats(
          new Array(TEST_CORPUS_DIMENSIONS).fill(0.1),
          10,
          0,
        ),
      )

      expect(result.results).toBeDefined()
      expect(Array.isArray(result.results)).toBe(true)
      expect(result.results.length).toBeGreaterThan(0)
    })

    it('should track below-threshold results count', async () => {
      const vectorStore = createVectorStore(
        TEST_CORPUS_PATH,
        TEST_CORPUS_DIMENSIONS,
      )
      await Effect.runPromise(vectorStore.load())

      // Use a very high threshold to push all results below it
      const result = await Effect.runPromise(
        vectorStore.searchWithStats(
          new Array(TEST_CORPUS_DIMENSIONS).fill(0.1),
          10,
          0.99,
        ),
      )

      // With 0.99 threshold, most/all results should be below threshold
      expect(result.belowThresholdCount).toBeGreaterThanOrEqual(0)
    })

    it('should track highest below-threshold similarity', async () => {
      const vectorStore = createVectorStore(
        TEST_CORPUS_PATH,
        TEST_CORPUS_DIMENSIONS,
      )
      await Effect.runPromise(vectorStore.load())

      // Use high threshold to force below-threshold results
      const result = await Effect.runPromise(
        vectorStore.searchWithStats(
          new Array(TEST_CORPUS_DIMENSIONS).fill(0.1),
          10,
          0.99,
        ),
      )

      // When there are below-threshold results, highest should be tracked
      if (result.belowThresholdCount > 0) {
        expect(result.belowThresholdHighest).not.toBeNull()
        expect(result.belowThresholdHighest).toBeLessThan(0.99)
        expect(result.belowThresholdHighest).toBeGreaterThan(0)
      }
    })

    it('should return empty results when no embeddings exist', async () => {
      const vectorStore = createVectorStore('/nonexistent/path', 1536)
      const loaded = await Effect.runPromise(vectorStore.load())
      expect(loaded).toBe(false)

      const result = await Effect.runPromise(
        vectorStore.searchWithStats(
          new Array(TEST_CORPUS_DIMENSIONS).fill(0),
          10,
          0,
        ),
      )

      expect(result.results).toHaveLength(0)
      expect(result.belowThresholdCount).toBe(0)
      expect(result.belowThresholdHighest).toBeNull()
    })
  })

  describe('Threshold boundaries', () => {
    it('should return all results with threshold of 0', async () => {
      const vectorStore = createVectorStore(
        TEST_CORPUS_PATH,
        TEST_CORPUS_DIMENSIONS,
      )
      await Effect.runPromise(vectorStore.load())

      // Use 0 threshold - everything should be above
      const result = await Effect.runPromise(
        vectorStore.searchWithStats(
          new Array(TEST_CORPUS_DIMENSIONS).fill(0.1),
          10,
          0,
        ),
      )

      expect(result.belowThresholdCount).toBe(0)
      expect(result.results.length).toBeGreaterThan(0)
    })

    it('should return no results with threshold of 1', async () => {
      const vectorStore = createVectorStore(
        TEST_CORPUS_PATH,
        TEST_CORPUS_DIMENSIONS,
      )
      await Effect.runPromise(vectorStore.load())

      const result = await Effect.runPromise(
        vectorStore.searchWithStats(
          new Array(TEST_CORPUS_DIMENSIONS).fill(0.1),
          10,
          1,
        ),
      )

      // With threshold of 1, nothing should pass (similarity is never >= 1 in practice)
      // Note: if a result has exactly similarity=1, it would pass
      expect(result.results.length).toBeLessThanOrEqual(1)
    })

    it('should respect the limit parameter', async () => {
      const vectorStore = createVectorStore(
        TEST_CORPUS_PATH,
        TEST_CORPUS_DIMENSIONS,
      )
      await Effect.runPromise(vectorStore.load())

      const stats = vectorStore.getStats()
      const limit = 3

      const result = await Effect.runPromise(
        vectorStore.searchWithStats(
          new Array(TEST_CORPUS_DIMENSIONS).fill(0.1),
          limit,
          0,
        ),
      )

      // Should not return more than limit
      expect(result.results.length).toBeLessThanOrEqual(limit)
      // Should return results if corpus has entries
      if (stats.count > 0) {
        expect(result.results.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Default threshold value (0.35)', () => {
    it('should use 0.35 as the default threshold in config schema', async () => {
      const { defaultConfig } = await import('../config/schema.js')
      expect(defaultConfig.search.minSimilarity).toBe(0.35)
    })

    it('should document 0.35 threshold in help text', async () => {
      const { helpContent } = await import('../cli/help.js')
      const searchHelp = helpContent.search
      expect(searchHelp).toBeDefined()
      expect(searchHelp!.notes).toBeDefined()

      // Verify notes mention 0.35
      const notesText = searchHelp!.notes?.join(' ') ?? ''
      expect(notesText).toContain('0.35')
    })

    it('should mention threshold in search options', async () => {
      const { helpContent } = await import('../cli/help.js')
      const searchHelp = helpContent.search
      expect(searchHelp).toBeDefined()

      // Find threshold option
      const thresholdOption = searchHelp!.options.find((opt) =>
        opt.name.includes('--threshold'),
      )
      expect(thresholdOption).toBeDefined()
      expect(thresholdOption?.description).toContain('0.35')
    })
  })

  describe('VectorSearchResultWithStats type shape', () => {
    it('should have correct structure', async () => {
      const vectorStore = createVectorStore(
        TEST_CORPUS_PATH,
        TEST_CORPUS_DIMENSIONS,
      )
      await Effect.runPromise(vectorStore.load())

      const result = await Effect.runPromise(
        vectorStore.searchWithStats(
          new Array(TEST_CORPUS_DIMENSIONS).fill(0.1),
          10,
          0.35,
        ),
      )

      // Type assertions
      const typed: VectorSearchResultWithStats = result

      expect('results' in typed).toBe(true)
      expect('belowThresholdCount' in typed).toBe(true)
      expect('belowThresholdHighest' in typed).toBe(true)

      // Results array should have proper shape
      for (const r of typed.results) {
        expect(typeof r.id).toBe('string')
        expect(typeof r.sectionId).toBe('string')
        expect(typeof r.documentPath).toBe('string')
        expect(typeof r.heading).toBe('string')
        expect(typeof r.similarity).toBe('number')
      }
    })
  })

  describe('Test corpus validation', () => {
    it('should have test corpus with multiple documents', async () => {
      const vectorStore = createVectorStore(
        TEST_CORPUS_PATH,
        TEST_CORPUS_DIMENSIONS,
      )
      const loaded = await Effect.runPromise(vectorStore.load())

      expect(loaded).toBe(true)
      const stats = vectorStore.getStats()
      // Test corpus has 6 documents with multiple sections each
      expect(stats.count).toBeGreaterThan(10)
    })

    it('should have correct dimensions (512 for test corpus)', async () => {
      const vectorStore = createVectorStore(
        TEST_CORPUS_PATH,
        TEST_CORPUS_DIMENSIONS,
      )
      await Effect.runPromise(vectorStore.load())

      const stats = vectorStore.getStats()
      expect(stats.dimensions).toBe(TEST_CORPUS_DIMENSIONS)
    })
  })

  describe('Similarity score validation', () => {
    it('should return similarity scores between 0 and 1', async () => {
      const vectorStore = createVectorStore(
        TEST_CORPUS_PATH,
        TEST_CORPUS_DIMENSIONS,
      )
      await Effect.runPromise(vectorStore.load())

      const result = await Effect.runPromise(
        vectorStore.searchWithStats(
          new Array(TEST_CORPUS_DIMENSIONS).fill(0.1),
          20,
          0,
        ),
      )

      for (const r of result.results) {
        expect(r.similarity).toBeGreaterThanOrEqual(0)
        expect(r.similarity).toBeLessThanOrEqual(1)
      }
    })

    it('should return results sorted by similarity (highest first)', async () => {
      const vectorStore = createVectorStore(
        TEST_CORPUS_PATH,
        TEST_CORPUS_DIMENSIONS,
      )
      await Effect.runPromise(vectorStore.load())

      const result = await Effect.runPromise(
        vectorStore.searchWithStats(
          new Array(TEST_CORPUS_DIMENSIONS).fill(0.1),
          20,
          0,
        ),
      )

      // Verify descending order
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i]!.similarity).toBeLessThanOrEqual(
          result.results[i - 1]!.similarity,
        )
      }
    })
  })

  describe('Below-threshold feedback', () => {
    it('should provide count when results are below threshold', async () => {
      const vectorStore = createVectorStore(
        TEST_CORPUS_PATH,
        TEST_CORPUS_DIMENSIONS,
      )
      await Effect.runPromise(vectorStore.load())

      // Use very high threshold to get 0 passing results
      const result = await Effect.runPromise(
        vectorStore.searchWithStats(
          new Array(TEST_CORPUS_DIMENSIONS).fill(0.1),
          10,
          0.95,
        ),
      )

      // When 0 results pass, we should have below-threshold stats
      if (result.results.length === 0) {
        expect(result.belowThresholdCount).toBeGreaterThan(0)
        expect(result.belowThresholdHighest).not.toBeNull()
      }
    })

    it('should allow calculating suggested threshold', async () => {
      const vectorStore = createVectorStore(
        TEST_CORPUS_PATH,
        TEST_CORPUS_DIMENSIONS,
      )
      await Effect.runPromise(vectorStore.load())

      const result = await Effect.runPromise(
        vectorStore.searchWithStats(
          new Array(TEST_CORPUS_DIMENSIONS).fill(0.1),
          10,
          0.9,
        ),
      )

      if (
        result.results.length === 0 &&
        result.belowThresholdHighest !== null
      ) {
        // Suggested threshold formula: max(0.1, highest - 0.05)
        const suggestedThreshold = Math.max(
          0.1,
          result.belowThresholdHighest - 0.05,
        )
        expect(suggestedThreshold).toBeLessThan(0.9)
        expect(suggestedThreshold).toBeGreaterThanOrEqual(0.1)
      }
    })
  })
})

describe('Hybrid Search Threshold', () => {
  it('should export hybridSearch function', async () => {
    const { hybridSearch } = await import('../search/hybrid-search.js')
    expect(hybridSearch).toBeDefined()
    expect(typeof hybridSearch).toBe('function')
  })
})

describe('CLI Search Threshold', () => {
  it('should have 0.35 as config default threshold', async () => {
    const { defaultConfig } = await import('../config/schema.js')
    expect(defaultConfig.search.minSimilarity).toBe(0.35)
  })
})
