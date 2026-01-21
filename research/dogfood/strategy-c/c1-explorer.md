# Report: C1 - Explorer

## Mission

Map the documentation landscape and identify themes for deep-dive.

## Command Log

| #   | Command                                             | Purpose                    | Result                                       | Useful? |
| --- | --------------------------------------------------- | -------------------------- | -------------------------------------------- | ------- |
| 1   | `mdtldr --help`                                     | Learn tool                 | Full help with commands, examples, workflows | Yes     |
| 2   | `mdtldr index --force`                              | Force reindex              | Ran in background                            | N/A     |
| 3   | `mdtldr index`                                      | Index files                | Ran in background                            | N/A     |
| 4   | `mdtldr stats`                                      | Understand scope           | 23 docs, 179K tokens, 924 sections           | Yes     |
| 5   | `mdtldr tree docs/`                                 | See docs structure         | 10 files listed                              | Yes     |
| 6   | `mdtldr tree docs.amorphic/`                        | See amorphic structure     | 9 files listed                               | Yes     |
| 7   | `mdtldr tree docs.llm/`                             | See llm structure          | 3 files (one massive 56K)                    | Yes     |
| 8   | `mdtldr tree docs/00-README.md`                     | Outline of README          | Clear structure                              | Yes     |
| 9   | `mdtldr tree docs/01-ARCHITECTURE.md`               | Outline of arch            | 17 major sections                            | Yes     |
| 10  | `mdtldr tree docs/02-PRIMITIVES.md`                 | Outline of primitives      | 20 primitives defined                        | Yes     |
| 11  | `mdtldr tree docs/05-MEMORY_MODEL.md`               | Outline of memory          | 17 sections, deep                            | Yes     |
| 12  | `mdtldr tree docs.amorphic/01-EXECUTIVE_SUMMARY.md` | Outline exec summary       | Vision/market focus                          | Yes     |
| 13  | `mdtldr tree docs.amorphic/02-THE_FAILURE...md`     | Outline failure doc        | 6 failure modes                              | Yes     |
| 14  | `mdtldr tree docs.amorphic/04-THE_HUMAN-AGENT...md` | Outline collab model       | Trust architecture                           | Yes     |
| 15  | `mdtldr tree docs.llm/spec.md`                      | Outline combined spec      | 56K tokens - full spec combined              | Yes     |
| 16  | `mdtldr tree docs.llm/amorphic.md`                  | Outline amorphic combined  | 21K tokens                                   | Yes     |
| 17  | `mdtldr tree docs.llm/feedback.md`                  | Outline feedback           | 11K tokens - landing pages, BDI              | Yes     |
| 18  | `mdtldr search "human"`                             | Find human-centric content | 10 hits, core principle                      | Yes     |
| 19  | `mdtldr search "memory"`                            | Find memory content        | 10 hits, three-layer arch                    | Yes     |
| 20  | `mdtldr search "workflow"`                          | Find workflow content      | 10 hits, guidance model                      | Yes     |
| 21  | `mdtldr search "agent"`                             | Find agent content         | 10 hits, replaceable agents                  | Yes     |
| 22  | `mdtldr search "control"`                           | Find control content       | 10 hits, Control Plane key                   | Yes     |
| 23  | `mdtldr search "org OR workspace"`                  | Find org model             | 10 hits, multi-layer                         | Yes     |
| 24  | `mdtldr search "failure OR problem..."`             | Find problems              | 10 hits                                      | Yes     |
| 25  | `mdtldr search "collaboration"`                     | Find collaboration         | 10 hits, multi-human                         | Yes     |
| 26  | `mdtldr search "transparency OR observability"`     | Find observability         | 10 hits, core principle                      | Yes     |
| 27  | `mdtldr search "Letta"`                             | Find Letta integration     | 10 hits, integration plan                    | Yes     |
| 28  | `mdtldr search "event"`                             | Find event-driven content  | 10 hits, Event Memory                        | Yes     |
| 29  | `mdtldr search "immutable"`                         | Find immutability          | 10 hits, core principle                      | Yes     |
| 30  | `mdtldr search "cost"`                              | Find cost management       | 10 hits, workspace-level                     | Yes     |
| 31  | `mdtldr search "automation OR autonomous"`          | Find automation critique   | 10 hits, failure theme                       | Yes     |
| 32  | `mdtldr tree docs/HumanWork-Evolution.md`           | Check evolution doc        | 7500 tokens, no sections                     | Partly  |
| 33  | `mdtldr tree docs.amorphic/05-TECHNICAL...md`       | Check tech patterns        | 5 key patterns                               | Yes     |
| 34  | `mdtldr tree docs.amorphic/06-ORGANIZATIONAL...md`  | Check org transformation   | 13 sections                                  | Yes     |
| 35  | `mdtldr tree docs.amorphic/08-FUTURE...md`          | Check future directions    | Research agenda                              | Yes     |
| 36  | `mdtldr search "time travel OR branching"`          | Find temporal features     | 10 hits, core feature                        | Yes     |
| 37  | `mdtldr search "semantic"`                          | Find semantic layer        | 10 hits, knowledge graph                     | Yes     |

