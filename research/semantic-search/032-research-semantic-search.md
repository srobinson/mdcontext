# Research Task Analysis: Embedding Models, RAG Alternatives, and Vector Search

Analysis of research documents against current mdcontext implementation.

Date: January 2026

---

## Documents Analyzed

1. `002-research-embedding-models.md` - Embedding model comparison and recommendations
2. `003-research-rag-alternatives.md` - RAG alternatives for improving semantic search
3. `004-research-vector-search.md` - Vector search patterns and techniques

---

## Implemented (No Action Needed)

### 1. Dimension Reduction (512 dimensions)

**Research Recommendation:** Reduce OpenAI embeddings from 1536 to 512 dimensions for 67% storage reduction with minimal quality loss.

**Current Implementation:** Already implemented in `src/embeddings/openai-provider.ts`:

```typescript
const response = await this.client.embeddings.create({
  model: this.model,
  input: batch,
  dimensions: 512, // Already using reduced dimensions
});
```

**Status:** Implemented

---

### 2. HNSW Vector Index

**Research Recommendation:** Stay with HNSW for documentation corpora (<100K sections).

**Current Implementation:** Using `hnswlib-node` with cosine similarity in `src/embeddings/vector-store.ts`:

```typescript
this.index = new HierarchicalNSW.HierarchicalNSW("cosine", this.dimensions);
this.index.initIndex(10000, 16, 200, 100); // M=16, efConstruction=200
```

**Status:** Implemented

---

### 3. EmbeddingProvider Interface

**Research Recommendation:** Create provider abstraction for embedding models.

**Current Implementation:** `src/embeddings/types.ts` defines a clean provider interface:

```typescript
export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<EmbeddingResult>;
}
```

**Status:** Implemented (foundation ready for additional providers)

---

### 4. Path Pattern Filtering (Post-filter)

**Research Recommendation:** Implement metadata filtering for search results.

**Current Implementation:** `pathPattern` option implemented in `semanticSearch()` as post-filtering.

**Status:** Implemented (basic)

---

### 5. Document Context in Embeddings

**Research Recommendation:** Include document title and parent section in embedding text.

**Current Implementation:** Already in `src/embeddings/semantic-search.ts`:

```typescript
const generateEmbeddingText = (
  section,
  content,
  documentTitle,
  parentHeading,
) => {
  parts.push(`# ${section.heading}`);
  if (parentHeading) parts.push(`Parent section: ${parentHeading}`);
  parts.push(`Document: ${documentTitle}`);
  parts.push(content);
  // ...
};
```

**Status:** Implemented

---

## Task Candidates

### 1. Add Hybrid Search (BM25 + Semantic)

**Priority:** High

**Description:**
Implement hybrid search combining BM25 keyword search with semantic search, using Reciprocal Rank Fusion (RRF) to merge results.

**Why It Matters:**

- Research shows 15-30% recall improvement over single-method retrieval
- Handles exact term matching (API names, error codes, identifiers) that pure semantic search misses
- Current keyword search exists separately but isn't integrated with semantic search

**Implementation Notes:**

- Add `wink-bm25-text-search` dependency
- Build BM25 index alongside vector index during `mdcontext embed`
- Add `--mode hybrid` option to search command
- Implement RRF fusion (~50 lines of code)

**Current Gap:**

- Keyword search (`src/search/searcher.ts`) and semantic search (`src/embeddings/semantic-search.ts`) are separate codepaths
- No fusion mechanism exists

**Estimated Effort:** 2-3 days

---

### 2. Add Local Embedding Provider (Ollama)

**Priority:** High

**Description:**
Implement an Ollama-based embedding provider using `nomic-embed-text-v1.5` for offline semantic search.

**Why It Matters:**

- Enables offline semantic search (major feature gap)
- Zero ongoing API costs
- Quality matches or exceeds OpenAI text-embedding-3-small
- Privacy-sensitive use cases

**Implementation Notes:**

- Create `src/embeddings/ollama-provider.ts` implementing `EmbeddingProvider`
- Add provider selection via config or `--provider` CLI flag
- Default to OpenAI for backward compatibility
- nomic-embed-text supports Matryoshka (dimension flexibility)

**Models to Support:**

1. `nomic-embed-text` - Best overall fit (fast, 8K context, Matryoshka)
2. `mxbai-embed-large` - Higher quality option
3. `bge-m3` - Multilingual option

**Estimated Effort:** 2-3 days

---

### 3. Add Cross-Encoder Re-ranking

**Priority:** Medium

**Description:**
Add optional re-ranking of top-N semantic search results using a cross-encoder model.

**Why It Matters:**

- 20-35% accuracy improvement in retrieval precision
- Cross-encoders capture fine-grained relevance that bi-encoders miss
- Can be opt-in to avoid latency when not needed

**Implementation Notes:**

- Add `@xenova/transformers` dependency for Transformers.js
- Use `ms-marco-MiniLM-L-6-v2` model (22.7M params, 2-5ms/pair)
- Re-rank top-20 candidates to top-10
- Add `--rerank` flag to search command

**Alternative:** Cohere Rerank API for simpler integration (adds cost)

**Estimated Effort:** 2-3 days

---

### 4. Add Dynamic efSearch (Quality Modes)

**Priority:** Medium

**Description:**
Allow users to control search quality/speed tradeoff via HNSW efSearch parameter at query time.

**Why It Matters:**

- Zero dependency changes
- Immediate quality/speed improvements
- Low risk

**Implementation Notes:**

- Add `--quality` flag: `fast` (64), `balanced` (100), `thorough` (256)
- efSearch is already configurable at query time in hnswlib-node
- Update search functions to accept quality parameter

**Current State:**

```typescript
this.index.initIndex(10000, 16, 200, 100); // efSearch=100 (implicit)
```

**Estimated Effort:** 0.5 days

---

### 5. Add Configurable HNSW Parameters

**Priority:** Low

**Description:**
Expose HNSW build parameters (M, efConstruction) via configuration for users with specific needs.

**Why It Matters:**

- Users with large corpora may want to tune for speed
- Users needing maximum recall can increase parameters
- Enables benchmarking different configurations

**Current Hardcoded Values:**

```typescript
M: 16; // Max connections per node
efConstruction: 200; // Construction-time search width
```

**Recommended Configurations:**

- Quality-focused: M=24, efConstruction=256
- Speed-focused: M=12, efConstruction=128

**Estimated Effort:** 1 day

---

### 6. Add Query Preprocessing

**Priority:** Low

**Description:**
Add basic query preprocessing before embedding to reduce noise.

**Why It Matters:**

- 2-5% precision improvement
- Simple implementation

**Implementation:**

```typescript
function preprocessQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

