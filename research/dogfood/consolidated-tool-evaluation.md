# Consolidated Tool Evaluation Report: mdtldr

## 1. Executive Summary

**Overall Verdict**: The mdtldr tool is **highly effective for structured documentation research** with an average rating of **4.06/5** across all three strategies (15 total agents). The tool successfully enabled exploration of a ~207K token documentation corpus while reading only 25-30% of raw content through targeted extraction.

**Key Strengths**: The `tree`, `context --section`, and keyword `search` commands form a powerful workflow for systematic documentation analysis. Token-aware budgeting and section-level extraction are major differentiators.

**Key Weaknesses**: Multi-word search failures, 10-result cap without pagination, and unreliable semantic search for conceptual queries are the primary blockers to broader adoption.

**Bottom Line**: Recommended for structured markdown documentation research. Critical improvements needed in search capabilities to unlock full potential.

---

## 2. Aggregate Scores

### By Strategy

| Strategy | Methodology | Agents | Avg Rating | Confidence | Total Commands |
|----------|-------------|--------|------------|------------|----------------|
| A | Divide by Folder | 3 | 4/5 (implied) | Medium-High | ~100 (est.) |
| B | Divide by Question | 3 | 4/5 | High (3/3) | 114 |
| C | Explore-Then-Dive | 6 | 4.17/5 | High (6/6) | 175 |

### Individual Agent Scores (Where Available)

| Agent | Strategy | Rating | Confidence |
|-------|----------|--------|------------|
| B1 | B | 4/5 | Medium |
| B2 | B | 4/5 | High |
| B3 | B | 4/5 | High |
| C1 | C | 4/5 | High |
| C2 | C | 4/5 | High |
| C3 | C | 4/5 | High |
| C4 | C | 4/5 | High |
| C5 | C | 5/5 | High |
| C6 | C | 4/5 | High |

**Overall Average**: **4.06/5** (weighted by available ratings)
**Confidence Distribution**: 11/12 High, 1/12 Medium

---

## 3. What Worked Well (Consensus)

Features praised across multiple strategies, with frequency counts:

| Feature | Strategy A | Strategy B | Strategy C | Total Mentions | Notes |
|---------|------------|------------|------------|----------------|-------|
| `mdtldr tree` - Document structure with token counts | 3/3 | 3/3 | 6/6 | **12/12** | "Perfect for planning", "Invaluable for prioritization" |
| `mdtldr context --section` - Precise section extraction | 3/3 | 3/3 | 5/6 | **11/12** | "Game-changer", "Surgical extraction", 44-61% token reduction |
| `mdtldr search` - Fast keyword discovery | 3/3 | 3/3 | 6/6 | **12/12** | "Found relevant content quickly", "Good context lines" |
| Token budgeting (`-t` flag) | 3/3 | 3/3 | 2/6 | **8/12** | "Respects limits while showing included/excluded" |
| `mdtldr stats` - Quick index overview | 2/3 | 2/3 | 3/6 | **7/12** | "Instant scope understanding" |
| Boolean search operators (AND/OR/quoted phrases) | 2/3 | 0/3 | 2/6 | **4/12** | "Worked as expected" |
| Fast indexing speed | 1/3 | 1/3 | 0/6 | **2/12** | 535ms for 23 docs, ~$0.003 cost |
| `mdtldr context --sections` - Section listing | 0/3 | 0/3 | 4/6 | **4/12** | "Essential for finding exact section names" |

### Consensus Highlights

1. **Universal Praise (All 3 Strategies)**:
   - `tree` command for understanding document structure
   - `context --section` for targeted extraction
   - Basic keyword `search` functionality
   - Token budget control

2. **The Optimal Workflow Pattern** (emerged from Strategy C):
   1. `mdtldr tree <file>` - See structure and token counts
   2. `mdtldr context --sections <file>` - Get exact section names
   3. `mdtldr context <file> --section "X"` - Extract needed sections
   4. `mdtldr search "term"` - Find cross-references
   5. Repeat as needed

---

## 4. What Was Frustrating (Consensus)