## Landscape Overview

### docs/ Structure (Original Spec)

**10 files, ~40K tokens, highly structured**

Core documentation for the HumanWork framework:

- **00-README.md** (1.6K tokens): Mission statement, core principles (Human Control, Immutability, Observability, Metadata-Driven, Replaceable Agents)
- **01-ARCHITECTURE.md** (5K tokens): 17 architectural layers from Control Plane to Memory
- **02-PRIMITIVES.md** (6.8K tokens): 20 formal primitives with definitions, properties, guarantees, lifecycle
- **03-ORG_WORKSPACE_MODEL.md**: Identity, cost, authority model
- **04-EXECUTION_MODEL.md**: Jobs, contexts, workflows execution
- **05-MEMORY_MODEL.md** (6.8K tokens): Three-layer memory (Event, Status, Semantic)
- **06-WORKFLOWS.md**: Workflow philosophy and definition format
- **07-EXAMPLE_WORKFLOWS.md**: 5 concrete scenarios (Individual, Team, Research, Engineering, Enterprise)
- **HumanWork-Evolution.md** (7.5K tokens): Evolution ideas - single section, less structured
- **LETTA_INTEGRATION_PLAN.md**: Memory system integration plan with Letta/MemGPT

### docs.amorphic/ Structure (Chat Analysis)

**9 files, ~21K tokens, narrative style**

Philosophy and vision documents (more prose, less formal):

- **00-INDEX.md**: Table of contents with section previews
- **01-EXECUTIVE_SUMMARY.md** (1.7K tokens): Core innovation, market disruption potential
- **02-THE_FAILURE_OF_PURE_AUTOMATION.md** (2.8K tokens): 6 failure modes of current approaches
- **03-ARCHITECTURAL_FOUNDATIONS.md**: Substrate problem, geometric memory, component relationships
- **04-THE_HUMAN-AGENT_COLLABORATION_MODEL.md** (2.8K tokens): Authority gradient, collaboration modes, trust architecture
- **05-TECHNICAL_IMPLEMENTATION_PATTERNS.md** (2.3K tokens): 5 foundational patterns
- **06-ORGANIZATIONAL_TRANSFORMATION.md** (4K tokens): Cultural shifts, governance, maturity models
- **08-FUTURE_IMPLICATIONS_AND_RESEARCH_DIRECTIONS.md** (1.8K tokens): Research frontiers, open questions
- **\_0.BLURB.md**: Marketing/pitch content

### docs.llm/ Structure (Combined Files)

**3 files, ~89K tokens - aggregated versions**

- **spec.md** (56K tokens): All docs/ files concatenated - massive single-file version
- **amorphic.md** (21K tokens): All docs.amorphic/ files concatenated
- **feedback.md** (11.6K tokens): Landing page copy, BDI concepts, installation, philosophy

## Themes Identified for Deep-Dive

### 1. **Three-Layer Memory Architecture**

- Why: Central innovation. Event Memory (immutable facts), Status Memory (derived state), Semantic Memory (knowledge graph) - enables time travel, branching, and replay. Referenced in nearly every document.
- Search hints: `memory`, `event`, `semantic`, `immutable`, `time travel OR branching`
- Key files: docs/05-MEMORY_MODEL.md, docs/01-ARCHITECTURE.md sections 11-12

### 2. **Human-Agent Control Model**

- Why: Core differentiator from "autonomous agent" frameworks. Control Plane with preemptive authority, explicit human decision points, interruptibility guarantees. The "why" of the entire system.
- Search hints: `control`, `human`, `authority`, `interrupt`, `preemptive`
- Key files: docs/00-README.md, docs/01-ARCHITECTURE.md (Control Plane), docs.amorphic/04-THE_HUMAN-AGENT_COLLABORATION_MODEL.md

### 3. **Failure of Pure Automation (Critical Analysis)**