**Estimated Effort:** 1-2 hours

---

### 7. Add Heading Match Boost

**Priority:** Low

**Description:**
Boost search results when query terms appear in section headings.

**Why It Matters:**

- Significant for navigation queries ("installation guide", "API reference")
- Simple scoring adjustment

**Implementation:**

```typescript
function adjustScore(result, query): number {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const headingLower = result.heading.toLowerCase();
  const headingMatches = queryTerms.filter((t) =>
    headingLower.includes(t),
  ).length;
  return result.similarity + headingMatches * 0.05;
}
```

**Estimated Effort:** 2-4 hours

---

### 8. Add HyDE Query Expansion (Optional)

**Priority:** Low

**Description:**
Implement Hypothetical Document Embeddings for complex queries - generate a hypothetical answer with LLM, then search using that embedding.

**Why It Matters:**

- 10-30% retrieval improvement on ambiguous queries
- Bridges semantic gap between short questions and detailed documents

**Considerations:**

- Adds LLM call (cost, latency)
- Should be opt-in for complex queries only
- Works poorly if LLM lacks domain knowledge

**Estimated Effort:** 1-2 days

---

### 9. Fix Dimension Mismatch in Provider

**Priority:** Medium

**Description:**
The OpenAI provider reports incorrect dimensions (1536/3072) while actually using 512.

**Current Issue:**

```typescript
// In openai-provider.ts
this.dimensions = this.model === "text-embedding-3-large" ? 3072 : 1536;
// But actual API call uses:
dimensions: 512;
```

This mismatch could cause issues if other code relies on `provider.dimensions`.

**Fix:** Update dimension reporting to match actual API parameter.

**Estimated Effort:** 0.5 hours

---

### 10. Add Alternative API Provider (Voyage AI)

**Priority:** Low

**Description:**
Add Voyage AI as an alternative embedding provider for users wanting better quality at similar cost.

**Why It Matters:**

- voyage-3.5-lite: Same price as OpenAI ($0.02/1M), but better quality
- 32K token context (4x OpenAI)
- Free 200M tokens for testing

**Estimated Effort:** 1 day

---

## Skip (Not Applicable)

| Recommendation           | Reason to Skip                                                        |
| ------------------------ | --------------------------------------------------------------------- |
| ColBERT Late Interaction | Overkill for documentation corpus sizes; requires Python service      |
| SPLADE Sparse Retrieval  | BM25 + semantic hybrid likely sufficient; adds complexity             |
| GraphRAG                 | Overkill for documentation search                                     |
| Fine-tuned Embeddings    | Requires training infrastructure; general models work well            |
| IVF/DiskANN Indexes      | HNSW sufficient for typical documentation sizes (<100K sections)      |
| LLM-based Re-ranking     | Cross-encoders provide similar quality without LLM cost/latency       |
| Self-RAG                 | Beyond current scope; more relevant for RAG pipelines with generation |

---

## Summary

| Category        | Count             |
| --------------- | ----------------- |
| Implemented     | 5 items           |
| Task Candidates | 10 items          |
| Skipped         | 7 recommendations |

### Priority Matrix

| Priority   | Tasks                                                                     |
| ---------- | ------------------------------------------------------------------------- |
| **High**   | Hybrid Search (BM25+RRF), Local Embedding Provider (Ollama)               |
| **Medium** | Cross-Encoder Re-ranking, Dynamic efSearch, Fix Dimension Mismatch        |
| **Low**    | HNSW Config, Query Preprocessing, Heading Boost, HyDE, Voyage AI Provider |

### Recommended Implementation Order

**Phase 1: Quick Wins (1 week)**

1. Fix dimension mismatch in provider
2. Add dynamic efSearch (quality modes)
3. Add query preprocessing
4. Add heading match boost

**Phase 2: Hybrid Search (1-2 weeks)**

1. Integrate BM25 library
2. Build BM25 index during embed
3. Implement RRF fusion
4. Add `--mode hybrid` to CLI

**Phase 3: Local/Offline (1-2 weeks)**

1. Implement Ollama provider
2. Add provider selection CLI
3. Test with nomic-embed-text

**Phase 4: Advanced (2 weeks)**

1. Cross-encoder re-ranking (Transformers.js)
2. HyDE query expansion (optional)
3. Alternative API providers (Voyage AI)