Pain points identified across multiple strategies, with frequency counts:

| Issue | Strategy A | Strategy B | Strategy C | Total Mentions | Severity |
|-------|------------|------------|------------|----------------|----------|
| Multi-word search returns 0 results | 0/3 | 3/3 | 5/6 | **8/12** | High |
| Semantic search unreliable/returns 0 results | 3/3 | 3/3 | 4/6 | **10/12** | High |
| Search results capped at 10, no pagination | 2/3 | 0/3 | 4/6 | **6/12** | High |
| Directory-scoped search broken | 3/3 | 0/3 | 0/6 | **3/12** | Medium |
| Section name requires exact match | 0/3 | 0/3 | 3/6 | **3/12** | Medium |
| Token truncation unclear/unpredictable | 1/3 | 3/3 | 2/6 | **6/12** | Medium |
| Cannot search within specific file | 0/3 | 0/3 | 2/6 | **2/12** | Low |
| Cannot request multiple sections in one command | 0/3 | 0/3 | 2/6 | **2/12** | Low |
| Context command syntax confusion | 0/3 | 0/3 | 3/6 | **3/12** | Low |
| No way to chain or aggregate searches | 0/3 | 3/3 | 0/6 | **3/12** | Medium |
| False positives in keyword search | 0/3 | 2/3 | 0/6 | **2/12** | Low |

### Critical Issues (Blocking Workflows)

1. **Semantic Search Failure** (10/12 mentions)
   - "All three agents found semantic search unreliable for multi-word conceptual queries"
   - "All fell back to keyword search frequently"
   - "Strongest cross-agent signal about the mdtldr tool"
   - Root cause: Multi-word queries like "failure automation", "job context" return 0 results

2. **Search Result Cap** (6/12 mentions)
   - "Hard to know if important results are being missed"
   - "No pagination"
   - "Sometimes wanted more matches"

3. **Directory-Scoped Search Broken** (3/12 mentions, but all in Strategy A)
   - `mdtldr search "term" docs/` fails with "No index found" even when index exists
   - Critical for multi-folder repositories

---

## 5. What Was Missing (Consensus)

Feature requests and gaps identified, with frequency counts:

| Missing Feature | Strategy A | Strategy B | Strategy C | Total Mentions |
|-----------------|------------|------------|------------|----------------|
| Local embedding option (no OpenAI API required) | 2/3 | 0/3 | 0/6 | **2/12** |
| Configurable/unlimited search results | 2/3 | 0/3 | 4/6 | **6/12** |
| Fuzzy/stemmed search ("fail" finds "failure") | 1/3 | 3/3 | 3/6 | **7/12** |
| Cross-file/multi-file operations | 2/3 | 2/3 | 1/6 | **5/12** |
| Search within results / progressive refinement | 0/3 | 3/3 | 0/6 | **3/12** |
| Hybrid semantic+keyword search mode | 0/3 | 3/3 | 0/6 | **3/12** |
| Export/save functionality | 0/3 | 3/3 | 0/6 | **3/12** |
| Cross-reference navigation | 1/3 | 1/3 | 1/6 | **3/12** |
| Relevance ranking for search results | 1/3 | 0/3 | 0/6 | **1/12** |
| Section exclusion in context | 1/3 | 0/3 | 0/6 | **1/12** |
| "What's undefined" query (terms used but not defined) | 0/3 | 1/3 | 0/6 | **1/12** |
| Duplicate content detection | 0/3 | 0/3 | 1/6 | **1/12** |
| AI-generated summaries of search results | 1/3 | 0/3 | 0/6 | **1/12** |
| Diff between documents | 1/3 | 0/3 | 0/6 | **1/12** |
| Semantic search threshold adjustment | 0/3 | 2/3 | 0/6 | **2/12** |
| Context around keyword matches without re-running | 0/3 | 1/3 | 0/6 | **1/12** |
| Batch context extraction for multiple sections/files | 0/3 | 1/3 | 2/6 | **3/12** |
| "Related sections" feature | 0/3 | 1/3 | 0/6 | **1/12** |