- Why: docs.amorphic/ provides rich analysis of WHY current agent frameworks fail - brittleness, coordination trap, innovation strangulation, context collapse, judgment gap. Understanding these failure modes is crucial for evaluating the solution.
- Search hints: `failure`, `automation`, `autonomous`, `brittleness`, `coordination`
- Key files: docs.amorphic/02-THE_FAILURE_OF_PURE_AUTOMATION.md, docs.amorphic/01-EXECUTIVE_SUMMARY.md

### 4. **Execution Model (Jobs, Contexts, Workflows)**

- Why: Complex model with Jobs (intent over time), Execution Contexts (disposable actors), Workflows (guidance not execution). Parallel execution patterns, context resumption, scope-based coordination.
- Search hints: `workflow`, `job`, `context`, `execution`, `scope`
- Key files: docs/04-EXECUTION_MODEL.md, docs/06-WORKFLOWS.md, docs/07-EXAMPLE_WORKFLOWS.md

### 5. **Org-Workspace-Cost Model**

- Why: Hierarchical containment (Org > Workspace > Job > Context), cost attribution and visibility, cross-workspace learning promotion. Enterprise governance angle.
- Search hints: `org OR workspace`, `cost`, `promotion`, `governance`
- Key files: docs/03-ORG_WORKSPACE_MODEL.md, docs/01-ARCHITECTURE.md (sections 4-5)

## Additional Notable Themes (Considered but Not Primary)

- **Letta Integration**: docs/LETTA_INTEGRATION_PLAN.md shows concrete integration plans with MemGPT memory blocks
- **Observability & Transparency**: Strong theme in amorphic docs, core principle
- **Primitive Definitions**: 20 formal primitives in docs/02-PRIMITIVES.md

## Tool Evaluation

### What Worked Well

- `mdtldr stats` gave instant overview of scope (23 docs, 179K tokens, 924 sections)
- `mdtldr tree [file]` showing document outlines with token counts was extremely valuable for prioritization
- `mdtldr tree [folder]` listing all files was quick way to understand structure
- Boolean search operators (OR, AND) worked well when used
- Keyword search results showed context (lines before/after) which helped understand relevance
- Search results included section headers with token counts - useful for prioritization

### What Was Frustrating

- Keyword search requires exact terms - multi-word phrases like "human control authority" returned 0 results
- Search limited to 10 results max (or at least only showed 10) - no pagination visible
- No way to increase result limit in search output
- `mdtldr index` commands ran in background unexpectedly, making it unclear when indexing completed
- No embeddings by default - would need `--embed` for semantic search
- docs.llm/ contains mostly duplicated content (aggregated files) - no way to detect this automatically

### What Was Missing

- Semantic search (would require `--embed` indexing)
- Cross-file relationship detection (e.g., which docs reference which primitives)
- Token budget for search results (like context command has)
- Ability to search within specific folders only
- Duplicate content detection
- Section-level content preview (tree shows structure but not content snippets)

### Confidence Level

[X] High / Medium / Low

**Justification**: Tree command with token counts and section headers gave excellent structural overview. Keyword search confirmed theme patterns across documents. Main uncertainty is whether I missed nuanced content that would only surface with semantic search.

### Would Use Again? (1-5)

**4** - Very useful for rapid mapping of large doc sets. The combination of `tree` for structure and `search` for theme confirmation worked well. Would be 5/5 with semantic search enabled.

## Time & Efficiency

- Commands run: 37
- Compared to reading all files: **Much less** - 179K tokens would be impossible to read directly; mdtldr enabled mapping in ~10 minutes
- Key efficiency: `tree [file]` with token counts let me prioritize which areas need deep investigation

## Summary for Divers

The documentation describes **HumanWork**, a framework for human-AI collaboration that explicitly rejects the "fully autonomous agent" paradigm. Key innovations:

1. **Three-layer memory** enabling replay, time travel, branching
2. **Control Plane** with preemptive human authority over all execution
3. **Workspace isolation** for cost attribution and parallel exploration
4. **Workflows as guidance** (not rigid automation)

The docs.amorphic/ folder contains the philosophical "why" (failure analysis), while docs/ contains the formal "what" (primitives, architecture). The docs.llm/ folder appears to be aggregated versions for LLM consumption.

Recommended diver priorities:

1. Memory Architecture (most referenced, most complex)
2. Human Control Model (core differentiator)
3. Failure Analysis (explains design decisions)
4. Execution Model (operational complexity)
5. Org-Workspace Model (enterprise governance angle)
