# Multi-Word Semantic Search Failure Reproduction

## Executive Summary

After systematic testing, the reported "multi-word semantic search failure" is **NOT a failure of semantic search itself**, but rather a **threshold calibration issue**. The root causes are:

1. **Single-word queries have low similarity scores** (30-40%) while multi-word queries have higher scores (50-70%)
2. **Default threshold of 0.5** filters out both single-word AND semantically-distant multi-word queries
3. **Queries with abstract/non-domain-specific terms** (e.g., "gaps missing omissions", "issue challenge gap") score below threshold
4. **Domain-specific multi-word queries work well** (e.g., "failure automation" = 61%, "process orchestration" = 68%)

## Test Methodology

### Test Corpus

Created a controlled test corpus in `src/__tests__/fixtures/semantic-search/multi-word-corpus/` with 6 markdown files covering:
- failure-automation.md - Failure detection and automated recovery
- job-context.md - Job execution context and metadata
- error-handling.md - Error handling patterns
- configuration-management.md - Config management practices
- distributed-systems.md - Distributed systems architecture
- process-orchestration.md - Workflow orchestration patterns

**Corpus Statistics:**
- 6 documents
- 67 sections
- 52 embedded vectors
- ~4,725 tokens

### Index Command

```bash
node dist/cli/main.js index src/__tests__/fixtures/semantic-search/multi-word-corpus --embed --force
```

## Test Results

### Multi-Word Domain-Specific Queries (DEFAULT THRESHOLD 0.5)

| Query | Results | Top Match | Top Score |
|-------|---------|-----------|-----------|
| "failure automation" | 7 | failure-automation.md: Best Practices | 61.6% |
| "job context" | 4 | job-context.md: What is Job Context? | 60.4% |
| "error handling" | 7 | error-handling.md: Introduction | 63.7% |
| "configuration management" | 8 | configuration-management.md: Overview | 69.5% |
| "distributed systems" | 4 | distributed-systems.md: What Are... | 61.0% |
| "process orchestration" | 8 | process-orchestration.md: Introduction | 68.0% |

**Finding:** Multi-word queries with domain-specific terms **WORK WELL** with default threshold.

### Single-Word Queries (DEFAULT THRESHOLD 0.5)

| Query | Results | Notes |
|-------|---------|-------|
| "failure" | 0 | Below 0.5 threshold |
| "automation" | 0 | Below 0.5 threshold |
| "context" | 0 | Below 0.5 threshold |
| "error" | 0 | Below 0.5 threshold |

### Single-Word Queries (THRESHOLD 0.3)

| Query | Results | Top Match | Top Score |
|-------|---------|-----------|-----------|
| "failure" | 10 | failure-automation.md: Failure Isolation | 39.1% |
| "automation" | 10 | (similar) | ~35% |
| "error" | 10 | error-handling.md: Programming Errors | 49.1% |

**Finding:** Single-word queries have inherently **LOW similarity scores** (30-49%) due to:
1. Short query embeddings lack semantic context
2. Embedding model produces less distinctive vectors for single words
3. Cosine similarity between short and long vectors is compressed

### Abstract/Generic Multi-Word Queries (DEFAULT THRESHOLD 0.5)

| Query | Results | Notes |
|-------|---------|-------|
| "issue challenge gap" | 0 | Abstract terms, no domain match |
| "gaps missing omissions" | 0 | Meta-language about content, not content itself |

### Abstract Queries (THRESHOLD 0.3)

| Query | Results | Top Match | Top Score |
|-------|---------|-----------|-----------|
| "issue challenge gap" | 10 | distributed-systems.md: Consistency vs Availability | 40.8% |
| "gaps missing omissions" | 3 | error-handling.md: Programming Errors | 35.0% |

**Finding:** Abstract/meta-language queries score **30-40%** - below default threshold but findable with lower threshold.

### Hybrid Search Results

| Query | Hybrid Results | Primary Source |
|-------|---------------|----------------|
| "failure automation" | 7 | Semantic (RRF ~1.6) |
| "job context" | 4 | Semantic (RRF ~1.6) |

**Finding:** Hybrid search successfully combines semantic and keyword results, but the semantic component still uses the threshold filter.

## Pattern Analysis

### What Works (>50% similarity)
- Multi-word queries with **domain-specific terms** directly present in content
- Queries that form **coherent concepts** (e.g., "process orchestration")
- Queries that match **document titles or major headings**

### What Fails at Default Threshold
- **Single words** - all score 30-49%
- **Abstract meta-language** - "gaps", "issues", "challenges" without domain context
- **Non-domain queries** searching indexed domain content
- **Very short queries** (1-2 generic words)

### Similarity Score Distribution

```
70%+ : Document title/heading exact concept matches
60-70%: Multi-word domain queries matching content topics
50-60%: Multi-word queries with partial concept overlap
40-50%: Single words or abstract queries with some relevance
30-40%: Tangentially related content
<30% : Unrelated content (correctly filtered)
```

## Dogfooding Context

The dogfooding agents reported semantic search as "unreliable for multi-word conceptual queries". Re-analysis shows:

1. **No embeddings were built** during dogfooding (only keyword index existed)
2. Semantic search was **unavailable** - falling back to keyword search
3. Multi-word **keyword** searches like "failure automation" worked
4. Multi-word keyword searches as **quoted phrases** returned 0 (expecting exact text)
5. Abstract queries like "gaps missing omissions" correctly returned 0 (phrase not in content)

The actual issue was:
- **Semantic search unavailable** (no embeddings)
- **Keyword phrase search** misunderstood (quoted = exact match)
- **Abstract conceptual queries** don't match concrete content via keyword

## Recommendations

### For ALP-204 (Embedding Text Analysis)
- Analyze how `generateEmbeddingText()` combines section context
- Check if heading + parent + content provides enough semantic signal for short queries

### For ALP-205 (Query Processing)
- Query text is passed directly to embedding - no preprocessing
- Consider query expansion for short queries

### For ALP-206 (Vector Search Parameters)
- Default threshold of 0.5 is **too high** for single-word queries
- Consider adaptive thresholds based on query length
- Consider returning top-K results regardless of threshold, then filtering

### For ALP-207 (Solution Design)
Key solutions to consider:
1. **Adaptive threshold** - lower for short queries
2. **Query expansion** - augment short queries with context
3. **Better user feedback** - show "X results below threshold" message
4. **Threshold documentation** - educate users on --threshold flag

## Conclusion

Multi-word semantic search **is working correctly** for domain-specific queries. The perceived "failure" is a combination of:
1. No embeddings in dogfooding environment
2. Threshold too high for short/abstract queries
3. Confusion between keyword phrase search and semantic search
4. Users expecting semantic search to understand meta-language about content

The fix is NOT to change semantic search algorithm, but to:
1. Calibrate default threshold appropriately
2. Add query-length-aware threshold adjustment
3. Improve error messages when no results found
4. Consider hybrid search as default mode
