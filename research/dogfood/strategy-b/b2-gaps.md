# Report: B2 - Gap Finder

## Mission

Find gaps and missing elements in the specification

## Research Question

What's missing from the spec? What gaps were identified?

## Command Log

| #   | Command                                                                                | Purpose                 | Result                                              | Useful?   |
| --- | -------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------- | --------- |
| 1   | `mdtldr --help`                                                                        | Learn tool              | Showed all commands and examples                    | Yes       |
| 2   | `mdtldr index`                                                                         | Index markdown files    | 23 docs, 922 sections indexed                       | Yes       |
| 3   | `mdtldr tree`                                                                          | List all files          | Showed 23 files in docs/, docs.amorphic/, docs.llm/ | Yes       |
| 4   | `mdtldr search "gaps missing omissions"`                                               | Find gap mentions       | 0 results (semantic)                                | No        |
| 5   | `mdtldr search "gaps missing omissions" --mode keyword`                                | Find gap mentions       | 0 results                                           | No        |
| 6   | `mdtldr search "missing" --mode keyword`                                               | Find missing items      | 10 results - found "missing primitive" narrative    | Yes       |
| 7   | `mdtldr search "gap" --mode keyword`                                                   | Find gap mentions       | 8 results - found "Judgment Gap", "AI fatigue gap"  | Yes       |
| 8   | `mdtldr search "TODO" --mode keyword`                                                  | Find TODOs              | 1 result (Letta integration)                        | Minimal   |
| 9   | `mdtldr search "not yet" --mode keyword`                                               | Find incomplete         | 10 results (mostly SPEC.md headers)                 | No        |
| 10  | `mdtldr search "incomplete" --mode keyword`                                            | Find incomplete         | 2 results                                           | Minimal   |
| 11  | `mdtldr search "needs" --mode keyword`                                                 | Find needs              | 10 results - coordination, clarification needs      | Yes       |
| 12  | `mdtldr search "question" --mode keyword`                                              | Find questions          | 10 results                                          | Minimal   |
| 13  | `mdtldr search "problem" --mode keyword`                                               | Find problems           | 10 results - handoff problem, problem space         | Yes       |
| 14  | `mdtldr search "issue" --mode keyword`                                                 | Find issues             | 10 results - mostly examples                        | Minimal   |
| 15  | `mdtldr search "limitation" --mode keyword`                                            | Find limitations        | 3 results - judgment limitation                     | Yes       |
| 16  | `mdtldr search "concern" --mode keyword`                                               | Find concerns           | 10 results - architecture concerns                  | Minimal   |
| 17  | `mdtldr search "feedback" --mode keyword`                                              | Find feedback           | 10 results - key evolution doc                      | Yes       |
| 18  | `mdtldr context docs.llm/feedback.md -t 3000`                                          | Get feedback context    | Truncated summary                                   | Partial   |
| 19  | `mdtldr search "recommend" --mode keyword`                                             | Find recommendations    | 10 results - recommendation primitive               | Yes       |
| 20  | `mdtldr search "suggested" --mode keyword`                                             | Find suggestions        | 6 results                                           | Minimal   |
| 21  | `mdtldr search "should" --mode keyword`                                                | Find should-statements  | 10 results - evolution suggestions                  | Yes       |
| 22  | `mdtldr context docs/HumanWork-Evolution.md --full`                                    | Get evolution doc       | Full synthesis of all gaps                          | Critical  |
| 23  | `mdtldr search "security" --mode keyword`                                              | Find security gaps      | 10 results                                          | Minimal   |
| 24  | `mdtldr search "failure" --mode keyword`                                               | Find failure handling   | 10 results - failure recovery                       | Minimal   |
| 25  | `mdtldr search "privacy" --mode keyword`                                               | Find privacy gaps       | 2 results - minimal coverage                        | Yes (gap) |
| 26  | `mdtldr context docs/03-ORG_WORKSPACE_MODEL.md --section "11. Privacy and Visibility"` | Get privacy details     | Very brief - "policy overlay"                       | Yes (gap) |
| 27  | `mdtldr search "cost" --mode keyword`                                                  | Find cost model         | 10 results - basic cost tracking                    | Yes       |
| 28  | `mdtldr search "testing" --mode keyword`                                               | Find testing mentions   | 10 results - mostly examples                        | Minimal   |
| 29  | `mdtldr search "API" --mode keyword`                                                   | Find API spec           | 10 results - no formal API spec                     | Yes (gap) |
| 30  | `mdtldr context docs/05-MEMORY_MODEL.md --section "15. Implementation Guidance"`       | Get impl guidance       | Technology suggestions only                         | Yes       |
| 31  | `mdtldr search "evolution" --mode keyword`                                             | Find evolution plans    | 10 results - evolution document                     | Yes       |
| 32  | `mdtldr context docs/LETTA_INTEGRATION_PLAN.md -t 3000`                                | Get Letta plan          | Integration phases                                  | Yes       |
| 33  | `mdtldr search "rename" --mode keyword`                                                | Find rename suggestions | 1 result - terminology changes                      | Yes       |
| 34  | `mdtldr search "replaces" --mode keyword`                                              | Find replacements       | 2 results - Actor/Deliverable                       | Yes       |
| 35  | `mdtldr stats`                                                                         | Index statistics        | 23 docs, 922 sections, 178K tokens                  | Yes       |

