# Root Cause Analysis and Solution Design

## Executive Summary

**Root Cause**: The "multi-word semantic search failure" is a **threshold calibration issue**, not a search algorithm bug.

**Key Findings**:
1. Multi-word domain queries WORK correctly (60-70% similarity)
2. Single-word queries score lower (30-40%) due to embedding model properties
3. Default 0.5 threshold filters out short/abstract queries
4. The dogfooding had no embeddings built - agents fell back to keyword search
5. Embedding text format, query processing, and HNSW config are all correct

**Solution**: Lower default threshold + improve user feedback for edge cases.

## Synthesis of Diagnostic Findings

### ALP-203: Reproduction Results

| Query Type | Works at 0.5? | Score Range |
|------------|---------------|-------------|
| "failure automation" | YES | 54-62% |
| "error handling" | YES | 53-64% |
| "failure" (single) | NO | 31-39% |
| "error" (single) | NO | 32-49% |
| "gaps missing omissions" | NO | 30-35% |

**Conclusion**: Multi-word domain queries work. Short/abstract queries fail threshold.

### ALP-204: Embedding Text Analysis

- Format is correct: `# heading\nParent: X\nDocument: Y\n\ncontent`
- Follows industry best practices
- No issues identified

### ALP-205: Query Processing Analysis

- Query passed unchanged to embedding API (correct)
- Asymmetric retrieval (plain query vs enriched docs) is normal
- Query variations all work correctly

### ALP-206: Vector Search Analysis

- HNSW parameters (M=16, efConstruction=200, efSearch=100) are optimal
- Cosine distance correct for text embeddings
- Threshold filtering is the only issue

## Root Cause

**Primary Cause**: The default similarity threshold (0.5) is too high for:
1. Single-word queries (max ~49% similarity due to embedding model properties)
2. Abstract/meta-language queries
3. Non-domain-specific queries

**NOT the cause**:
- Embedding text format (correct)
- Query processing (correct)
- HNSW parameters (optimal)
- Embedding model (working as expected)

**Contributing Factor**: Dogfooding lacked embeddings, causing confusion about what was failing.

## Solution Design

### Recommended Approach: Threshold Tuning + UX Improvements

#### 1. Lower Default Threshold to 0.35

```typescript
// src/config/schema.ts
minSimilarity: Config.number('minSimilarity').pipe(Config.withDefault(0.35))
```

**Rationale**:
- Captures single-word results (30-40% range)
- Still filters irrelevant content (<30%)
- Low risk - users can adjust with --threshold

#### 2. Add "Below Threshold" Feedback

When 0 results, show hint about lower-scored results:

```
Results: 0

Note: 10 results found below 0.35 threshold (highest: 0.34)
Tip: Use --threshold 0.3 to see more results
```

#### 3. Consider Hybrid Search as Default

For queries without boolean operators, hybrid mode provides better coverage by combining semantic and keyword signals.

## Implementation Plan for Phase 2

1. **Lower default threshold** - Change config default from 0.5 to 0.35
2. **Add below-threshold feedback** - Show hint when 0 results
3. **Document threshold behavior** - Update README/help
4. **Validate changes** - Re-run test corpus

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Single-word results at default | 0 | 10+ |
| Multi-word results | 7+ | 7+ (unchanged) |

## Conclusion

The "multi-word semantic search failure" was misidentified. Multi-word queries work correctly. The issue is threshold calibration affecting single-word and abstract queries.

**Recommended Solution**: Lower threshold to 0.35, add user feedback, improve documentation.

**No algorithmic changes needed** to embedding generation, query processing, or vector search.
