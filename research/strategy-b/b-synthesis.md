# B-Synth: Strategy B Synthesis

## Executive Summary
The three Strategy B agents collectively identified a mature, self-aware specification that thoroughly documents what NOT to do (anti-patterns, invariants) but has significant gaps in terminology alignment, implementation guidance, and philosophical framing. The most critical finding is the HumanWork-Evolution.md document which already synthesizes feedback into a phased improvement plan - agents B1-B3 largely validated and expanded on this existing gap analysis.

## Cross-Agent Patterns

**Theme 1: Semantic Search Underperformance**
All three agents found semantic search unreliable for multi-word conceptual queries. All fell back to keyword search frequently. This is the strongest cross-agent signal about the mdtldr tool.

**Theme 2: HumanWork-Evolution.md as Critical Source**
Both B1 and B2 independently discovered this document as the authoritative source for gaps and critiques, validating its importance.

**Theme 3: Human-First Philosophy with Acknowledged Tensions**
All agents found the docs emphasize human control, but B2 identified a philosophical gap: the spec frames human control as end-state rather than transition phase toward "intelligence crystallization."

**Theme 4: Section-Level Context Extraction Praised**
All three agents highlighted the `--section` flag as highly effective for targeted retrieval.

**Theme 5: Checkpoint/Intervention Architecture**
B1 found checkpoints in anti-patterns, B3 found them in workflow design - the spec heavily emphasizes checkpoints as the key governance mechanism.

## Consolidated Findings

### Architecture Criticisms (from B1)

**External Criticisms (of traditional approaches):**
- Brittleness of pure automation (combinatorial explosion of rules)
- Coordination Trap (multiplies human translation work)
- Innovation Strangulation (automation-incompatible approaches avoided)
- Judgment Gap (80% flawless, 20% chaos)
- Context Collapse (context as configuration, not conversation)
- Observability Problem (black-box agents kill trust)

**Self-Imposed Constraints (internal guardrails):**
- 8 Architectural Invariants (no hidden state, no irreversible execution, etc.)
- 7 Memory Model Anti-Patterns
- 8 Workflow Anti-Patterns

**Open Questions (acknowledged gaps):**
- Alignment with human values at scale
- Limits of organizational intelligence
- Preventing organizational capture (self-perpetuation)

### Gaps Identified (from B2)

**Terminology Gaps:**
- Agent -> Actor (unified human/machine)
- Artifact -> Deliverable (business language)
- Event Memory -> The Ledger (IP capture emphasis)

**Missing Primitives:**
- Correction Event (captures human intelligence on modifications)
- Authority Gradient (replaces binary control)
- Pattern Crystallization (organizational learning mechanism)

**Architectural Gaps:**
- No geometric/semantic embeddings in Semantic Memory
- Cost model doesn't unify human hours and AI tokens
- Privacy model is "policy overlay" only
- No formal API specification

**Philosophical Gap:**
- Spec positions "human control" as goal
- Feedback suggests reframing as "intelligence extraction"
- Human corrections should become portable organizational intelligence

### Workflow Improvements (from B3)

**Core Philosophy:**
- Workflows as "guidance without control"
- Six concepts: Entry Signals, Roles, Phases, Activities, Checkpoints, Exit Conditions
- Checkpoints as primary governance mechanism

**Authority Gradient (4 modes):**
1. Instructional: Step-by-step human instructions
2. Consultative: Human defines goal, agent proposes
3. Supervisory: Agents execute, humans monitor
4. Exploratory: Alternating generation/testing

**Intervention Points:**
- Redirect, Override, Inject, Escalate

**Key Patterns:**
- Time Travel and Branching
- Parallel Exploration
- Immutable Workflow Versioning

**Organizational Transformation:**
- Choreographic Maturity Model (4 levels)
- Cultural shifts toward experimental mindsets

## Proposed Spec Changes (Prioritized)

### High Priority
- [ ] Rename Artifact -> Deliverable throughout (B2)
- [ ] Add Correction Event primitive (B2) - captures IP when humans modify outputs
- [ ] Add Authority Gradient to Execution Model (B2, B3) - instructional/consultative/supervisory/exploratory
- [ ] Expand Judgment Gap (80/20 problem) handling beyond "humans intervene" (B1)
- [ ] Add "Known Limitations and Trade-offs" section (B1) - what HumanWork sacrifices
- [ ] Unify cost model for Human + Machine Actors (B2)

### Medium Priority
- [ ] Add Actor primitive with type: Human | Machine (B2)
- [ ] Add Pattern Crystallization to Memory Model (B2)
- [ ] Rename Event Memory -> The Ledger (B2)
- [ ] Add cognitive telemetry to Checkpoints (B2) - deliberation_duration, confidence_signal, modification_depth
- [ ] Document concrete answers to Open Questions or mark as research priorities (B1)
- [ ] Create decision framework: when DAG-style execution IS appropriate (B1)
- [ ] Add explicit checkpoint requirements for high-stakes workflows (B3)
- [ ] Define minimum intervention points per workflow phase (B3)