## Findings

### Key Discoveries

The most critical finding is the **HumanWork-Evolution.md** document which synthesizes all feedback into a comprehensive gap analysis. This document reveals 7 major categories of gaps:

#### 1. Terminology/Primitive Gaps

The spec uses outdated or suboptimal terminology:

- "Agent" should become "Actor" (unified human/machine)
- "Artifact" should become "Deliverable" (business language)
- "Event Memory" should become "The Ledger" (emphasizes IP capture)

#### 2. Missing Primitives

Several critical primitives are not defined in the spec:

- **Correction Event** - captures human intelligence when modifying outputs
- **Authority Gradient** - replaces binary control with spectrum
- **Pattern Crystallization** - organizational learning mechanism

#### 3. Philosophical Framing Gap

The spec frames human control as the end state, but feedback suggests:

- Human control is a **transition phase**, not end state
- System should extract and crystallize human intelligence
- Progressive transfer of decision-making to Actors

#### 4. Memory Model Gaps

- No geometric/semantic embeddings in Semantic Memory
- No Pattern Crystallization operation
- Missing cognitive telemetry at checkpoints

#### 5. Cost Model Gaps

- Human hours and AI tokens not unified
- Actor cost attribution not formalized
- No cost model for Actor.type (Human vs Machine)

#### 6. Privacy/Security Gap

The privacy section is minimal - described as a "policy overlay, not a core feature"

#### 7. API/Implementation Gap

- No formal API specification
- Implementation guidance is technology suggestions only
- No concrete schemas or endpoints defined

### Relevant Quotes/Sections Found

> "HumanWork is the missing runtime for Labor - alongside Compute, Storage, and Network."
> Source: docs/HumanWork-Evolution.md

> "The ultimate goal is human replacement through intelligence crystallization"
> Source: docs/HumanWork-Evolution.md (citing amorphic feedback)

> "Artifacts suggests archaeological remnants. Deliverables emphasizes work products - measurable, valuable outputs"
> Source: docs/HumanWork-Evolution.md

> "The System treats Human Labor and AI Agent Labor as a unified data stream"
> Source: docs/HumanWork-Evolution.md (Amorphic Principle)

> "Checkpoints aren't just governance - they're cognitive capture points"
> Source: docs/HumanWork-Evolution.md

> "Pure automation optimizes for the known, but work increasingly happens in the spaces between the known - in edge cases, exceptions, and emergent scenarios"
> Source: docs.amorphic/02-THE_FAILURE_OF_PURE_AUTOMATION.md, "The Judgment Gap"

> "The timing is critical. Organizations worldwide are struggling with 'AI fatigue' - the gap between AI's promise and its practical integration"
> Source: docs.amorphic/01-EXECUTIVE_SUMMARY.md, "Market Disruption Potential"

> "This is a **policy overlay**, not a core feature."
> Source: docs/03-ORG_WORKSPACE_MODEL.md, "11. Privacy and Visibility"

### Answer to Research Question

**What's missing from the spec? What gaps were identified?**

The spec has significant gaps in three areas:

**1. Primitive & Terminology Gaps:**

- Need new primitives: Actor, Deliverable, The Ledger, Correction Event, Authority Gradient, Pattern Crystallization
- Current terminology (Agent, Artifact, Event Memory) is inadequate

**2. Architectural Gaps:**

- Unified cost model for human/machine labor missing
- Geometric/semantic embeddings not in Memory Model
- No formal Pattern Crystallization mechanism
- Cognitive telemetry at checkpoints undefined
- Authority Gradient (spectrum of autonomy) not implemented

**3. Implementation/Documentation Gaps:**

- No formal API specification
- Privacy model is underdeveloped ("policy overlay")
- Error handling patterns not specified
- No concrete schemas or data models
- Missing hw CLI terminal experience positioning

