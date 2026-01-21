# Embedding Models Research for mdcontext

_Research conducted: January 2026_

This document provides comprehensive research on embedding models for improving mdcontext's semantic search capabilities. The current implementation uses OpenAI's `text-embedding-3-small` (1536 dimensions, $0.02/1M tokens).

## Table of Contents

1. [Model Comparison Table](#model-comparison-table)
2. [OpenAI Models Analysis](#openai-models-analysis)
3. [Local/Offline Models Analysis](#localoffline-models-analysis)
4. [Alternative API Providers](#alternative-api-providers)
5. [Dimension Reduction Analysis](#dimension-reduction-analysis)
6. [Hybrid Search & Reranking](#hybrid-search--reranking)
7. [Top 3 Recommendations](#top-3-recommendations)
8. [Effort/Impact Analysis](#effortimpact-analysis)
9. [Quick Wins](#quick-wins)

---

## Model Comparison Table

### API-Based Models

| Provider  | Model                  | Dimensions          | Cost/1M tokens           | MTEB Score | Context Length | Notes                      |
| --------- | ---------------------- | ------------------- | ------------------------ | ---------- | -------------- | -------------------------- |
| OpenAI    | text-embedding-3-small | 1536 (configurable) | $0.02                    | 62.3       | 8,192          | Current mdcontext model    |
| OpenAI    | text-embedding-3-large | 3072 (configurable) | $0.13                    | 64.6       | 8,192          | Best OpenAI option         |
| Voyage AI | voyage-3.5             | 1024                | $0.06                    | ~66+       | 32,000         | Excellent retrieval        |
| Voyage AI | voyage-3.5-lite        | 512                 | $0.02                    | ~64+       | 32,000         | Same price as OpenAI small |
| Voyage AI | voyage-3-large         | 2048/1024/512/256   | $0.22                    | ~68+       | 32,000         | SOTA general purpose       |
| Cohere    | embed-v4               | 1536                | $0.12                    | 65.2       | 512            | Multimodal support         |
| Cohere    | embed-v3-english       | 1024                | ~$0.10                   | ~64        | 512            | Text-only                  |
| Google    | gemini-embedding-001   | 3072/1536/768       | $0.15 (paid) / Free tier | 71.5       | 2,048          | Free tier available        |
| Jina AI   | jina-embeddings-v3     | 1024 (configurable) | Usage-based              | 65.5       | 8,192          | Task-specific adapters     |

### Local/Open-Source Models

| Model                  | Dimensions         | Memory | Speed     | MTEB Score | Context  | License    |
| ---------------------- | ------------------ | ------ | --------- | ---------- | -------- | ---------- |
| nomic-embed-text-v1.5  | 768 (configurable) | ~0.5GB | Very Fast | 62.4       | 8,192    | Apache 2.0 |
| mxbai-embed-large      | 1024               | ~1.2GB | Fast      | 64.7       | Standard | Apache 2.0 |
| BGE-M3                 | 1024               | ~2GB   | Medium    | 63.0       | 8,192    | MIT        |
| all-MiniLM-L6-v2       | 384                | ~100MB | Very Fast | 56.3       | 256      | Apache 2.0 |
| all-mpnet-base-v2      | 768                | ~400MB | Fast      | 57.8       | 384      | Apache 2.0 |
| jina-embeddings-v3     | 1024               | ~2GB   | Medium    | 65.5       | 8,192    | Apache 2.0 |
| E5-Mistral-7B-Instruct | 4096               | ~14GB  | Slow      | 61.8       | 4,096    | MIT        |

---

## OpenAI Models Analysis

### Current: text-embedding-3-small

**Specs:**

- Dimensions: 1536 (can be reduced via API)
- Cost: $0.02 per 1M tokens
- MTEB Score: 62.3
- Context: 8,192 tokens

**Strengths:**

- Cost-effective for API usage
- Good multilingual support (improved over ada-002)
- Native dimension reduction support (Matryoshka)
- Well-documented, stable API

**Weaknesses:**

- Requires API access (no offline mode)
- Lower quality than text-embedding-3-large
- Latency dependent on network

### Upgrade Option: text-embedding-3-large

**Specs:**

- Dimensions: 3072 (can be reduced to 256-3072)
- Cost: $0.13 per 1M tokens (6.5x more expensive)
- MTEB Score: 64.6
- MIRACL Score: 54.9% (vs 44.0% for small)

**When to Consider:**

- Multilingual documentation
- Complex technical content
- When quality matters more than cost

**Key Insight:** You can use text-embedding-3-large at 256-512 dimensions and still outperform text-embedding-3-small at full 1536 dimensions. This provides a quality upgrade with storage savings.

### Dimension Reduction (Matryoshka)

OpenAI's text-embedding-3 models use Matryoshka Representation Learning, allowing dimension truncation:

| Original Model | Reduced Dims | MTEB Impact | Storage Savings |
| -------------- | ------------ | ----------- | --------------- |
| 3-large (3072) | 1536         | ~1-2% drop  | 50%             |
| 3-large (3072) | 1024         | ~2-3% drop  | 67%             |
| 3-large (3072) | 512          | ~4-5% drop  | 83%             |
| 3-large (3072) | 256          | ~6-8% drop  | 92%             |
| 3-small (1536) | 512          | ~3-4% drop  | 67%             |
| 3-small (1536) | 256          | ~5-7% drop  | 83%             |

**Practical finding:** Reducing from 1536 to 512 dimensions typically cuts query latency in half and reduces vector storage by 67% with minimal accuracy impact for most RAG use cases.

---

## Local/Offline Models Analysis

### Tier 1: High Quality (Recommended for mdcontext)

#### nomic-embed-text-v1.5

**Why it stands out:**

- Outperforms OpenAI text-embedding-3-small on both short and long context benchmarks
- 8,192 token context (matches OpenAI)
- Matryoshka support for dimension flexibility
- Binary quantization support (100x storage reduction possible)
- Apache 2.0 license with fully open weights, code, and training data
- ~100 QPS on M2 MacBook (excellent local performance)
- Most downloaded open-source embedder on Hugging Face (35M+ downloads)

**Availability:**

- Hugging Face: `nomic-ai/nomic-embed-text-v1.5`
- Ollama: `nomic-embed-text`
- sentence-transformers compatible

**Best for:** General documentation search, mdcontext's primary use case

#### mxbai-embed-large

**Why it stands out:**

- MTEB retrieval score of 64.68 (matches OpenAI text-embedding-3-large at 64.59)
- Excellent for context-heavy, complex queries
- 1024 dimensions (efficient storage)

**Availability:**

- Ollama: `mxbai-embed-large`
- Hugging Face: `mixedbread-ai/mxbai-embed-large-v1`

**Best for:** When accuracy is paramount, complex technical documentation

#### BGE-M3

**Why it stands out:**

- Supports dense, sparse, AND multi-vector retrieval simultaneously
- 100+ languages
- 8,192 token context
- SOTA on multilingual benchmarks (MIRACL, MKQA)
- MIT license

**Unique capability:** Enables hybrid retrieval without separate BM25 index - the model produces both dense embeddings and sparse lexical representations.

**Availability:**

- Hugging Face: `BAAI/bge-m3`
- Ollama: `bge-m3`

**Best for:** Multilingual documentation, hybrid search without BM25

### Tier 2: Fast & Lightweight

#### all-MiniLM-L6-v2

**Specs:**

- 384 dimensions, ~22M parameters, ~100MB
- 5x faster than larger models
- 12,450 tokens/sec on RTX 4090

**Trade-off:** Lower accuracy (MTEB 56.3) but extremely fast and lightweight

**Best for:** Edge deployment, high-throughput scenarios, prototyping

#### all-mpnet-base-v2

**Specs:**

- 768 dimensions, ~110M parameters, ~400MB
- STS-B score: 87-88% (vs 84-85% for MiniLM)

**Trade-off:** Better accuracy than MiniLM, but 4-5x slower

**Best for:** When you need better accuracy than MiniLM but can't run larger models

### Local Model Comparison for mdcontext

| Factor        | nomic-embed-text-v1.5 | mxbai-embed-large | BGE-M3    |
| ------------- | --------------------- | ----------------- | --------- |
| Quality       | High                  | Highest           | High      |
| Speed         | Very Fast             | Fast              | Medium    |
| Memory        | 0.5GB                 | 1.2GB             | 2GB       |
| Context       | 8,192                 | Standard          | 8,192     |
| Matryoshka    | Yes                   | No                | No        |
| Multilingual  | Moderate              | Moderate          | Excellent |
| mdcontext fit | Excellent             | Good              | Good      |

**Recommendation:** nomic-embed-text-v1.5 is the best fit for mdcontext due to its balance of quality, speed, long context, and Matryoshka support.

---

## Alternative API Providers

### Voyage AI

**Standout features:**

- voyage-3.5 outperforms OpenAI text-embedding-3-large by 8.26%
- 32K token context (4x OpenAI)
- Excellent domain-specific models (code, law, finance)
- Matryoshka + quantization support

**Pricing:**

- voyage-3.5-lite: $0.02/1M (same as OpenAI small, but better quality)
- voyage-3.5: $0.06/1M
- voyage-3-large: $0.22/1M

**Free tier:** 200M tokens free for new models

**Best for:** When you need better quality than OpenAI at similar cost

### Cohere

**Standout features:**

- embed-v4 is multimodal (text + images)
- 100+ languages
- Fast inference (50-60% faster than OpenAI)
- Works well with Cohere's reranker

**Pricing:**

- embed-v4: $0.12/1M tokens

**Best for:** Multimodal needs, when using Cohere's full stack

### Google (Gemini Embedding)

**Standout features:**

- gemini-embedding-001: 71.5% accuracy on benchmarks
- Free tier available
- Matryoshka support (3072/1536/768)

**Pricing:**

- Free tier: Generous limits
- Paid: $0.15/1M tokens

**Consideration:** Higher latency, less established for embeddings

### Jina AI

**Standout features:**

- jina-embeddings-v3: Task-specific LoRA adapters
- 89 languages, 8,192 context
- Matryoshka support (32-1024 dims)
- Can be self-hosted (Apache 2.0)

**Best for:** Multilingual, task-specific optimization, hybrid API/local deployment

---

## Hybrid Search & Reranking

### Why Hybrid Search Matters

Current mdcontext limitation: semantic and keyword search are mutually exclusive.

**Hybrid approach benefits:**

- 48% improvement in retrieval quality (Pinecone benchmarks)
- Captures both exact keyword matches AND semantic similarity
- Reduces LLM hallucinations by 35% when used with reranking

### Recommended Architecture

```
Query → BM25 (lexical) ──┐
                         ├─→ Merge & Dedupe → Reranker → Top K results
Query → Dense Embed ─────┘
```

### Reranking Impact

Cross-encoder rerankers examine query-document pairs together, achieving +28% NDCG@10 improvements over raw embedding retrieval.

**Top reranker options:**

1. **Cohere Rerank 3**: 100+ languages, production-ready
2. **BGE Reranker v2-m3**: Open source, ~600M params, Apache 2.0
3. **Voyage rerank-2.5**: Instruction-following, high quality

**Optimal configuration:**

- Rerank top 50-75 documents for best quality/speed balance
- Latency: ~1.5 seconds for 50 documents

### BGE-M3 Special Capability

BGE-M3 uniquely supports all three retrieval methods in one model:

- Dense retrieval (semantic)
- Sparse retrieval (lexical, like BM25)
- Multi-vector retrieval (ColBERT-style)

This could eliminate the need for a separate BM25 index in mdcontext.

---

## Top 3 Recommendations

### Recommendation 1: Add Local Embedding Support with nomic-embed-text-v1.5

**Rationale:**

- Enables offline semantic search (major feature gap)
- Quality matches or exceeds current OpenAI text-embedding-3-small
- Zero ongoing API costs
- 8,192 token context matches current implementation
- Matryoshka support enables storage optimization
- Excellent performance on Apple Silicon (mdcontext's likely dev environment)

**Implementation approach:**

1. Add `nomic-embed-text` as an Ollama provider option
2. Create `OllamaEmbeddingProvider` implementing existing interface
3. Allow provider selection via config or CLI flag
4. Keep OpenAI as default for backward compatibility

**Impact:** High (offline capability, cost elimination)
**Effort:** Medium (new provider implementation, testing)

### Recommendation 2: Implement Dimension Reduction for OpenAI

**Rationale:**

- Zero-code quick win using existing API
- Reduce storage by 67% (1536 → 512) with minimal quality loss
- Improve query latency by ~50%
- text-embedding-3-large at 512 dims outperforms 3-small at 1536

**Implementation approach:**

1. Add `dimensions` parameter to OpenAI API calls
2. Update vector store to handle variable dimensions
3. Default to 512 dimensions for new indexes
4. Add migration path for existing indexes (or require rebuild)

**Impact:** Medium-High (storage/performance improvement)
**Effort:** Low (API parameter change, minor refactoring)

### Recommendation 3: Add Hybrid Search with BGE-M3 (Future)

**Rationale:**

- Addresses limitation #4 (no hybrid search) from current implementation
- Single model provides dense + sparse retrieval
- No separate BM25 index needed
- 48% retrieval quality improvement potential

**Implementation approach:**

1. Add BGE-M3 as a local provider option
2. Store both dense and sparse vectors
3. Implement hybrid retrieval merging
4. Optional: Add cross-encoder reranking

**Impact:** High (major quality improvement)
**Effort:** High (significant architecture changes)

---

## Effort/Impact Analysis

| Improvement                    | Impact      | Effort | Priority         |
| ------------------------------ | ----------- | ------ | ---------------- |
| Dimension reduction (512)      | Medium-High | Low    | 1 - Quick Win    |
| nomic-embed-text local         | High        | Medium | 2 - High Value   |
| Voyage AI as alternative       | Medium      | Low    | 3 - Easy Upgrade |
| BGE-M3 hybrid search           | High        | High   | 4 - Future       |
| Cross-encoder reranking        | Medium-High | Medium | 5 - Future       |
| text-embedding-3-large upgrade | Medium      | Low    | 6 - Optional     |

### Implementation Priority Order

1. **Week 1:** Dimension reduction (1536 → 512)
   - Modify OpenAI provider to pass `dimensions: 512`
   - Update vector store metadata
   - Test retrieval quality

2. **Week 2-3:** Local embedding support
   - Implement Ollama provider
   - Add nomic-embed-text integration
   - Create provider selection mechanism

3. **Week 4+:** Provider ecosystem
   - Add Voyage AI option
   - Consider BGE-M3 for hybrid search
   - Evaluate reranking integration

---

## Quick Wins

### 1. Dimension Reduction (Immediate)

**Change required:**

```typescript
// In openai-provider.ts
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: texts,
  dimensions: 512, // Add this parameter
});
```

**Benefits:**

- 67% storage reduction
- ~50% faster queries
- Minimal quality impact (~3-4%)

### 2. Switch to voyage-3.5-lite (Same Cost, Better Quality)

**If considering API alternatives:**

- Same price as OpenAI small ($0.02/1M)
- 6-8% better retrieval quality
- 32K context (4x more)
- Free 200M tokens to test

### 3. Use text-embedding-3-large at Reduced Dimensions

**For quality boost:**

```typescript
// Better quality at same storage cost
const response = await openai.embeddings.create({
  model: "text-embedding-3-large",
  input: texts,
  dimensions: 512, // Truncate large model
});
```

**Trade-off:** 6.5x cost increase, but significantly better retrieval

---

## Sources

- [MTEB Leaderboard - Hugging Face](https://huggingface.co/spaces/mteb/leaderboard)
- [OpenAI Embeddings Documentation](https://platform.openai.com/docs/guides/embeddings)
- [Voyage AI Documentation](https://docs.voyageai.com/docs/embeddings)
- [Cohere Embed Documentation](https://cohere.com/pricing)
- [nomic-embed-text-v1.5 - Hugging Face](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5)
- [BGE-M3 - Hugging Face](https://huggingface.co/BAAI/bge-m3)
- [Jina Embeddings v3](https://jina.ai/models/jina-embeddings-v3/)
- [OpenAI Matryoshka Embeddings - Pinecone](https://www.pinecone.io/learn/openai-embeddings-v3/)
- [Ollama Embedding Models](https://ollama.com/blog/embedding-models)
- [Best Embedding Models 2025 - Ailog](https://app.ailog.fr/en/blog/guides/choosing-embedding-models)
- [Rerankers for RAG - Analytics Vidhya](https://www.analyticsvidhya.com/blog/2025/06/top-rerankers-for-rag/)
- [Hybrid Search & Reranking - Superlinked](https://superlinked.com/vectorhub/articles/optimizing-rag-with-hybrid-search-reranking)

---

## Appendix: Model Selection Decision Tree

```
Need offline/local capability?
├─ Yes → nomic-embed-text-v1.5 (Ollama)
│         ├─ Need multilingual? → BGE-M3
│         └─ Need max accuracy? → mxbai-embed-large
└─ No (API is fine)
    ├─ Cost-sensitive?
    │   ├─ Yes → text-embedding-3-small @ 512 dims
    │   └─ Same budget, better quality? → voyage-3.5-lite
    └─ Quality-focused?
        ├─ Yes → voyage-3-large or text-embedding-3-large
        └─ Free tier preferred? → gemini-embedding-001
```
