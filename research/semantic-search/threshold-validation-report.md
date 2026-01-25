# Threshold Validation Report

## Summary

Validation confirms that lowering the default similarity threshold from 0.5 to 0.35 (ALP-208) **fixes single-word query failures** without regressing multi-word query performance.

## Test Environment

- **Test Corpus**: `src/__tests__/fixtures/semantic-search/multi-word-corpus/`
- **Documents**: 6 markdown files (failure-automation, job-context, error-handling, configuration-management, distributed-systems, process-orchestration)
- **Sections**: 52 embedded vectors
- **Date**: 2026-01-26

## Before/After Comparison

### Single-Word Queries

| Query | Before (0.5) | After (0.35) | Top Match | Top Score |
|-------|-------------|--------------|-----------|-----------|
| "failure" | 0 results | **6 results** | failure-automation.md: Failure Isolation | 39.0% |
| "error" | 0 results | **7 results** | error-handling.md: Programming Errors | 49.1% |
| "automation" | 0 results | **10 results** | failure-automation.md: Overview | 44.9% |
| "context" | 0 results | **10 results** | job-context.md: What is Job Context? | 48.1% |

**Improvement**: 100% of single-word queries now return relevant results.

### Multi-Word Queries (Regression Check)

| Query | Before (0.5) | After (0.35) | Top Match | Top Score |
|-------|-------------|--------------|-----------|-----------|
| "failure automation" | 7 results | 10 results | failure-automation.md: Best Practices | 61.5% |
| "job context" | 4 results | 7 results | job-context.md: What is Job Context? | 60.4% |
| "error handling" | 7 results | 10 results | error-handling.md: Introduction | 63.6% |
| "configuration management" | 8 results | 10 results | configuration-management.md: Overview | 69.5% |
| "distributed systems" | 4 results | 10 results | distributed-systems.md: What Are... | 60.9% |
| "process orchestration" | 8 results | 10 results | process-orchestration.md: Introduction | 67.9% |

**Finding**: No regression. Multi-word queries actually return MORE results (expected, since threshold is lower), with the same top matches and scores.

## Success Criteria Validation

- [x] **Single-word queries return results at default threshold** - All 4 test queries now return 6-10 results
- [x] **Multi-word queries work as before (no regression)** - All 6 queries return results with same top matches
- [x] **Quantitative improvement documented** - See tables above

## Below-Threshold Feedback (ALP-209)

The new feedback feature correctly reports results below threshold:

```json
{
  "results": [...6 results...],
  "belowThresholdCount": 14,
  "belowThresholdHighest": 0.349
}
```

This helps users understand that more content exists if they lower the threshold.

## Conclusion

The threshold change from 0.5 to 0.35 is validated as the correct fix:

1. **Single-word queries now work** - Users can search for concepts like "failure", "error", "context"
2. **Multi-word queries unaffected** - High-quality results with same top matches
3. **User guidance in place** - Documentation (ALP-210) explains threshold behavior
4. **Below-threshold feedback** - Users see when lowering threshold would help

The root cause identified in ALP-207 (threshold too high for short queries scoring 30-40%) is confirmed fixed.