**4. Philosophical Gap:**
The spec positions "human control" as the goal, but feedback suggests reframing as "intelligence extraction" - where human corrections become portable organizational intelligence that progressively makes Actors more capable.

## Proposed Spec Changes

Based on the feedback synthesis in HumanWork-Evolution.md:

### Immediate (Terminology)

- [ ] Add hw terminal metaphor to README
- [ ] Rename Artifact -> Deliverable throughout
- [ ] Rename Event Memory -> The Ledger
- [ ] Add Actor primitive (replaces Agent with type: Human | Machine)
- [ ] Add Correction Event primitive

### Near-Term (Architecture)

- [ ] Add Authority Gradient to Execution Model (instructional/consultative/supervisory/exploratory)
- [ ] Add Pattern Crystallization to Memory Model
- [ ] Enhance Semantic Memory with geometric embeddings
- [ ] Add cognitive telemetry to Checkpoints (deliberation_duration, confidence_signal, modification_depth)
- [ ] Unify cost model for Human + Machine Actors

### Strategic (Philosophy)

- [ ] Reframe "human control" as transition phase, not end state
- [ ] Position system as intelligence extraction, not just coordination
- [ ] Emphasize The Ledger as primary asset (IP capture)
- [ ] Adopt choreography language over orchestration
- [ ] Develop privacy model beyond "policy overlay"
- [ ] Create formal API specification

## Tool Evaluation

### What Worked Well

- **Keyword search** was essential - semantic search returned 0 results for "gaps missing omissions"
- **`mdtldr context --full`** for single large documents (HumanWork-Evolution.md) was extremely valuable
- **`mdtldr tree`** gave quick overview of document structure
- **Section-specific context** (`--section`) provided targeted extraction
- **Stats command** helped understand corpus size (178K tokens across 23 docs)
- Searching for key terms like "missing", "gap", "limitation", "recommendation" found relevant content

### What Was Frustrating

- **Semantic search yielded no results** for my primary query - had to fall back to keyword mode
- **Token truncation** meant I couldn't see full context of feedback.md (only 16% shown at 3000 tokens)
- **False positives in keyword search** - "not yet" returned SPEC.md headers, not actual incomplete items
- **No way to chain searches** - had to run many separate commands
- **Context command limits** - wanted to see multiple related sections but had to make separate calls
- Some search results returned 10 matches but didn't show the most relevant ones first

### What Was Missing

- **Cross-document synthesis** - tool doesn't connect related content across files
- **Diff/comparison view** - would help see gaps between spec versions
- **"What's undefined" query** - no way to find terms used but not defined
- **Relationship/dependency view** - what primitives depend on what
- **Semantic search tuning** - couldn't adjust semantic similarity threshold
- **Export/aggregation** - no way to collect all relevant sections into one view

### Confidence Level

[X] High / Medium / Low

The HumanWork-Evolution.md document is a comprehensive synthesis that explicitly answers my research question. The gaps are clearly articulated with specific recommendations. My high confidence comes from:

1. Finding the authoritative evolution document
2. Corroborating gaps through multiple keyword searches
3. Direct quotes supporting each gap identified

### Would Use Again? (1-5)

**4** - Very useful for targeted research. The keyword search mode was reliable once I learned semantic search wouldn't work for my query type. The context extraction with section targeting saved significant time. Lost one point because semantic search didn't work as expected and I had to learn workarounds.

## Time & Efficiency

- Commands run: **35**
- Compared to reading all files: **Much less** - The tool helped me navigate 178K tokens across 23 documents efficiently. Finding HumanWork-Evolution.md alone (7500 tokens of synthesized gaps) would have taken much longer by reading files directly. The keyword searches let me quickly identify which documents contained gap-related content without reading everything.

## Appendix: Critical Gaps from HumanWork-Evolution.md

The most authoritative source of gaps is the evolution document, which proposes three phases:

**Phase 1: Terminology Alignment**

- Agent -> Actor (with type: Human | Machine)
- Artifact -> Deliverable
- Event Memory -> The Ledger
- Add Correction Event, Authority Gradient, Pattern Crystallization

**Phase 2: Architectural Enhancements**

- Semantic Memory uses geometric embeddings
- Add Pattern Crystallization as memory operation
- Execution Contexts bind to Actors (not just agents)
- Checkpoints capture cognitive telemetry

**Phase 3: Philosophical Reframing**

- "Human control" becomes transition phase
- Position as intelligence extraction
- Choreography language over orchestration
