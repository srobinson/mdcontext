# mdcontext Pudding Research

**"The proof is in the pudding"** - Comprehensive dogfooding and testing of mdcontext functionality.

This directory contains detailed test results, analysis, and findings from exercising mdcontext against real-world codebases.

## Test Reports

### ✅ Completed

| Report | Status | Key Findings |
|--------|--------|--------------|
| [01-index-embed.md](./01-index-embed.md) | 🔴 Critical Bug | Vector metadata save fails on large corpora |
| [02-search.md](./02-search.md) | ✅ Complete | Search functionality working well |
| [03-context.md](./03-context.md) | ✅ Complete | Context assembly excellent |
| [04-tree.md](./04-tree.md) | ✅ Complete | Tree visualization works |
| [05-config.md](./05-config.md) | ✅ Complete | Config system solid |
| [06-links.md](./06-links.md) | ✅ Complete | Link graph analysis working |
| [07-stats.md](./07-stats.md) | ✅ Complete | Stats command comprehensive |

### 🔴 Critical Findings

**Test 01 (Index & Embeddings)** uncovered a critical bug:
- **Issue**: Vector metadata save fails on large corpora (>1500 docs)
- **Severity**: P0 - Blocks production use of semantic search
- **Impact**: All embedding providers affected
- **Root Cause**: JSON.stringify size limit (~512MB)
- **Location**: `src/embeddings/vector-store.ts:401`
- **Fix Plan**: [BUG-FIX-PLAN.md](./BUG-FIX-PLAN.md)

## Quick Links

### Start Here 🎯
- **[00-EXECUTIVE-SUMMARY.md](./00-EXECUTIVE-SUMMARY.md)** - Complete testing overview, grades, and recommendations
- **[P0-BUG-VALIDATION.md](./P0-BUG-VALIDATION.md)** - Critical bug validation (100% reproducible)
- **[BUG-FIX-PLAN.md](./BUG-FIX-PLAN.md)** - Implementation plan for fix (6 hours)

### Detailed Reports
- **[01-index-embed.md](./01-index-embed.md)** - Indexing & embedding deep dive (26KB)
- **[02-search.md](./02-search.md)** - Search testing (22 scenarios, Grade: A)
- **[03-context.md](./03-context.md)** - Token budget analysis (Grade: A-)
- **[04-tree.md](./04-tree.md)** - Structure navigation testing
- **[05-config.md](./05-config.md)** - Configuration management (26KB)
- **[06-links.md](./06-links.md)** - Knowledge graph capabilities
- **[07-stats.md](./07-stats.md)** - Analytics and metrics
- **[TESTING-SUMMARY.md](./TESTING-SUMMARY.md)** - Test matrix

### Test Data
- Test corpus: agentic-flow (1561 docs, 52,714 sections)
- Reference corpus: mdcontext (120 docs, 4,234 sections)
- Test logs: `/tmp/test*.log`

## Test Coverage

### What Was Tested ✅

1. **Basic Indexing**
   - Large corpus (1561 docs): ✅ Works
   - Performance: 108 docs/sec
   - Storage: 28MB

2. **Embeddings (Multiple Providers)**
   - OpenAI (small corpus 120 docs): ✅ Works
   - OpenAI (large corpus 1558 docs): ❌ Bug validated
   - OpenRouter (large corpus 1558 docs): ❌ Bug validated
   - Ollama (large corpus 1558 docs): ❌ Bug validated
   - **100% reproducible across all providers**

3. **CLI Features**
   - JSON output: ✅ Perfect
   - Force rebuild: ✅ Works
   - Incremental updates: ✅ Excellent (28x faster)

4. **Search Functionality** (02-search.md)
   - Keyword search: ✅ Works well
   - Multi-word queries: ✅ Fixed
   - Semantic search: ⚠️ Blocked by embedding bug

5. **Context Assembly** (03-context.md)
   - Compression levels: ✅ All working
   - Token budgets: ✅ Accurate
   - Quality: ✅ High

### What Wasn't Tested ⏸️

- Anthropic embeddings (no embedding API)
- Voyage AI embeddings
- Very large corpora (>5000 docs)
- Real-time watch mode under load
- Concurrent indexing

## Performance Summary

| Operation | Speed | Cost | Storage |
|-----------|-------|------|---------|
| Basic Index (1561 docs) | 14.4s | Free | 28MB |
| OpenAI Embed (120 docs) | 64.7s | $0.011 | 69MB |
| Incremental (1 file) | 54ms | Free | Δ only |

## Bug Impact Analysis

### Working Today ✅
- Small projects (<200 docs) with embeddings
- Any size project without embeddings
- All CLI features

### Blocked 🚫
- Medium projects (200-1000 docs) with embeddings
- Large projects (>1500 docs) with embeddings
- Production semantic search on real codebases

### After Bug Fix 🔧
- All corpus sizes
- All providers
- Full semantic search capability

## Next Steps

### Immediate (P0)
1. Implement MessagePack binary format for vector metadata
2. Test fix on agentic-flow corpus
3. Deploy to production

### Short-term (P1)
1. Reduce metadata redundancy
2. Add size validation warnings
3. Test OpenAI on medium corpus (500-1000 docs)

### Medium-term (P2)
1. Benchmark search performance with embeddings
2. Test additional embedding providers
3. Optimize storage further

### Long-term (P3)
1. Consider SQLite storage backend
2. Add compression options
3. Support for partial embedding

## How to Use This Research

### For Users
- **Want embeddings?** Read [01-index-embed.md](./01-index-embed.md) Quick Reference
- **Hit a bug?** Check the Issues Found section
- **Need workarounds?** See Best Practices section

### For Developers
- **Fixing bugs?** See [BUG-FIX-PLAN.md](./BUG-FIX-PLAN.md)
- **Adding features?** Review performance benchmarks
- **Understanding codebase?** Read test methodology sections

### For Product Decisions
- **Production readiness?** See [TESTING-SUMMARY.md](./TESTING-SUMMARY.md)
- **Pricing estimates?** Check cost analysis in main report
- **Roadmap planning?** Review Next Steps section

## Acknowledgments

**Testing Methodology**: Real-world dogfooding
**Test Corpora**: agentic-flow (production codebase)
**Testing Tool**: mdcontext itself (self-hosting)
**Test Date**: 2026-01-27
**Tester**: Claude Sonnet 4.5
**Test Duration**: 90 minutes

---

**Status**: Testing complete, critical bug found, fix plan ready
**Next Action**: Implement binary format for vector metadata