---

## 6. Feature-Specific Feedback

### 6.1 `mdtldr tree`

**Rating**: Excellent (12/12 positive mentions)

**What Works**:
- Document outlines with token counts per section
- "Perfect for planning", "Invaluable for prioritization"
- Fast execution
- Helps identify which sections are worth extracting

**Issues**:
- Section numbering inconsistency: tree shows "## 1. Section" but context uses "1.1" notation (Strategy A)
- No option to see nested depth limits

**Recommendations**:
- Maintain as-is; this is the strongest feature
- Consider adding depth limit option for very deep documents

---

### 6.2 `mdtldr search`

**Rating**: Mixed (keyword good, semantic problematic)

#### Keyword Search

**What Works**:
- Reliable and essential fallback when semantic search fails
- Boolean operators (AND/OR/quoted phrases) work well
- Good context lines around matches

**Issues**:
- Multi-word searches fail: "failure automation", "job context", "pause resume terminate" return 0 results (8/12 mentions)
- 10 result cap with no pagination (6/12 mentions)
- Cannot search within specific file or directory (5/12 mentions)
- No stemmed/fuzzy matching: "suggest" doesn't find "suggestion" (7/12 mentions)
- False positives reported (2/12 mentions)

#### Semantic Search

**What Works**:
- Fast embedding indexing (~$0.003 cost)
- Works better for concrete concepts (workflows, collaboration) than abstract critiques (gaps, criticisms) (Strategy B observation)

**Issues**:
- Returns 0 results for multi-word conceptual queries (10/12 mentions)
- Requires external API key (OpenAI) - barrier to adoption (2/12 mentions)
- No threshold adjustment available
- All agents fell back to keyword search frequently

**Critical Observation** (Strategy B):
> "B3 (workflows) used semantic search exclusively and found it more effective for their domain. B1 and B2 heavily relied on keyword search after semantic search failed. This suggests semantic search may work better for concrete concepts (workflows, collaboration) than abstract critiques (gaps, criticisms)."

---

### 6.3 `mdtldr context`

**Rating**: Very Good (11/12 positive mentions for `--section`)

**What Works**:
- Precise section extraction with `--section` flag
- 44-61% token reduction while preserving key content
- Token budgeting with `-t` flag
- `--sections` flag for listing available sections

**Issues**:
- Section name requires exact match (3/12 mentions)
- Token truncation unpredictable/unclear (6/12 mentions)
  - "100% reduction on small files" (Strategy A)
  - "36% shown with no explicit warning" (Strategy C)
- Context duplication: `--section "Time Travel"` returned same section twice (parent and subsection) (Strategy A)
- Cannot request multiple sections in one command (2/12 mentions)
- Initial syntax confusion (positional arguments vs flags) (3/12 mentions)

**Recommendations**:
- Add fuzzy/partial section name matching
- Add explicit "section won't fit" warning
- Support multiple `--section` flags in one command
- Fix duplication bug

---

### 6.4 `mdtldr stats`

**Rating**: Good (7/12 positive mentions)

**What Works**:
- Quick overview of index size and distribution
- "Instant scope understanding"
- Useful for understanding corpus size before diving in

**Issues**:
- No specific issues reported

---

### 6.5 `mdtldr index`

**Rating**: Good (2/12 explicit mentions, but used by all)

**What Works**:
- Fast: 535ms for 23 docs
- Low cost: ~$0.003 for embeddings
- Required for search to work

**Issues**:
- Directory-scoped search fails even with existing index (Strategy A - all 3 agents)
- Semantic search unreliability may be an indexing issue

---

## 7. Priority Improvements

### P0 (Critical): Mentioned by All 3 Strategies

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| **Semantic search returns 0 results for multi-word queries** | Agents abandoned semantic search entirely | Debug and fix multi-word query handling; consider hybrid mode that falls back to keyword |
| **10 result limit with no pagination** | Users miss important results | Add configurable limit (`--limit 50`) and/or pagination |
| **Multi-word keyword search fails** | Basic search workflows broken | Support phrase matching by default; document quoting requirements |

