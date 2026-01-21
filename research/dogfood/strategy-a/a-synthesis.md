# A-Synth: Strategy A Synthesis

## Executive Summary
Three parallel agents analyzed the HumanWork specification across three documentation folders, discovering a comprehensive multi-agent orchestration system with 20 formal primitives, three-layer memory architecture, and preemptive human control. The analysis surfaced consistent tool feedback: mdtldr excels at targeted extraction via `tree`, `context`, and `search` commands but lacks directory-scoped search and semantic search by default. Agents collectively processed approximately 207K tokens of documentation while reading only ~25-30% of raw content.

## Cross-Agent Patterns

### Themes Appearing Across Multiple Folders

1. **Human Authority as Non-Negotiable** (all 3 agents)
   - A1: "Control Plane has preemptive authority over all execution"
   - A2: "Authority Gradient" - dynamic human involvement spectrum
   - A3: "The system helps humans think better - it never decides for them"

2. **Three-Layer Memory Architecture** (all 3 agents)
   - Event Memory (immutable facts/ground truth)
   - Status Memory (derived operational views)
   - Semantic Memory (AI-assisted understanding)

3. **Choreography vs Automation** (A2, A3)
   - Pure automation fails for knowledge work
   - "Choreography" as dynamic coordination metaphor
   - Trust through transparency, not assumed reliability

4. **Immutability as Foundation** (A1, A3)
   - Append-only event sourcing
   - Time travel as query, not feature
   - No hidden mutable state

5. **Trust Through Transparency** (all 3 agents)
   - Observable behavior over assumed reliability
   - Explicit audit trails
   - Radical transparency enabling intervention

6. **Workflows as Guidance Not Law** (A1, A2)
   - Reusable coordination patterns
   - No prescriptive execution logic
   - Human judgment for edge cases

## Consolidated Findings

### docs/ Folder Summary (from A1)
**10 markdown files, ~56K tokens**

Key Points:
- **20 formal primitives** with explicit guarantees defined in 02-PRIMITIVES.md
- **8 architectural invariants** as hard system rules (no hidden state, no irreversible execution, no agent-owned memory, etc.)
- **7 execution guarantees** (single-scope coherence, human control, deterministic replay, cost attribution, no hidden state, agent replaceability, workflow interoperability)
- Explicit separation of concerns: Execution / Authority / History / Understanding
- Target use cases: architecture reviews, security assessments, R&D exploration, planning sessions

Notable Discovery: Control Plane actions include pause, resume, cancel, reassign, modify_metadata, inject_step, fork, terminate - comprehensive human override capabilities.

### docs.amorphic/ Folder Summary (from A2)
**9 markdown files, ~62K tokens**

Key Points:
- **The Handoff Problem** identified as core issue - friction between human creative processes and systematic execution
- **Six Failure Modes of Pure Automation**:
  1. Brittleness of Complete Systems (combinatorial rule explosion)
  2. Coordination Trap (multiplies overhead)
  3. Innovation Strangulation (automation-incompatible = avoided)
  4. Human Bottleneck Paradox (routing around humans creates new bottlenecks)
  5. Context Collapse (no mechanism for negotiation or doubt)
  6. Judgment Gap (absence of judgment in edge cases)
- **Authority Gradient** concept: Instructional -> Consultative -> Supervisory -> Exploratory modes
- **Choreographic Maturity Model** with 4 levels from Tool Usage to Organizational Intelligence
- Memory as "connective tissue" and "geometric imprints" that participate in reasoning

Notable Discovery: "The result is brittle automation that works beautifully until it doesn't - systems that handle 80% of cases flawlessly but create chaos in the remaining 20%."

### docs.llm/ Folder Summary (from A3)
**3 markdown files, ~89K tokens**

Key Points:
- LLM-generated product vision documents exploring "HumanWork/Amorphic" platform
- **"Operating System for Work"** positioning - bridges human creativity with AI execution
- **Anti-Automation Stance** articulated with philosophical depth
- **Explicit Anti-Patterns** documented as guardrails (never hide events, never let workflows execute directly)
- **Research Frontiers** identified: organizational capture, maintaining human agency, value alignment
- **"Memory Is All You Need"** parallel drawn to Transformer attention breakthrough

Notable Discovery: "Enterprise adoption of autonomous agents has stalled due to Opacity (we don't know how the agent works) and Risk (we can't trust it to run unsupervised)."

## Proposed Spec Changes (Prioritized)

