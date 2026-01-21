/**
 * Semantic search functionality
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { Effect } from 'effect'
import {
  createStorage,
  loadDocumentIndex,
  loadSectionIndex,
} from '../index/storage.js'
import type { SectionEntry } from '../index/types.js'
import { createOpenAIProvider, InvalidApiKeyError } from './openai-provider.js'
import type {
  EmbeddingProvider,
  SemanticSearchOptions,
  SemanticSearchResult,
  VectorEntry,
} from './types.js'
import { createVectorStore, type HnswVectorStore } from './vector-store.js'

// ============================================================================
// Embedding Text Generation
// ============================================================================

const generateEmbeddingText = (
  section: SectionEntry,
  content: string,
  documentTitle: string,
  parentHeading?: string | undefined,
): string => {
  const parts: string[] = []

  parts.push(`# ${section.heading}`)
  if (parentHeading) {
    parts.push(`Parent section: ${parentHeading}`)
  }
  parts.push(`Document: ${documentTitle}`)
  parts.push('')
  parts.push(content)

  return parts.join('\n')
}

// ============================================================================
// Cost Estimation
// ============================================================================

// Price per 1M tokens for text-embedding-3-small
const EMBEDDING_PRICE_PER_MILLION = 0.02

export interface DirectoryEstimate {
  readonly directory: string
  readonly fileCount: number
  readonly sectionCount: number
  readonly estimatedTokens: number
  readonly estimatedCost: number
}

export interface EmbeddingEstimate {
  readonly totalFiles: number
  readonly totalSections: number
  readonly totalTokens: number
  readonly totalCost: number
  readonly estimatedTimeSeconds: number
  readonly byDirectory: readonly DirectoryEstimate[]
}

export const estimateEmbeddingCost = (
  rootPath: string,
  options: { excludePatterns?: readonly string[] | undefined } = {},
): Effect.Effect<EmbeddingEstimate, Error> =>
  Effect.gen(function* () {
    const resolvedRoot = path.resolve(rootPath)
    const storage = createStorage(resolvedRoot)

    const docIndex = yield* loadDocumentIndex(storage)
    const sectionIndex = yield* loadSectionIndex(storage)

    if (!docIndex || !sectionIndex) {
      return yield* Effect.fail(
        new Error("Index not found. Run 'mdcontext index' first."),
      )
    }

    // Group by directory
    const byDir: Map<
      string,
      { files: Set<string>; sections: number; tokens: number }
    > = new Map()

    for (const section of Object.values(sectionIndex.sections)) {
      // Skip very short sections (< 10 tokens)
      if (section.tokenCount < 10) continue

      // Check exclude patterns
      if (options.excludePatterns?.length) {
        const excluded = options.excludePatterns.some((pattern) => {
          const regex = new RegExp(
            `^${pattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
          )
          return regex.test(section.documentPath)
        })
        if (excluded) continue
      }

      const dir = path.dirname(section.documentPath) || '.'
      if (!byDir.has(dir)) {
        byDir.set(dir, { files: new Set(), sections: 0, tokens: 0 })
      }
      const entry = byDir.get(dir)!
      entry.files.add(section.documentPath)
      entry.sections++
      entry.tokens += section.tokenCount
    }

    const directoryEstimates: DirectoryEstimate[] = []
    let totalFiles = 0
    let totalSections = 0
    let totalTokens = 0

    for (const [dir, data] of byDir) {
      directoryEstimates.push({
        directory: dir,
        fileCount: data.files.size,
        sectionCount: data.sections,
        estimatedTokens: data.tokens,
        estimatedCost: (data.tokens / 1_000_000) * EMBEDDING_PRICE_PER_MILLION,
      })
      totalFiles += data.files.size
      totalSections += data.sections
      totalTokens += data.tokens
    }

    // Sort by directory name
    directoryEstimates.sort((a, b) => a.directory.localeCompare(b.directory))

    // Estimate time: ~1.5s per 100 sections (API batch processing)
    const estimatedTimeSeconds = Math.ceil(totalSections / 100) * 1.5

    return {
      totalFiles,
      totalSections,
      totalTokens,
      totalCost: (totalTokens / 1_000_000) * EMBEDDING_PRICE_PER_MILLION,
      estimatedTimeSeconds,
      byDirectory: directoryEstimates,
    }
  })

// ============================================================================
// Build Embeddings
// ============================================================================

export interface FileProgress {
  readonly fileIndex: number
  readonly totalFiles: number
  readonly filePath: string
  readonly sectionCount: number
}

export interface BuildEmbeddingsOptions {
  readonly force?: boolean | undefined
  readonly provider?: EmbeddingProvider | undefined
  readonly excludePatterns?: readonly string[] | undefined
  readonly onFileProgress?: ((progress: FileProgress) => void) | undefined
}

export interface BuildEmbeddingsResult {
  readonly sectionsEmbedded: number
  readonly tokensUsed: number
  readonly cost: number
  readonly duration: number
  readonly filesProcessed: number
  readonly cacheHit?: boolean | undefined
  readonly existingVectors?: number | undefined
  readonly estimatedSavings?: number | undefined
}

export const buildEmbeddings = (
  rootPath: string,
  options: BuildEmbeddingsOptions = {},
): Effect.Effect<BuildEmbeddingsResult, Error> =>
  Effect.gen(function* () {
    const startTime = Date.now()
    const resolvedRoot = path.resolve(rootPath)
    const storage = createStorage(resolvedRoot)

    // Load indexes
    const docIndex = yield* loadDocumentIndex(storage)
    const sectionIndex = yield* loadSectionIndex(storage)

    if (!docIndex || !sectionIndex) {
      return yield* Effect.fail(
        new Error("Index not found. Run 'mdcontext index' first."),
      )
    }

    // Get or create provider (wrap in Effect.try to catch MissingApiKeyError)
    const provider =
      options.provider ??
      (yield* Effect.try({
        try: () => createOpenAIProvider(),
        catch: (e) => e as Error,
      }))
    const dimensions = provider.dimensions

    // Create vector store
    const vectorStore = createVectorStore(
      resolvedRoot,
      dimensions,
    ) as HnswVectorStore
    vectorStore.setProvider(provider.name)

    // Load existing if not forcing
    if (!options.force) {
      const loaded = yield* vectorStore.load()
      if (loaded) {
        const stats = vectorStore.getStats()
        // Skip if any embeddings exist
        if (stats.count > 0) {
          const duration = Date.now() - startTime
          // Estimate savings based on existing tokens
          const estimatedSavings =
            (stats.totalTokens / 1_000_000) * EMBEDDING_PRICE_PER_MILLION
          return {
            sectionsEmbedded: 0,
            tokensUsed: 0,
            cost: 0,
            duration,
            filesProcessed: 0,
            cacheHit: true,
            existingVectors: stats.count,
            estimatedSavings,
          }
        }
      }
    }

    // Helper to check if a path matches exclude patterns
    const isExcluded = (docPath: string): boolean => {
      if (!options.excludePatterns?.length) return false
      return options.excludePatterns.some((pattern) => {
        const regex = new RegExp(
          `^${pattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
        )
        return regex.test(docPath)
      })
    }

    // Group sections by document for efficient file reading
    const sectionsByDoc: Map<
      string,
      { section: SectionEntry; parentHeading: string | undefined }[]
    > = new Map()

    for (const section of Object.values(sectionIndex.sections)) {
      const document = docIndex.documents[section.documentPath]
      if (!document) continue

      // Skip very short sections (< 10 tokens)
      if (section.tokenCount < 10) continue

      // Check exclude patterns
      if (isExcluded(section.documentPath)) continue

      // Find parent heading if any
      let parentHeading: string | undefined
      if (section.level > 1) {
        const docSections = sectionIndex.byDocument[document.id] ?? []
        for (const sibId of docSections) {
          const sib = sectionIndex.sections[sibId]
          if (
            sib &&
            sib.level === section.level - 1 &&
            sib.startLine < section.startLine
          ) {
            parentHeading = sib.heading
          }
        }
      }

      const docPath = section.documentPath
      if (!sectionsByDoc.has(docPath)) {
        sectionsByDoc.set(docPath, [])
      }
      sectionsByDoc.get(docPath)!.push({ section, parentHeading })
    }

    if (sectionsByDoc.size === 0) {
      const duration = Date.now() - startTime
      return {
        sectionsEmbedded: 0,
        tokensUsed: 0,
        cost: 0,
        duration,
        filesProcessed: 0,
      }
    }

    // Prepare sections for embedding by reading file content
    const sectionsToEmbed: { section: SectionEntry; text: string }[] = []
    const docPaths = Array.from(sectionsByDoc.keys())
    let filesProcessed = 0

    for (let fileIndex = 0; fileIndex < docPaths.length; fileIndex++) {
      const docPath = docPaths[fileIndex]!
      const sections = sectionsByDoc.get(docPath)!
      const document = docIndex.documents[docPath]
      if (!document) continue

      // Report file progress
      if (options.onFileProgress) {
        options.onFileProgress({
          fileIndex: fileIndex + 1,
          totalFiles: docPaths.length,
          filePath: docPath,
          sectionCount: sections.length,
        })
      }

      const filePath = path.join(resolvedRoot, docPath)
      let fileContent: string
      try {
        fileContent = yield* Effect.promise(() =>
          fs.readFile(filePath, 'utf-8'),
        )
      } catch {
        // Skip files that can't be read
        continue
      }

      filesProcessed++
      const lines = fileContent.split('\n')

      for (const { section, parentHeading } of sections) {
        // Extract section content from file
        const content = lines
          .slice(section.startLine - 1, section.endLine)
          .join('\n')

        const text = generateEmbeddingText(
          section,
          content,
          document.title,
          parentHeading,
        )
        sectionsToEmbed.push({ section, text })
      }
    }

    if (sectionsToEmbed.length === 0) {
      const duration = Date.now() - startTime
      return {
        sectionsEmbedded: 0,
        tokensUsed: 0,
        cost: 0,
        duration,
        filesProcessed,
      }
    }

    // Generate embeddings
    const texts = sectionsToEmbed.map((s) => s.text)
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

    // Create vector entries
    const entries: VectorEntry[] = []
    for (let i = 0; i < sectionsToEmbed.length; i++) {
      const { section } = sectionsToEmbed[i] ?? { section: null }
      const embedding = result.embeddings[i]
      if (!section || !embedding) continue

      entries.push({
        id: section.id,
        sectionId: section.id,
        documentPath: section.documentPath,
        heading: section.heading,
        embedding,
      })
    }

    // Add to vector store
    yield* vectorStore.add(entries)
    vectorStore.addCost(result.cost, result.tokensUsed)

    // Save
    yield* vectorStore.save()

    const duration = Date.now() - startTime

    return {
      sectionsEmbedded: entries.length,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      duration,
      filesProcessed,
    }
  })

// ============================================================================
// Semantic Search
// ============================================================================

export const semanticSearch = (
  rootPath: string,
  query: string,
  options: SemanticSearchOptions = {},
): Effect.Effect<readonly SemanticSearchResult[], Error> =>
  Effect.gen(function* () {
    const resolvedRoot = path.resolve(rootPath)

    // Get provider for query embedding (wrap in Effect.try to catch MissingApiKeyError)
    const provider = yield* Effect.try({
      try: () => createOpenAIProvider(),
      catch: (e) => e as Error,
    })
    const dimensions = provider.dimensions

    // Load vector store
    const vectorStore = createVectorStore(resolvedRoot, dimensions)
    const loaded = yield* vectorStore.load()

    if (!loaded) {
      return yield* Effect.fail(
        new Error("Embeddings not found. Run 'mdcontext embed' first."),
      )
    }

    // Embed the query
    const queryResult = yield* Effect.tryPromise({
      try: () => provider.embed([query]),
      catch: (e) =>
        new Error(
          `Query embedding failed: ${e instanceof Error ? e.message : String(e)}`,
        ),
    })

    const queryVector = queryResult.embeddings[0]
    if (!queryVector) {
      return yield* Effect.fail(new Error('Failed to generate query embedding'))
    }

    // Search
    const limit = options.limit ?? 10
    const threshold = options.threshold ?? 0

    const searchResults = yield* vectorStore.search(
      queryVector,
      limit * 2,
      threshold,
    )

    // Apply path filter if specified
    let filteredResults = searchResults
    if (options.pathPattern) {
      const pattern = options.pathPattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
      const regex = new RegExp(`^${pattern}$`, 'i')
      filteredResults = searchResults.filter((r) => regex.test(r.documentPath))
    }

    // Convert to SemanticSearchResult
    const results: SemanticSearchResult[] = filteredResults
      .slice(0, limit)
      .map((r) => ({
        sectionId: r.sectionId,
        documentPath: r.documentPath,
        heading: r.heading,
        similarity: r.similarity,
      }))

    return results
  })

// ============================================================================
// Search with Content
// ============================================================================

export const semanticSearchWithContent = (
  rootPath: string,
  query: string,
  options: SemanticSearchOptions = {},
): Effect.Effect<readonly SemanticSearchResult[], Error> =>
  Effect.gen(function* () {
    const resolvedRoot = path.resolve(rootPath)
    const results = yield* semanticSearch(resolvedRoot, query, options)

    const storage = createStorage(resolvedRoot)
    const sectionIndex = yield* loadSectionIndex(storage)

    if (!sectionIndex) {
      return results
    }

    const resultsWithContent: SemanticSearchResult[] = []

    for (const result of results) {
      const section = sectionIndex.sections[result.sectionId]
      if (!section) {
        resultsWithContent.push(result)
        continue
      }

      const filePath = path.join(resolvedRoot, result.documentPath)

      try {
        const fileContent = yield* Effect.promise(() =>
          fs.readFile(filePath, 'utf-8'),
        )

        const lines = fileContent.split('\n')
        const content = lines
          .slice(section.startLine - 1, section.endLine)
          .join('\n')

        resultsWithContent.push({
          ...result,
          content,
        })
      } catch {
        resultsWithContent.push(result)
      }
    }

    return resultsWithContent
  })

// ============================================================================
// Get Embedding Stats
// ============================================================================

export interface EmbeddingStats {
  readonly hasEmbeddings: boolean
  readonly count: number
  readonly provider: string
  readonly dimensions: number
  readonly totalCost: number
  readonly totalTokens: number
}

export const getEmbeddingStats = (
  rootPath: string,
): Effect.Effect<EmbeddingStats, Error> =>
  Effect.gen(function* () {
    const resolvedRoot = path.resolve(rootPath)

    // Try to load with default dimensions
    const vectorStore = createVectorStore(resolvedRoot, 1536)
    const loaded = yield* vectorStore.load()

    if (!loaded) {
      return {
        hasEmbeddings: false,
        count: 0,
        provider: 'none',
        dimensions: 0,
        totalCost: 0,
        totalTokens: 0,
      }
    }

    const stats = vectorStore.getStats()
    return {
      hasEmbeddings: true,
      count: stats.count,
      provider: stats.provider,
      dimensions: stats.dimensions,
      totalCost: stats.totalCost,
      totalTokens: stats.totalTokens,
    }
  })