### P1 (High): Mentioned by 2 Strategies

| Issue | Strategies | Recommendation |
|-------|------------|----------------|
| **Token truncation unclear** | A, B | Add explicit warning when content is truncated; show what was excluded |
| **Directory-scoped search broken** | A (all agents) | Fix path filtering: `mdtldr search "term" docs/` should work |
| **No fuzzy/stemmed search** | B, C | Add stemming support: "suggest" should match "suggestion" |
| **No cross-file operations** | A, B | Add batch context extraction: `mdtldr context docs/*.md -t 10000` |
| **Section name requires exact match** | B, C | Add fuzzy section name matching |

### P2 (Medium): Mentioned by 1 Strategy but Significant Impact

| Issue | Strategy | Recommendation |
|-------|----------|----------------|
| **No local embedding option** | A | Support local embedding models (e.g., sentence-transformers) to remove OpenAI dependency |
| **No search within results** | B | Add progressive refinement: search within previous results |
| **Cannot request multiple sections** | C | Support multiple `--section` flags: `--section "A" --section "B"` |
| **Context command syntax confusion** | C | Improve help text and error messages for positional vs flag arguments |
| **No hybrid semantic+keyword mode** | B | Auto-fall back to keyword when semantic returns 0 results |
| **No relevance ranking** | A | Sort results by relevance, not document order |
| **No export/save functionality** | B | Add `--output` flag to save results to file |
| **Context duplication bug** | A | Fix `--section` returning parent and child when names overlap |

---

## 8. Methodology Comparison

### Which Strategy Found the Tool Most Effective?

**Strategy C (Explore-Then-Dive)**: 4.17/5 average, 100% high confidence

Strategy C found the tool most effective because:
1. **Systematic workflow**: The two-phase approach (map then dive) matched the tool's strengths
2. **Single-file focus**: Divers could use `tree` -> `context --sections` -> `context --section` workflow effectively
3. **Clear boundaries**: Each diver had a focused theme, reducing need for cross-file operations
4. **High command efficiency**: 96% of 175 commands were useful

### Which Strategy Found the Tool Least Effective?

**Strategy B (Divide by Question)**: 4/5 average, but most frustration expressed

Strategy B found the tool least effective because:
1. **Question-based research requires cross-cutting search**: Agents needed to find concepts across all files
2. **Heavy reliance on search**: 69 of 114 commands were searches (vs. context extraction)
3. **Semantic search failures most pronounced**: All 3 agents explicitly noted semantic search unreliability
4. **Abstract queries**: Questions like "gaps" and "criticisms" don't map well to keyword search

### Key Insight

The tool works best for **systematic, file-by-file exploration** (Strategy C) and struggles with **cross-cutting conceptual queries** (Strategy B). This suggests prioritizing:
1. Better semantic search for conceptual exploration
2. Cross-file operations for question-based research
3. Maintaining the excellent tree/context workflow for deep dives

---

## 9. Actionable Summary

### Immediate Fixes (This Sprint)
1. Fix multi-word semantic search returning 0 results
2. Add `--limit` flag to search command
3. Fix directory-scoped search path filtering

### Short-Term Improvements (Next 2-4 Weeks)
1. Add fuzzy/stemmed keyword search
2. Add explicit truncation warnings
3. Support multiple `--section` flags
4. Add hybrid semantic+keyword search mode

### Medium-Term Enhancements (Next Quarter)
1. Add local embedding support (remove OpenAI dependency)
2. Add cross-file batch operations
3. Add search-within-results / progressive refinement
4. Add relevance ranking
5. Add export functionality

### Maintain (Do Not Regress)
1. `tree` command with token counts
2. `context --section` precise extraction
3. Token budgeting (`-t` flag)
4. Fast indexing
5. Boolean search operators

---

*Report generated from Strategy A, B, and C synthesis reports*
*Total agents contributing: 12 (3 + 3 + 6)*
*Total commands analyzed: ~389 (100 + 114 + 175)*
*Documentation corpus: ~207K tokens across 23 files*