### High Priority
- [ ] **Add directory-scoped search capability** (all 3 agents) - `mdtldr search "term" docs/` currently fails with "No index found" even when index exists
- [ ] **Enable semantic search without requiring OPENAI_API_KEY by default** (A1, A3) - Consider local embedding options or better fallback messaging
- [ ] **Increase search result limit beyond 10** (A2, A3) - Add pagination or configurable limit
- [ ] **Document the Authority Gradient model from docs.amorphic** (A2) - This concept enriches the spec's human control philosophy
- [ ] **Add explicit failure mode documentation** (A2) - The six failure modes are valuable for explaining why the architecture matters

### Medium Priority
- [ ] **Add cross-reference navigation** (A1) - "Find all sections that reference this concept"
- [ ] **Multi-file context extraction** (A2) - `mdtldr context docs/*.md -t 10000`
- [ ] **Relevance ranking for search results** (A3) - Results come in document order, not relevance order
- [ ] **Section exclusion in context** (A3) - "Give me everything EXCEPT this section"
- [ ] **Stemmed/fuzzy search** (A2) - Searching "suggest" should find "suggestion"

### Low Priority
- [ ] **Section numbering consistency** (A1) - tree shows "## 1. Section" but context uses "1.1" notation
- [ ] **Fix context duplication** (A1) - `--section "Time Travel"` returned same section twice (parent and subsection)
- [ ] **Improve blurb/small file context handling** (A2) - `_0.BLURB.md` got 100% reduction to nothing
- [ ] **Export to structured format** (A3) - Programmatic extraction of findings
- [ ] **Highlight/annotation capability** (A3) - Mark sections for later reference

## Tool Evaluation Synthesis

### Common Praise
- **`tree` command**: All agents found it excellent for understanding document structure; token counts per section particularly helpful
- **`context --section` flag**: Precise extraction of specific sections; 44-61% token reduction while preserving key content
- **Boolean search operators**: AND/OR/quoted phrases worked well for targeted exploration
- **Stats command**: Quick overview of index size and distribution
- **Token budgeting**: `-t` flag and token counts throughout helped with context management
- **Index speed**: 535ms for 23 docs is fast (A1)

### Common Frustrations
- **Directory-scoped search broken**: All 3 agents reported `mdtldr search "..." docs/` fails with "No index found" even with existing index
- **10 result limit with no pagination**: Hard to know if important results are being missed
- **Semantic search requires external API key**: Keyword search adequate but limited without embeddings
- **Context truncation unpredictable**: A2 saw 100% reduction on small files; A3 felt 16% was limiting

### Suggested Improvements
1. **Directory/path filtering for search** - Critical for multi-folder repos
2. **Configurable result limits** - Let users specify max results
3. **Local embedding option** - Don't require OpenAI API for semantic search
4. **Cross-file operations** - Search + get context across multiple files at once
5. **Negative filtering** - Exclude certain directories or patterns
6. **Diff between documents** - Compare two docs or see overlap (A1)
7. **Summary generation** - AI-generated summaries of search results (A3)

## Methodology Assessment

### How well did Strategy A (divide by folder) work?

**Strengths:**
- **Natural domain boundaries**: Each folder had distinct content character (spec vs feedback vs LLM exploration)
- **Parallel efficiency**: Three agents could work simultaneously without coordination overhead
- **Complete coverage**: No content was missed; each folder fully analyzed
- **Consistent evaluation**: Same tool evaluated from three perspectives
- **Clear ownership**: Each agent knew exactly what to analyze

**Weaknesses:**
- **Cross-folder themes required synthesis**: Patterns like "Authority Gradient" appeared in multiple folders but agents couldn't discover connections
- **Uneven workload**: A3 had 89K tokens while A1 had 56K tokens - not perfectly balanced
- **Redundant tool exploration**: Each agent independently learned the tool, running similar `--help` commands
- **No real-time collaboration**: If A1 discovered something relevant to A2's folder, no mechanism to share

**Would recommend for:**
- **Large documentation corpora** with clear organizational boundaries
- **Initial exploration** when you don't know what you're looking for
- **Tool evaluation** where multiple perspectives strengthen findings
- **Time-sensitive analysis** where parallelism matters
- **Codebases with modular architecture** (by module/feature/team)

**Would NOT recommend for:**
- Highly interconnected content where cross-references are important
- Small corpora where single-agent analysis is sufficient
- Tasks requiring iterative refinement based on discoveries

---

*Synthesis completed by A-Synth*
*Input: 3 Phase 1 reports (A1, A2, A3)*
*Total tokens processed by agents: ~207K tokens of documentation*
*Total tokens actually read: ~25-30% via mdtldr context extraction*
