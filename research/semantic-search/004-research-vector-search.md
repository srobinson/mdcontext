# Vector Search Research: Patterns and Techniques (2025-2026)

Research findings for improving md-tldr semantic search capabilities.

## Table of Contents

1. [Hybrid Search](#1-hybrid-search)
2. [Re-ranking Approaches](#2-re-ranking-approaches)
3. [Vector Index Alternatives](#3-vector-index-alternatives)
4. [Filtering and Metadata](#4-filtering-and-metadata)
5. [Emerging Patterns](#5-emerging-patterns-2025-2026)
6. [Quick Wins: HNSW Parameter Tuning](#6-quick-wins-hnsw-parameter-tuning)
7. [Top 3 Recommendations](#7-top-3-recommendations)
8. [Effort/Impact Analysis](#8-effortimpact-analysis)

---

## 1. Hybrid Search

Hybrid search combines sparse retrieval (BM25/keyword) with dense retrieval (vector embeddings) to leverage the strengths of both approaches.

### Why Hybrid Search?

| Approach             | Strengths                                                                                                 | Weaknesses                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Keyword (BM25)**   | Exact term matching, handles specific identifiers (e.g., "TS-01"), no vocabulary mismatch for known terms | Misses synonyms, semantic meaning, context      |
| **Semantic (Dense)** | Understands meaning, handles paraphrasing, conceptual similarity                                          | May miss exact terms, identifiers, proper nouns |
| **Hybrid**           | Best of both worlds: exact + semantic                                                                     | Added complexity, needs score fusion            |

**Key insight**: Pure embedding search may miss important exact matches. For example, searching for "TS-01" won't naturally retrieve documents mentioning that identifier because embeddings represent high-dimensional semantic space, not lexical matches.

### Fusion Techniques

#### Reciprocal Rank Fusion (RRF)

RRF is the most widely adopted fusion algorithm for hybrid search. It merges ranked lists without requiring score normalization.

**Formula**:

```
RRF_score(d) = Σ 1/(k + rank_i(d))
```

Where:

- `k` is a smoothing constant (typically 60)
- `rank_i(d)` is the document's rank in system i

**Advantages**:

- Score-agnostic: Works with incompatible scoring systems (cosine similarity 0-1 vs BM25 unbounded)
- Simple to implement
- No hyperparameter tuning for score scales
- Robust across different retrieval methods

**Performance**: Hybrid search with RRF consistently outperforms single-method retrieval by 10-15% in precision benchmarks.

#### Weighted RRF

Extends RRF with configurable weights per retrieval method:

```typescript
// Example configuration
const weights = {
  bm25: 1.0, // Full weight for lexical precision
  semantic: 0.7, // Slightly lower for semantic similarity
};
```

This allows emphasizing one method over another based on use case.

#### Linear Combination

Simpler fusion that combines normalized scores directly:

```typescript
finalScore = alpha * semanticScore + (1 - alpha) * bm25Score;
```

**Requires** score normalization to same scale. Less robust than RRF but faster.

### Implementation Options for Node.js

#### BM25 Libraries

| Library                     | Notes                                                        | NPM                     |
| --------------------------- | ------------------------------------------------------------ | ----------------------- |
| **wink-bm25-text-search**   | Full-featured, supports field weighting, ~100% test coverage | `wink-bm25-text-search` |
| **OkapiBM25**               | Simple, typed implementation, 111K downloads/year            | `okapi-bm25`            |
| **@langchain/community**    | BM25Retriever for LangChain pipelines                        | `@langchain/community`  |
| **winkNLP BM25 Vectorizer** | BM25 with configurable k1/b parameters                       | `wink-nlp`              |

**Recommendation**: `wink-bm25-text-search` for its reliability and semantic features (stemming, stop words, field boosting).

### Hybrid Search Implementation Pattern

```typescript
interface HybridSearchResult {
  sectionId: string;
  semanticRank?: number;
  bm25Rank?: number;
  rrfScore: number;
}

function hybridSearch(
  query: string,
  options: {
    semanticWeight?: number; // default 1.0
    bm25Weight?: number; // default 1.0
    k?: number; // RRF smoothing constant, default 60
    limit?: number;
  },
): HybridSearchResult[] {
  // 1. Run both searches in parallel
  const [semanticResults, bm25Results] = await Promise.all([
    semanticSearch(query, { limit: limit * 2 }),
    bm25Search(query, { limit: limit * 2 }),
  ]);

  // 2. Apply RRF fusion
  const scores = new Map<string, number>();

  semanticResults.forEach((r, i) => {
    const rank = i + 1;
    const score = (scores.get(r.sectionId) || 0) + semanticWeight / (k + rank);
    scores.set(r.sectionId, score);
  });

  bm25Results.forEach((r, i) => {
    const rank = i + 1;
    const score = (scores.get(r.sectionId) || 0) + bm25Weight / (k + rank);
    scores.set(r.sectionId, score);
  });

  // 3. Sort by RRF score and return top results
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => ({ sectionId: id, rrfScore: score }));
}
```

### When Hybrid Beats Pure Semantic

- **Exact term searches**: Product codes, error codes, API names
- **Proper nouns**: Names, brands, specific technologies
- **Technical documentation**: Where exact terminology matters
- **Short queries**: Single-word searches that need lexical grounding

---

## 2. Re-ranking Approaches

Re-ranking is a two-stage retrieval pattern: first retrieve candidates with a fast method, then re-rank top-N with a more accurate model.

### Why Re-ranking?

- **Bi-encoders (embedding models)** encode query and documents separately, enabling fast ANN search but missing cross-attention between query-document pairs
- **Cross-encoders** jointly encode query+document, capturing fine-grained relevance but too slow for full corpus search
- **Solution**: Use bi-encoder for retrieval, cross-encoder for re-ranking top candidates

### Cross-Encoder Models

#### MS-MARCO MiniLM (Recommended for md-tldr)

| Model                     | Parameters | Latency          | Use Case                   |
| ------------------------- | ---------- | ---------------- | -------------------------- |
| `ms-marco-MiniLM-L-6-v2`  | 22.7M      | 2-5ms/pair (CPU) | Fast, general purpose      |
| `ms-marco-MiniLM-L-12-v2` | 33M        | ~10ms/pair       | Better quality, still fast |
| `BGE-reranker-base`       | -          | -                | Multilingual support       |
| `BGE-reranker-large`      | -          | -                | Best quality, multilingual |

**Key stats**:

- Re-ranking typically improves RAG accuracy by 20-35%
- Adds 200-500ms latency (for top-20 re-ranking)
- Leading organizations see 30-50% improvements in retrieval precision

#### Performance Benefits (2025-2026 Production Data)

> "Three factors converge in 2026 to make reranking mainstream: open-source cross-encoder implementations have matured significantly, models like ms-marco-MiniLM-L-12-v2 deliver 95% of the performance of proprietary alternatives while running on commodity hardware."

### ColBERT: Late Interaction Models

ColBERT uses "late interaction" - encoding query and document separately but comparing at token level:

**Architecture**:

```
Query:    [q1, q2, q3, ...] → Token embeddings
Document: [d1, d2, d3, ...] → Token embeddings
Score:    MaxSim(Q, D) = Σ max(qi · dj)
```

**Advantages**:

- Better quality than bi-encoders
- Faster than cross-encoders (document embeddings can be precomputed)
- Storage-efficient with ColBERTv2 residual compression (6-10x smaller)

**Production Readiness (2025)**:

- Memory-mapped index storage (ColBERT-serve) reduces RAM by 90%+
- RAGatouille library provides easy Python integration
- Active research area (ECIR 2026 workshop on Late Interaction)

**For md-tldr**: ColBERT is likely overkill given the modest corpus size. Cross-encoders offer simpler integration with similar quality benefits.

### LLM-Based Re-ranking

Using language models to rank search results:

```typescript
// Example prompt
const prompt = `
Given the query: "${query}"

Rank these documents by relevance (most relevant first):
${documents.map((d, i) => `${i + 1}. ${d.title}: ${d.snippet}`).join("\n")}

Return only the numbers in ranked order.
`;
```

**Pros**: Highly accurate, understands nuance
**Cons**: Slow, expensive, adds LLM dependency

**Recommendation for md-tldr**: Not recommended. Cross-encoders provide good accuracy without LLM cost/latency.

### JavaScript/TypeScript Implementation Options

#### Option 1: Transformers.js (Browser + Node.js)

```typescript
import { pipeline } from "@xenova/transformers";

// Load cross-encoder for re-ranking
const reranker = await pipeline(
  "text-classification",
  "Xenova/ms-marco-MiniLM-L-6-v2",
);

// Score query-document pairs
const scores = await Promise.all(
  documents.map((doc) => reranker(`${query} [SEP] ${doc.content}`)),
);
```

**Pros**:

- Runs locally (no API calls)
- ONNX runtime + WebGPU acceleration available
- Works in browser and Node.js

**Cons**:

- Model download required (~80MB for MiniLM-L6)
- First load is slow
- Node.js ONNX setup can be tricky

#### Option 2: External Re-ranking API

Services like Cohere, Jina, or self-hosted endpoints.

```typescript
const response = await fetch("https://api.cohere.ai/v1/rerank", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    query,
    documents: docs.map((d) => d.content),
    top_n: 10,
    model: "rerank-english-v2.0",
  }),
});
```

**Pros**: Easy integration, no local model management
**Cons**: API cost, latency, dependency

### When to Use Re-ranking

| Use Case                       | Re-ranking Value |
| ------------------------------ | ---------------- |
| High-precision requirements    | High             |
| Long documents with dense info | High             |
| Ambiguous queries              | High             |
| Simple keyword searches        | Low              |
| Real-time autocomplete         | Low (latency)    |
| Very small result sets (<5)    | Low              |

**For md-tldr**: Medium-high value. Documentation search benefits from re-ranking because section embeddings may rank "close enough" results highly, and cross-encoders can distinguish subtle relevance differences.

---

## 3. Vector Index Alternatives

### HNSW (Current md-tldr Implementation)

**Strengths**:

- Near-instantaneous nearest neighbor retrieval
- Excellent recall and speed when data fits in RAM
- Incremental updates without rebuild
- Well-supported in Node.js (hnswlib-node)

**Weaknesses**:

- Entire graph must fit in memory
- Higher memory footprint per vector (graph structure overhead)

**Best for**: Mid-sized datasets (<10M vectors) with RAM budget

### IVF (Inverted File Index)

**Architecture**: Clusters vectors using k-means, searches only relevant clusters

**Strengths**:

- Lower memory than HNSW (loads clusters on-demand)
- Configurable recall/speed tradeoff via nprobe parameter
- IVF+PQ enables billion-scale on disk

**Weaknesses**:

- Accuracy depends on clustering quality
- Updates require re-clustering
- Cold queries may miss results if clusters are poor

**Best for**: Large static datasets, memory-constrained environments

### DiskANN

**Architecture**: Vamana graph + product quantization for SSD storage

**Strengths**:

- Handles datasets larger than RAM
- Stable latency with beam search and caching
- Good for dynamic datasets

**Weaknesses**:

- IOPS bottlenecks possible
- Base DiskANN is immutable (FreshDiskANN adds updates)
- More complex setup

**Best for**: Large datasets (10M+) where ~25% fits in RAM

### Comparison Summary

| Index       | Memory | Speed   | Updates | Best Scale   |
| ----------- | ------ | ------- | ------- | ------------ |
| **HNSW**    | High   | Fastest | Easy    | <10M vectors |
| **IVF**     | Medium | Fast    | Rebuild | 10M-100M     |
| **DiskANN** | Low    | Good    | Limited | 100M+        |

### Node.js Library Options

| Library                  | Index Types   | Notes                                         |
| ------------------------ | ------------- | --------------------------------------------- |
| **hnswlib-node**         | HNSW only     | Mature, reliable, current md-tldr choice      |
| **faiss-node**           | IVF, HNSW, PQ | Facebook's FAISS bindings, more index options |
| **LangChain FaissStore** | FAISS-backed  | Higher-level API, LangChain ecosystem         |
| **hnswsqlite**           | HNSW + SQLite | Persistence with metadata                     |

**Recommendation for md-tldr**: Stay with hnswlib-node. Documentation corpora are typically <100K sections, well within HNSW's sweet spot. The complexity of FAISS isn't warranted.

---

## 4. Filtering and Metadata

### The Filtering Challenge

Vector search filtering is non-trivial because ANN indexes like HNSW optimize for similarity, not attribute filtering.

### Three Strategies

#### Pre-Filtering (Filter-Then-Search)

1. Apply metadata filter (e.g., `path LIKE 'docs/api/%'`)
2. Run ANN search on filtered subset

**Pros**:

- Accurate results (only searches valid candidates)
- Works well for low-cardinality filters

**Cons**:

- **Breaks HNSW graph connectivity** when filter is highly selective
- May require brute-force search on small filtered sets
- Significant recall drop when <10% vectors remain

#### Post-Filtering (Search-Then-Filter)

1. Run ANN search for k\*N candidates
2. Apply metadata filter
3. Return top k that pass filter

**Pros**:

- Predictable latency
- HNSW graph stays intact

**Cons**:

- May return fewer than k results
- Wastes computation on filtered-out results
- Poor recall with selective filters

#### Integrated Filtering (In-Algorithm)

Modern vector databases modify the search algorithm to be filter-aware:

- **Weaviate ACORN**: Two-hop graph expansion for filtered search
- **Qdrant**: Pre-filtering with automatic fallback to payload index
- **Pinecone**: Merged metadata and vector indexes

**Performance**: Engines with integrated filtering maintain recall and often get _faster_ with filters (less work to do).

### Current md-tldr Filtering

From `current-implementation.md`:

- Only path pattern filtering supported (`pathPattern` option)
- Implemented as post-filtering

### Recommended Approach for md-tldr

Given typical documentation corpus sizes (<100K sections), a pragmatic hybrid approach:

```typescript
interface FilteredSearchOptions {
  pathPattern?: string;
  documentTypes?: string[];
  minTokens?: number;
  // Future: tags, dates, etc.
}

async function filteredSearch(query: string, options: FilteredSearchOptions) {
  // 1. Estimate filter selectivity
  const totalDocs = await getDocumentCount();
  const filteredCount = await estimateFilteredCount(options);
  const selectivity = filteredCount / totalDocs;

  if (selectivity < 0.1) {
    // Highly selective: brute-force on filtered set
    const candidates = await getFilteredSections(options);
    return bruteForceSearch(query, candidates);
  } else if (selectivity < 0.5) {
    // Medium selectivity: over-fetch then filter
    const results = await semanticSearch(query, { limit: limit * 3 });
    return applyFilters(results, options).slice(0, limit);
  } else {
    // Low selectivity: standard search with post-filter
    const results = await semanticSearch(query, { limit: limit * 1.5 });
    return applyFilters(results, options).slice(0, limit);
  }
}
```

### Metadata to Consider

| Metadata       | Use Case                           |
| -------------- | ---------------------------------- |
| `documentPath` | Filter by directory/file           |
| `documentType` | Filter API docs, guides, tutorials |
| `lastModified` | Prefer recent content              |
| `tokens`       | Filter by content length           |
| `headingLevel` | Prefer top-level sections          |
| `tags`         | Custom categorization              |

---

## 5. Emerging Patterns (2025-2026)

### Learned Sparse Retrieval (SPLADE)

**What it is**: Neural models that produce sparse vectors with semantic term expansion.

**How it works**:

- Encodes text into sparse vector where dimensions = vocabulary terms
- Activates semantically related terms (e.g., "study" also activates "learn", "research")
- Compatible with inverted indexes like BM25

**SPLADE vs BM25**:

| Aspect              | BM25              | SPLADE                       |
| ------------------- | ----------------- | ---------------------------- |
| Vocabulary mismatch | Critical weakness | Solved via expansion         |
| Latency             | Baseline          | Similar (with optimizations) |
| Quality             | Good              | Better in-domain             |
| Index compatibility | Inverted index    | Inverted index               |

**2025 Status**:

- SPLADE efficiency now matches BM25 (<4ms difference)
- Best results with hybrid sparse+dense approaches
- New pruning techniques (Superblock Pruning) up to 16x faster

**For md-tldr**: Interesting but adds complexity. BM25 + semantic hybrid likely sufficient.

### Query Expansion with HyDE

**Hypothetical Document Embeddings (HyDE)**:

1. User submits query
2. LLM generates hypothetical answer document
3. Embed the hypothetical document (not the query)
4. Search for real documents similar to the hypothetical

**Why it works**: Compares document-to-document rather than question-to-document, bridging the semantic gap.

**Implementation**:

```typescript
async function hydeSearch(query: string) {
  // 1. Generate hypothetical document
  const hypothetical = await llm.generate(
    `Write a detailed paragraph that would answer: "${query}"`,
  );

  // 2. Embed hypothetical (or average multiple)
  const embedding = await embed(hypothetical);

  // 3. Search with hypothetical embedding
  return vectorStore.search(embedding);
}
```

**Benefits**:

- 10-30% retrieval improvement on ambiguous queries
- Zero-shot (no training required)
- Domain adaptable

**Limitations**:

- Requires LLM call (cost, latency)
- Works poorly if LLM has no domain knowledge
- May hallucinate misleading hypotheticals

**For md-tldr**: Good option for complex queries, could be opt-in feature.

### GraphRAG

Combines vector search with knowledge graphs:

- Entities and relationships extracted from documents
- Queries traverse both vector space and graph
- Claims 99% precision in some benchmarks

**For md-tldr**: Overkill for documentation search. More relevant for enterprise knowledge bases.

### Long-Context RAG

Processing longer retrieval units (sections, documents) rather than small chunks.

**Benefits**:

- Preserves context
- Reduces fragmentation
- Better for coherent understanding

**md-tldr alignment**: Already uses section-level granularity, well-aligned with this trend.

### Self-RAG

Self-reflective retrieval that:

1. Decides when to retrieve
2. Evaluates retrieval quality
3. Critiques generated outputs

**For md-tldr**: Beyond current scope, more relevant for RAG pipelines with generation.

---

## 6. Quick Wins: HNSW Parameter Tuning

Current md-tldr parameters (from `current-implementation.md`):

```typescript
M: 16; // Max connections per node
efConstruction: 200; // Construction-time search width
efSearch: 100; // Query-time search width (implicit)
```

### Parameter Effects

| Parameter          | Increase Effect                           | Decrease Effect                           |
| ------------------ | ----------------------------------------- | ----------------------------------------- |
| **M**              | Better recall, larger index, slower build | Faster build, smaller index, lower recall |
| **efConstruction** | Better graph quality, slower build        | Faster build, potentially lower recall    |
| **efSearch**       | Better recall, slower queries             | Faster queries, lower recall              |

### Recommended Tuning

For documentation search (~1K-100K sections):

#### Option A: Balanced (Current)

```typescript
M: 16;
efConstruction: 200;
efSearch: 100; // Consider increasing
```

Good balance, may benefit from higher efSearch.

#### Option B: Quality-Focused

```typescript
M: 24; // More connections
efConstruction: 256; // Better graph
efSearch: 200; // More thorough search
```

~30% more memory, ~95%+ recall, slightly slower build.

#### Option C: Speed-Focused

```typescript
M: 12;
efConstruction: 128;
efSearch: 64;
```

Faster builds and queries, ~85-90% recall.

### Quick Win: Dynamic efSearch

Since efSearch can be set at query time:

```typescript
function search(
  query: string,
  options: { quality?: "fast" | "balanced" | "thorough" },
) {
  const efSearch = {
    fast: 64,
    balanced: 100,
    thorough: 256,
  }[options.quality ?? "balanced"];

  return vectorStore.search(queryEmbedding, { efSearch });
}
```

### Validation Approach

1. Create ground-truth test set (10-20 queries with known relevant sections)
2. Measure recall@k for different parameters
3. Measure query latency
4. Choose based on recall/latency tradeoff

---

## 7. Top 3 Recommendations

### Recommendation 1: Hybrid Search with RRF

**What**: Add BM25 keyword search alongside semantic search, fuse results with Reciprocal Rank Fusion.

**Why**:

- Handles exact term matching (API names, error codes)
- 10-15% precision improvement in benchmarks
- Low implementation complexity
- Falls back gracefully (if one method fails, other still works)

**Implementation**:

1. Add `wink-bm25-text-search` dependency
2. Build BM25 index during embedding build (uses same section content)
3. Add `--mode hybrid` option to search command
4. Implement RRF fusion (~50 lines of code)

**Effort**: Medium (2-3 days)
**Impact**: High

### Recommendation 2: Cross-Encoder Re-ranking

**What**: Re-rank top-20 semantic search results using ms-marco-MiniLM-L-6-v2 cross-encoder.

**Why**:

- 20-35% accuracy improvement
- Catches relevant results that rank lower in embedding space
- Can be opt-in (--rerank flag) to avoid latency when not needed
- Modern cross-encoders are fast (2-5ms per pair)

**Implementation**:

1. Add Transformers.js dependency or use API (Cohere/Jina)
2. Load cross-encoder model on first rerank request
3. Score top-N candidates
4. Re-sort by cross-encoder score

**Effort**: Medium (2-3 days for Transformers.js, 1 day for API)
**Impact**: High

### Recommendation 3: HNSW Parameter Optimization

**What**: Tune HNSW parameters based on corpus size and add dynamic efSearch.

**Why**:

- Zero dependency changes
- Immediate quality/speed improvements
- Low risk

**Implementation**:

1. Add config options for M, efConstruction
2. Implement dynamic efSearch (fast/balanced/thorough)
3. Add `--quality` flag to search command
4. Consider auto-tuning based on corpus size

**Effort**: Low (1 day)
**Impact**: Medium

---

## 8. Effort/Impact Analysis

### Summary Matrix

| Improvement                  | Effort        | Impact     | Risk     | Priority |
| ---------------------------- | ------------- | ---------- | -------- | -------- |
| **HNSW parameter tuning**    | Low (1d)      | Medium     | Very Low | P0       |
| **Hybrid search (BM25+RRF)** | Medium (2-3d) | High       | Low      | P1       |
| **Cross-encoder re-ranking** | Medium (2-3d) | High       | Medium   | P1       |
| **Dynamic efSearch**         | Low (0.5d)    | Low-Medium | Very Low | P0       |
| **HyDE query expansion**     | Medium (2d)   | Medium     | Medium   | P2       |
| **Enhanced filtering**       | Medium (2d)   | Medium     | Low      | P2       |
| **SPLADE sparse retrieval**  | High (5d+)    | Medium     | Medium   | P3       |
| **ColBERT late interaction** | High (1w+)    | Medium     | High     | P3       |

### Recommended Implementation Order

**Phase 1: Quick Wins (Week 1)**

1. HNSW parameter optimization + dynamic efSearch
2. Add quality flag to search CLI

**Phase 2: Hybrid Search (Week 2)**

1. Integrate BM25 library
2. Build BM25 index during embedding build
3. Implement RRF fusion
4. Add hybrid mode to CLI

**Phase 3: Re-ranking (Week 3)**

1. Evaluate Transformers.js vs API approach
2. Implement re-ranking pipeline
3. Add --rerank flag
4. Cache loaded models

**Phase 4: Polish (Week 4)**

1. Add HyDE as opt-in for complex queries
2. Enhance metadata filtering
3. Add search quality metrics/logging
4. Documentation

### Risk Mitigation

| Risk                        | Mitigation                  |
| --------------------------- | --------------------------- |
| Transformers.js ONNX issues | Fallback to API reranking   |
| BM25 index size             | Store separately, lazy load |
| Increased latency           | Make re-ranking opt-in      |
| Model download size         | Cache models, lazy load     |

---

## Sources

### Hybrid Search

- [Hybrid Search Explained - Weaviate](https://weaviate.io/blog/hybrid-search-explained)
- [Hybrid Search with BM25 and Rank Fusion - Medium](https://medium.com/thinking-sand/hybrid-search-with-bm25-and-rank-fusion-for-accurate-results-456a70305dc5)
- [Hybrid Search Scoring (RRF) - Azure AI Search](https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking)
- [Comprehensive Hybrid Search Guide - Elastic](https://www.elastic.co/what-is/hybrid-search)
- [Reciprocal Rank Fusion - ParadeDB](https://www.paradedb.com/learn/search-concepts/reciprocal-rank-fusion)

### Re-ranking

- [cross-encoder/ms-marco-MiniLM-L6-v2 - Hugging Face](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L6-v2)
- [RAG Reranking Techniques - CustomGPT](https://customgpt.ai/rag-reranking-techniques/)
- [Adaptive Retrieval Reranking - RAG About It](https://ragaboutit.com/adaptive-retrieval-reranking-how-to-implement-cross-encoder-models-to-fix-enterprise-rag-ranking-failures/)
- [MS MARCO Cross-Encoders - Sentence Transformers](https://www.sbert.net/docs/pretrained-models/ce-msmarco.html)
- [FlashRank - GitHub](https://github.com/PrithivirajDamodaran/FlashRank)

### Vector Indexes

- [Vector Search at Scale: HNSW vs IVF vs DiskANN](https://netcrit.net/vector-search-at-scale-hnsw-vs-ivf-vs-diskann)
- [HNSW vs DiskANN - Tiger Data](https://www.tigerdata.com/learn/hnsw-vs-diskann)
- [How to Pick a Vector Index - Zilliz](https://zilliz.com/learn/how-to-pick-a-vector-index-in-milvus-visual-guide)
- [HNSW Index Explained - Milvus](https://milvus.io/docs/index-explained.md)

### HNSW Tuning

- [Practical Guide to HNSW Hyperparameters - OpenSearch](https://opensearch.org/blog/a-practical-guide-to-selecting-hnsw-hyperparameters/)
- [HNSW Configuration Parameters - Milvus AI Reference](https://milvus.io/ai-quick-reference/what-are-the-key-configuration-parameters-for-an-hnsw-index-such-as-m-and-efconstructionefsearch-and-how-does-each-influence-the-tradeoff-between-index-size-build-time-query-speed-and-recall)
- [HNSW Indexes with Postgres - Crunchy Data](https://www.crunchydata.com/blog/hnsw-indexes-with-postgres-and-pgvector)

### Filtering

- [Complete Guide to Filtering in Vector Search - Qdrant](https://qdrant.tech/articles/vector-search-filtering/)
- [Vector Query Filters - Azure AI Search](https://learn.microsoft.com/en-us/azure/search/vector-search-filters)
- [Achilles Heel of Vector Search: Filters](https://yudhiesh.github.io/2025/05/09/the-achilles-heel-of-vector-search-filters/)
- [Metadata Filtering and Hybrid Search - Dataquest](https://www.dataquest.io/blog/metadata-filtering-and-hybrid-search-for-vector-databases/)

### Emerging Patterns

- [Late Interaction Overview: ColBERT, ColPali - Weaviate](https://weaviate.io/blog/late-interaction-overview)
- [Modern Sparse Neural Retrieval - Qdrant](https://qdrant.tech/articles/modern-sparse-neural-retrieval/)
- [SPLADE vs BM25 - Zilliz](https://zilliz.com/learn/comparing-splade-sparse-vectors-with-bm25)
- [HyDE for RAG - Machine Learning Plus](https://machinelearningplus.com/gen-ai/hypothetical-document-embedding-hyde-a-smarter-rag-method-to-search-documents/)
- [Better RAG with HyDE - Zilliz](https://zilliz.com/learn/improve-rag-and-information-retrieval-with-hyde-hypothetical-document-embeddings)

### Node.js Libraries

- [hnswlib-node - npm](https://www.npmjs.com/package/hnswlib-node)
- [hnswlib-node - GitHub](https://github.com/yoshoku/hnswlib-node)
- [wink-bm25-text-search - npm](https://www.npmjs.com/package/wink-bm25-text-search)
- [OkapiBM25 - GitHub](https://github.com/FurkanToprak/OkapiBM25)
- [Transformers.js v3 - Hugging Face](https://huggingface.co/blog/transformersjs-v3)
- [FaissStore - LangChain.js](https://js.langchain.com/docs/integrations/vectorstores/faiss/)

### RAG Best Practices

- [2025 Guide to RAG - Eden AI](https://www.edenai.co/post/the-2025-guide-to-retrieval-augmented-generation-rag)
- [Enhancing RAG: Study of Best Practices - arXiv](https://arxiv.org/abs/2501.07391)
- [RAG 2025 Definitive Guide - Chitika](https://www.chitika.com/retrieval-augmented-generation-rag-the-definitive-guide-2025/)
- [Role of Sufficient Context in RAG - Google Research](https://research.google/blog/deeper-insights-into-retrieval-augmented-generation-the-role-of-sufficient-context/)