### Low Priority
- [ ] Enhance Semantic Memory with geometric embeddings (B2)
- [ ] Add detection guidance for when Status Memory becomes authoritative (B1)
- [ ] Reframe "human control" as transition phase, not end state (B2)
- [ ] Adopt choreography language over orchestration (B2)
- [ ] Develop privacy model beyond "policy overlay" (B2)
- [ ] Create formal API specification (B2)
- [ ] Establish choreographic maturity assessment framework (B3)
- [ ] Create signals taxonomy (activity, outcome, attention, health) (B3)

## Tool Evaluation Synthesis

All three agents used the mdtldr tool extensively (38, 35, and 41 commands respectively = 114 total commands). Their assessments were remarkably consistent.

### Common Praise
- **Section-level context extraction** (`--section`) was universally praised as highly effective
- **Keyword search** was reliable and essential fallback
- **Token budget control** (`-t`) helped manage context size
- **Tree command** gave quick corpus overview
- **Fast embedding indexing** (~$0.003 cost)
- **Stats command** useful for understanding corpus size

### Common Frustrations
- **Semantic search returned 0 results** for multi-word conceptual queries (all 3 agents)
- **Token truncation** without clear indication of what was excluded
- **No way to chain or aggregate searches** - had to run many separate commands
- **Multi-word keyword searches failed** (e.g., "issue challenge gap" = 0 results)
- **False positives** in keyword search
- **No semantic search threshold adjustment**

### Suggested Improvements
- Add fuzzy/stemmed search (fail vs failure)
- Add "search within results" / progressive refinement
- Add context around keyword matches without re-running
- Add combined semantic+keyword hybrid mode
- Add cross-document synthesis
- Add batch context extraction for multiple sections/files
- Add "related sections" feature
- Add Boolean operators in keyword mode
- Add export/save functionality
- Add "what's undefined" query (terms used but not defined)

### Quantitative Summary
| Agent | Commands | Confidence | Rating |
|-------|----------|------------|--------|
| B1 | 38 | Medium | 4/5 |
| B2 | 35 | High | 4/5 |
| B3 | 41 | High | 4/5 |

All agents rated the tool 4/5 and found it significantly faster than reading all files manually.

## Methodology Assessment

How well did Strategy B (divide by question) work?

### Strengths
- **Clear scope boundaries**: Each agent had a focused research question, avoiding overlap
- **Efficient parallelization**: Three agents could work simultaneously on different questions
- **Natural synthesis path**: Findings from each question type combined naturally into a coherent picture
- **Reduced redundancy**: Agents didn't repeat the same searches (unlike Strategy A file-based division)
- **Comprehensive coverage**: Architecture + Gaps + Workflows covers the spec from multiple angles
- **Discovery of key document**: Multiple agents independently found HumanWork-Evolution.md, validating its importance

### Weaknesses
- **Question boundaries can be fuzzy**: "Architecture criticisms" vs "gaps" had some overlap (e.g., observability problem)
- **Dependent insights split**: Authority Gradient appeared in both B2 (as gap) and B3 (as workflow improvement)
- **No shared discovery context**: B2 found HumanWork-Evolution.md which would have helped B1's research
- **Variable scope difficulty**: Some questions (workflows) were more expansive than others (architecture criticisms)

### Would Recommend For
- **Documentation analysis** where questions naturally partition the content
- **Due diligence reviews** (legal, technical, financial angles)
- **Research synthesis** where multiple perspectives on same corpus needed
- **Gap analysis** where "what exists" vs "what's missing" are distinct questions
- **Any task where questions are more natural than file divisions**

### Not Recommended For
- **Code review** (files matter more than questions)
- **Tasks where answers span all questions** (high synthesis overhead)
- **Simple/small corpora** (parallelization overhead not worth it)

## Appendix: Agent Command Efficiency

| Metric | B1 | B2 | B3 | Total |
|--------|----|----|----| ------|
| Commands run | 38 | 35 | 41 | 114 |
| Semantic searches | 8 | 4 | 12 | 24 |
| Keyword searches | 22 | 23 | 0 | 45 |
| Context extractions | 13 | 9 | 19 | 41 |
| Tree/Stats/Index | 3 | 3 | 3 | 9 |

**Key observation**: B3 (workflows) used semantic search exclusively and found it more effective for their domain. B1 and B2 heavily relied on keyword search after semantic search failed. This suggests semantic search may work better for concrete concepts (workflows, collaboration) than abstract critiques (gaps, criticisms).
