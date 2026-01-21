# RAG Alternatives Research: Improving Semantic Search Quality

This document explores alternatives to traditional RAG patterns for improving semantic search quality in mdcontext. Since mdcontext is a pure retrieval system (no LLM generation), we focus on techniques that enhance retrieval precision and recall without adding generation complexity.

## Table of Contents

1. [The RAG Problem](#the-rag-problem)
2. [Alternative Approaches](#alternative-approaches)
3. [Top 3 Recommendations](#top-3-recommendations)
4. [Effort/Impact Analysis](#effortimpact-analysis)
5. [Quick Wins](#quick-wins)

---

## The RAG Problem

### Why Standard RAG Hurts Retrieval Quality

Traditional RAG (Retrieval-Augmented Generation) is designed to enhance LLM generation with retrieved context. However, this paradigm introduces several problems when applied to pure semantic search:

#### 1. Optimization Mismatch

RAG systems optimize for **generation quality**, not **retrieval precision**. This creates a fundamental mismatch:

- RAG tolerates noisy retrieval because LLMs can filter irrelevant context
- Pure search requires every result to be relevant since users see raw results
- RAG metrics (BLEU, ROUGE) don't align with search metrics (nDCG, MRR)

#### 2. The Confidence Problem

Research shows RAG paradoxically reduces model accuracy in some cases:

> "While RAG generally improves overall performance, it paradoxically reduces the model's ability to abstain from answering when appropriate. The introduction of additional context seems to increase the model's confidence, leading to a higher propensity for hallucination rather than abstention."

Google research found that Gemma's incorrect answer rate increased from 10.2% to 66.1% when using insufficient context, demonstrating how retrieved content can actively harm results.

#### 3. The Vocabulary Mismatch Problem

Dense embeddings theoretically solve vocabulary mismatch (e.g., "coronavirus" should match "COVID"), but real embeddings fall short:

> "While semantic embedding models are supposed to eliminate the need for query expansion... real embeddings made by real models often fall short."

Example: A query for "skin rash" might retrieve documents about "behaving rashly" while missing medical articles about "dermatitis."

#### 4. When Retrieval Beats Generation

For documentation search specifically:

| Use Case              | RAG Appropriate | Pure Retrieval Better |
| --------------------- | --------------- | --------------------- |
| Answer synthesis      | Yes             | No                    |
| Finding specific docs | No              | Yes                   |
| Exploratory search    | No              | Yes                   |
| Code examples         | Depends         | Usually               |
| API reference         | No              | Yes                   |

mdcontext's use case (finding relevant documentation sections) is best served by optimizing retrieval directly.

---

## Alternative Approaches

### 1. Hybrid Search (BM25 + Dense)

**What it is**: Combine traditional keyword search (BM25) with dense vector search, fusing results using techniques like Reciprocal Rank Fusion (RRF).

**Why it works**:

- Dense vectors excel at semantic understanding
- BM25 excels at exact matches (error codes, SKUs, technical terms)
- Hybrid captures both without tradeoffs

**Performance gains**:

> "Hybrid search improves recall 15-30% over single methods with minimal added complexity."
>
> "In open-domain QA benchmarks... BM25 passage recall is 22.1%; dense retrievers (DPR) reach 48.7%, but hybrid pipelines achieve up to 53.4%."

**Fusion methods**:

1. **Reciprocal Rank Fusion (RRF)**: Simplest, requires no tuning

   ```
   score = sum(1 / (k + rank)) for each retriever
   k = 60 (standard constant)
   ```

2. **Linear Combination**: More control, requires tuning

   ```
   score = alpha * bm25_score + (1 - alpha) * dense_score
   ```

**JavaScript/TypeScript options**:

- [wink-bm25-text-search](https://www.npmjs.com/package/wink-bm25-text-search): Full-featured BM25 with NLP integration
- [OkapiBM25](https://www.npmjs.com/package/okapi-bm25): Simple, typed implementation
- [@langchain/community BM25Retriever](https://js.langchain.com/docs/integrations/retrievers/bm25/)

### 2. Cross-Encoder Re-ranking

**What it is**: Use a secondary model to re-score top-k results from initial retrieval.

**How it works**:

1. First stage: Fast bi-encoder retrieval (current approach)
2. Second stage: Cross-encoder scores (query, document) pairs for top-k results
3. Re-order based on cross-encoder scores

**Why it's better**:

> "Cross-encoders are more accurate than bi-encoders but they don't scale well, so using them to re-order a shortened list returned by semantic search is the ideal use case."

Cross-encoders process query and document together, enabling deeper semantic matching that bi-encoders (separate embedding) cannot achieve.

**Trade-offs**:

| Aspect      | Bi-Encoder             | Cross-Encoder            |
| ----------- | ---------------------- | ------------------------ |
| Speed       | Fast (precompute docs) | Slow (compute per query) |
| Accuracy    | Good                   | Best                     |
| Scalability | O(1) for docs          | O(n) per query           |
| Use case    | Initial retrieval      | Re-ranking top-k         |

**Implementation options**:

- [Transformers.js](https://huggingface.co/docs/transformers.js): Run ONNX models in Node.js
- [Cohere Rerank API](https://cohere.com/rerank): Managed service
- Python sidecar with sentence-transformers

### 3. SPLADE (Learned Sparse Retrieval)

**What it is**: Neural model that produces sparse vectors compatible with inverted indexes, combining benefits of neural understanding with lexical precision.

**How it works**:

- Uses BERT to weight term importance
- Enables term expansion (adds relevant related terms)
- Produces sparse vectors (mostly zeros) for efficient indexing

**Key advantages**:

> "Sparse representations benefit from several advantages compared to dense approaches: efficient use of inverted index, explicit lexical match, interpretability. They also seem to be better at generalizing on out-of-domain data."

**When SPLADE beats dense**:

- Out-of-domain generalization
- Interpretability requirements
- Exact term matching important
- Limited training data

**Trade-offs**:

- Requires specialized model serving
- Less mature JavaScript ecosystem
- May need fine-tuning for domain

### 4. ColBERT Late Interaction

**What it is**: Multi-vector approach where documents and queries are represented by multiple token-level vectors, matched via "late interaction."

**How it works**:

1. Encode query tokens → multiple query vectors
2. Encode document tokens → multiple document vectors
3. Compute MaxSim: for each query token, find max similarity to any doc token
4. Sum MaxSim scores across query tokens

**Performance characteristics**:

> "PLAID reduces late interaction search latency by up to 7x on a GPU and 45x on a CPU against vanilla ColBERTv2."

**Production viability**:

- PLAID engine enables production-scale deployment
- Memory-mapped storage reduces RAM by 90%
- Sub-millisecond query latency achievable

**Limitations for mdcontext**:

- No mature JavaScript implementation
- Would require Python service
- More complex infrastructure
- Overkill for typical documentation corpus sizes

### 5. Query Expansion Techniques

#### a) HyDE (Hypothetical Document Embeddings)

**What it is**: Use LLM to generate a hypothetical answer, then search using the answer's embedding instead of the query's.

**How it works**:

1. Query: "How do I configure authentication?"
2. LLM generates hypothetical answer (may be wrong, but captures patterns)
3. Embed the hypothetical answer
4. Search with that embedding

**Why it works**:

> "The semantic gap between your short question and the detailed answer creates mismatches. HyDE bridges this gap by first expanding your question into a hypothetical detailed answer."

**When to use**:

- Complex questions
- Domain-specific jargon
- When query is much shorter than target documents

**When NOT to use**:

- Simple keyword queries
- When LLM lacks domain knowledge
- Latency-sensitive applications (adds LLM call)

#### b) LLM Query Expansion

**What it is**: Use LLM to expand query with synonyms, related terms, and reformulations.

**Approaches**:

1. **Explicit expansion**: Generate expansion terms to append
2. **Multi-query**: Generate multiple query variations, search all, merge results

**Risk**:

> "While query expansion is helpful, using LLMs risks adding unhelpful query terms that reduce performance."

**Best practices**:

- Use for ambiguous queries only
- Limit expansion scope
- Consider query type detection before expanding

### 6. Domain-Adapted Embeddings

**What it is**: Fine-tune embedding models on your specific corpus or domain.

**Why it matters**:

> "Off-the-shelf embedding models are often limited to general knowledge and not company- or domain-specific knowledge."

**Results**:

> "Fine-tuning can boost performance by ~7% with only 6.3k samples. The training took 3 minutes on a consumer size GPU."

**Approaches**:

| Approach              | Effort | Improvement | When to Use               |
| --------------------- | ------ | ----------- | ------------------------- |
| LoRA adapters         | Low    | 5-10%       | Specialized terminology   |
| Full fine-tune        | Medium | 10-15%      | Domain-specific semantics |
| Contrastive on corpus | High   | 15-20%      | Mission-critical search   |

**Requirements**:

- Training data (query-document pairs)
- GPU for training (consumer-grade sufficient)
- Evaluation dataset

### 7. Matryoshka Representation Learning (MRL)

**What it is**: Embeddings that work at multiple dimensions, enabling adaptive precision/speed tradeoffs.

**How it works**:

- Full embedding: 1536 dimensions
- Can truncate to 768, 384, 256, 128, etc.
- Early dimensions contain most information
- Enable two-stage retrieval with progressive precision

**Benefits**:

> "Up to 14x smaller embedding size for ImageNet-1K classification at the same level of accuracy... up to 14x real-world speed-ups for large-scale retrieval."

**Supported models**:

- OpenAI text-embedding-3-large (supports dimension reduction)
- Nomic nomic-embed-text-v1
- Alibaba gte-multilingual-base

**Application for mdcontext**:

- Already using text-embedding-3-small (supports dimensions parameter)
- Could use lower dimensions for initial shortlist
- Full dimensions for final ranking

---

## Top 3 Recommendations

### Recommendation 1: Hybrid Search (BM25 + Dense)

**Why #1**: Maximum impact with minimal complexity.

**Rationale**:

- Addresses the vocabulary mismatch problem directly
- 15-30% recall improvement documented
- Well-supported in JavaScript ecosystem
- No external dependencies (LLM, GPU, Python)
- Complements existing dense search perfectly

**Implementation path**:

1. Add BM25 index alongside HNSW
2. Run parallel queries
3. Fuse with RRF (k=60)
4. Return fused top-k

**Expected improvement**: 15-25% better recall for technical queries.

### Recommendation 2: Cross-Encoder Re-ranking

**Why #2**: Best precision gains for reasonable cost.

**Rationale**:

- Dramatically improves top-10 relevance
- Can be applied selectively (complex queries only)
- Transformers.js enables pure JavaScript implementation
- Small models (MiniLM) run fast enough for interactive use

**Implementation path**:

1. Use Transformers.js with cross-encoder model
2. Re-rank top-20 candidates to top-10
3. Consider caching for repeated queries

**Expected improvement**: 10-20% precision@10 improvement.

### Recommendation 3: Query Expansion (Selective HyDE)

**Why #3**: Addresses semantic gap for complex queries.

**Rationale**:

- Transforms short queries into document-like representations
- Works well for "how to" and conceptual queries
- Can be optional (detect when helpful)
- Uses existing OpenAI integration

**Implementation path**:

1. Detect query type (simple keyword vs. complex question)
2. For complex queries, generate 1-3 hypothetical answers
3. Embed answers, average embeddings
4. Search with expanded representation

**Expected improvement**: 15-30% for complex queries, 0% for simple keywords (but no regression).

---

## Effort/Impact Analysis

| Technique                 | Implementation Effort | Accuracy Impact       | Latency Impact      | Dependencies                       |
| ------------------------- | --------------------- | --------------------- | ------------------- | ---------------------------------- |
| **Hybrid Search**         | Medium (2-3 days)     | High (+15-30%)        | Low (+5-10ms)       | npm package only                   |
| **Cross-Encoder Re-rank** | Medium (2-3 days)     | High (+10-20%)        | Medium (+50-200ms)  | Transformers.js + ONNX model       |
| **HyDE Query Expansion**  | Low (1 day)           | Medium (+15%)         | High (+500-1000ms)  | OpenAI API                         |
| **SPLADE**                | High (1-2 weeks)      | Medium (+10%)         | Low                 | Python service                     |
| **ColBERT**               | Very High (2-4 weeks) | Very High (+20%)      | Medium              | Python service + specialized index |
| **Fine-tuned Embeddings** | High (1 week)         | Medium-High (+10-15%) | None                | Training infrastructure            |
| **Matryoshka Dimensions** | Low (0.5 days)        | Low (+5%)             | Improvement (-20ms) | Already supported                  |

### Prioritized Roadmap

```
Phase 1 (Quick Wins - 1 week):
├── Matryoshka dimension optimization
└── Query preprocessing improvements

Phase 2 (Core Improvements - 2 weeks):
├── Hybrid search (BM25 + dense)
└── RRF fusion implementation

Phase 3 (Advanced Features - 2 weeks):
├── Cross-encoder re-ranking (Transformers.js)
└── Selective HyDE for complex queries

Phase 4 (Future Optimization):
├── Domain-adapted embeddings (if corpus-specific issues)
└── SPLADE evaluation (if hybrid insufficient)
```

---

## Quick Wins

These improvements can be implemented quickly with immediate benefits:

### 1. Query Preprocessing (1-2 hours)

```typescript
function preprocessQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}
```

**Impact**: Reduces embedding noise, 2-5% precision improvement.

### 2. Matryoshka Dimension Reduction (2-4 hours)

OpenAI's text-embedding-3-small supports dimension reduction:

```typescript
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: texts,
  dimensions: 512, // Instead of 1536
});
```

**Benefits**:

- 3x smaller index
- Faster search
- Minimal accuracy loss (< 2% for most cases)

**Best for**: Larger corpora, faster iteration.

### 3. Result Deduplication (1-2 hours)

Remove near-duplicate results based on:

- Same document + similar headings
- High cosine similarity between result embeddings

**Impact**: Better result diversity, improved user experience.

### 4. Boost Heading Matches (2-4 hours)

Add bonus score when query terms appear in section headings:

```typescript
function adjustScore(result: SearchResult, query: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const headingLower = result.heading.toLowerCase();
  const headingMatches = queryTerms.filter((t) =>
    headingLower.includes(t),
  ).length;

  return result.similarity + headingMatches * 0.05; // +5% per match
}
```

**Impact**: Significant for navigation queries ("installation guide", "API reference").

### 5. Document Title Context (2-4 hours)

Ensure document titles are prominent in embeddings:

```typescript
function getEmbeddingText(section: Section, doc: Document): string {
  return `
Document: ${doc.title}
Section: ${section.heading}
Parent: ${section.parent?.heading || "None"}

${section.content}
  `.trim();
}
```

**Impact**: Better matching for document-level queries.

### 6. Negative Result Caching (4-8 hours)

Cache queries that return poor results:

- Track low-similarity searches
- Use for query expansion hints
- Inform users when no good matches exist

**Impact**: Better UX, data for future improvements.

---

## References

### Research Papers

- [Precise Zero-Shot Dense Retrieval without Relevance Labels (HyDE)](https://arxiv.org/abs/2212.10496)
- [Matryoshka Representation Learning](https://arxiv.org/abs/2205.13147)
- [SPLADE: Sparse Lexical and Expansion Model for Information Retrieval](https://arxiv.org/abs/2109.10086)
- [ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction](https://arxiv.org/abs/2004.12832)
- [Conventional Contrastive Learning Often Falls Short](https://arxiv.org/abs/2505.19274)

### Implementation Resources

- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [wink-bm25-text-search](https://www.npmjs.com/package/wink-bm25-text-search)
- [Sentence Transformers - Retrieve & Re-Rank](https://sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html)
- [OpenAI Cookbook - Search Reranking with Cross-Encoders](https://cookbook.openai.com/examples/search_reranking_with_cross-encoders)

### Industry Best Practices

- [Weaviate: Hybrid Search Explained](https://weaviate.io/blog/hybrid-search-explained)
- [Qdrant: Modern Sparse Neural Retrieval](https://qdrant.tech/articles/modern-sparse-neural-retrieval/)
- [Pinecone: SPLADE for Sparse Vector Search](https://www.pinecone.io/learn/splade/)
- [Google Research: The Role of Sufficient Context in RAG](https://research.google/blog/deeper-insights-into-retrieval-augmented-generation-the-role-of-sufficient-context/)

---

## Summary

For mdcontext's semantic search use case, the recommended approach is:

1. **Hybrid search** for best baseline improvement
2. **Cross-encoder re-ranking** for precision when needed
3. **Selective query expansion** for complex queries

These three techniques, combined with quick wins like query preprocessing and heading boosting, can significantly improve search quality without introducing the complexity and failure modes of full RAG systems.

The key insight is that **pure retrieval optimization beats RAG** for documentation search because:

- Users want to find documents, not generated answers
- Every result must be relevant (no LLM to filter noise)
- Latency matters for interactive search
- Simpler systems are more reliable and maintainable
