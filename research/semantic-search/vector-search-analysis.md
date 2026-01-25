# Vector Search Parameters and Scoring Analysis

## Executive Summary

The HNSW vector search configuration is **appropriate and well-tuned**. The root cause of "0 results" is **NOT the vector search algorithm**, but the **similarity threshold filtering** applied after search.

Key finding: Single-word queries have inherently lower similarity scores (30-40%) than multi-word queries (50-70%). The default 0.5 threshold filters out all single-word results.

## HNSW Configuration

### Current Parameters

From `src/embeddings/vector-store.ts:98`:

```typescript
this.index.initIndex(10000, 16, 200, 100)
//                   maxElements, M, efConstruction, efSearch
```

| Parameter | Value | Description | Assessment |
|-----------|-------|-------------|------------|
| maxElements | 10,000 | Initial capacity (auto-resizes) | Adequate |
| M | 16 | Max connections per node | Good balance |
| efConstruction | 200 | Construction-time search width | High quality |
| efSearch | 100 | Query-time search width | Good recall |

All parameters are well-tuned. No changes needed.

## Similarity Score Analysis

### Threshold Experiment

Testing "failure" at different thresholds:

| Threshold | Results | Top Score |
|-----------|---------|-----------|
| 0.0 | 10 | 39.1% |
| 0.3 | 10 | 39.1% |
| 0.4 | 0 | - |
| 0.5 | 0 | - |

### Score Distribution by Query Type

| Query Type | Score Range | Results at 0.5 |
|------------|-------------|----------------|
| Single word | 31-49% | 0 |
| Two-word domain | 54-70% | 7+ |
| Natural language | 50-66% | 9 |

## Root Cause

The 0.5 default threshold filters out single-word results (max ~49%). This is threshold calibration, not a search algorithm issue.

## Recommendations for ALP-207

1. Lower default threshold to 0.3-0.4
2. Consider adaptive threshold by query length
3. Show "N results below threshold" message
4. Make threshold more visible in docs

## Conclusion

Vector search works correctly. Focus ALP-207 on threshold tuning, not algorithmic changes.
