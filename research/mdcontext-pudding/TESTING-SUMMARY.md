# mdcontext Testing Summary - 2026-01-27

## Tests Completed

### ✅ Successful Tests
1. **Basic Indexing** (agentic-flow, 1561 docs)
   - Duration: 14.4s
   - Storage: 28MB
   - Result: SUCCESS

2. **OpenAI Embeddings** (mdcontext, 120 docs)
   - Duration: 66.8s (1.5s index + 64.7s embed)
   - Cost: $0.011
   - Storage: 69MB (2.2M index + 66.2M embeddings)
   - Result: SUCCESS

3. **JSON Output**
   - Basic: Single-line JSON
   - Pretty: Formatted JSON
   - Result: PERFECT

4. **Force Rebuild**
   - Reindexed all 120 docs
   - Duration: 1524ms vs 47ms (incremental)
   - Result: SUCCESS

5. **Incremental Updates**
   - Modified 1 file → Only 1 file reindexed
   - Duration: 54ms (28x faster)
   - Result: EXCELLENT

### ❌ Failed Tests
6. **OpenRouter Embeddings** (agentic-flow, 1561 docs)
   - Generated embeddings: SUCCESS (101MB vectors.bin)
   - Metadata save: FAILED (JSON size limit)
   - Error: VectorStoreError - Invalid string length
   - Result: BUG FOUND

7. **Ollama Embeddings** (agentic-flow, 1561 docs)
   - Generated embeddings: SUCCESS (101MB vectors.bin)
   - Metadata save: FAILED (JSON size limit)
   - Error: Same as OpenRouter
   - Result: SAME BUG CONFIRMED

## Critical Bug Details

**Issue**: Vector metadata serialization fails on large corpora
**Root Cause**: JSON.stringify exceeds V8 string size limit (~512MB)
**Affected**: ALL embedding providers on corpora >1500 docs
**Impact**: Cannot use semantic search on production codebases

### Size Analysis
- Small corpus (120 docs, 3903 sections): 58MB metadata ✅ Works
- Large corpus (1561 docs, 52,714 sections): ~785MB metadata ❌ Fails

### Calculation
```
mdcontext:     58MB / 3,903 sections = 14.9KB per section
agentic-flow:  52,714 sections × 14.9KB = 785MB (exceeds limit)
```

## Providers Tested

| Provider | Small Corpus | Large Corpus | Status |
|----------|--------------|--------------|--------|
| OpenAI | ✅ SUCCESS | ⚠️ Untested (likely fails) | Partial |
| OpenRouter | ⚠️ Should work | ❌ FAILED | Blocked |
| Ollama | ⚠️ Should work | ❌ FAILED | Blocked |

## Performance Benchmarks

### Indexing Speed
- **Without embeddings**: ~108 docs/sec, ~3600 sections/sec
- **With embeddings (OpenAI)**: ~1.85 docs/sec, ~60 sections/sec

### Costs (OpenAI)
- Small corpus (120 docs): $0.011
- Estimated large (1561 docs): ~$0.18 (if bug fixed)

### Storage Overhead
- Basic index: ~18KB per doc
- With embeddings: ~575KB per doc (31x increase)

## Recommendations

### Priority 1: Fix Metadata Save Bug
- **Solution**: Switch to binary format (MessagePack/CBOR)
- **ETA**: 4-8 hours
- **Impact**: Unblocks all large-scale embedding use

### Priority 2: Add Early Validation
- Check estimated metadata size before processing
- Fail early with clear error message
- Prevent wasted time/money on doomed runs

### Priority 3: Optimize Metadata Size
- Currently 7x larger than binary vectors
- Audit what's stored per vector
- Remove redundant data

## Production Readiness

### Ready Now ✅
- Basic indexing (any size)
- Small corpus embeddings (<200 docs)
- All CLI features (JSON, force, incremental)

### Blocked 🚫
- Medium-large corpus embeddings (>1500 docs)
- Production semantic search

### After Bug Fix 🔧
- All corpus sizes
- All providers
- Production semantic search

## Files Generated

- `/Users/alphab/Dev/LLM/DEV/mdcontext/research/mdcontext-pudding/01-index-embed.md` (940 lines)
- Test logs in `/tmp/test*.log`
- Partial indexes in target directories

---

**Total Test Time**: 90 minutes
**Commands Executed**: 15+
**Bug Severity**: Critical (P0)
**Next Action**: Implement binary metadata format
