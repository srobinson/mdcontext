# Report: B1 - Architecture Critic Hunter

## Mission
Find architecture and design criticisms across all documentation

## Research Question
What architecture and design criticisms exist?

## Command Log
| # | Command | Purpose | Result | Useful? |
|---|---------|---------|--------|---------|
| 1 | `mdtldr --help` | Learn tool | Got full usage guide | Yes |
| 2 | `mdtldr index --embed --force` | Index all files with embeddings | 23 docs, 922 sections, 904 embeddings | Yes |
| 3 | `mdtldr search "architecture criticism problems design flaws limitations"` | Semantic search for criticisms | 1 result (ARCHITECTURAL_FOUNDATIONS) | Partial |
| 4 | `mdtldr search "design trade-offs weaknesses concerns issues"` | Semantic search | 0 results | No |
| 5 | `mdtldr search "failure problems complexity challenges"` | Semantic search | 0 results | No |
| 6 | `mdtldr search "failure" --mode keyword` | Keyword search | 10 results | Yes |
| 7 | `mdtldr context docs.amorphic/02-THE_FAILURE_OF_PURE_AUTOMATION.md -t 3000` | Get full failure analysis | Full document | Yes |
| 8 | `mdtldr search "limitations" --mode keyword` | Keyword search | 1 result | Yes |
| 9 | `mdtldr search "problem" --mode keyword` | Keyword search | 10 results | Yes |
| 10 | `mdtldr search "risk" --mode keyword` | Keyword search | 10 results | Yes |
| 11 | `mdtldr search "anti-pattern" --mode keyword` | Keyword search | 4 results | Yes |
| 12 | `mdtldr context docs/05-MEMORY_MODEL.md --section "Anti-Patterns"` | Get memory anti-patterns | 7 forbidden patterns | Yes |
| 13 | `mdtldr context docs/06-WORKFLOWS.md --section "Anti-Patterns"` | Get workflow anti-patterns | 8 forbidden patterns | Yes |
| 14 | `mdtldr search "concern" --mode keyword` | Keyword search | 10 results | Yes |
| 15 | `mdtldr search "brittle" --mode keyword` | Keyword search | 10 results | Yes |
| 16 | `mdtldr search "complexity" --mode keyword` | Keyword search | 9 results | Yes |
| 17 | `mdtldr search "overhead" --mode keyword` | Keyword search | 7 results | Yes |
| 18 | `mdtldr search "design patterns architecture decision"` | Semantic search | 10 results | Yes |
| 19 | `mdtldr context docs.amorphic/03-ARCHITECTURAL_FOUNDATIONS.md -t 2000` | Get architectural foundations | Full document | Yes |
| 20 | `mdtldr context docs.amorphic/05-TECHNICAL_IMPLEMENTATION_PATTERNS.md -t 2500` | Get implementation patterns | Full document | Yes |
| 21 | `mdtldr search "gap" --mode keyword` | Keyword search | 8 results | Yes |
| 22 | `mdtldr context docs.amorphic/02-THE_FAILURE_OF_PURE_AUTOMATION.md --section "Judgment Gap"` | Get judgment gap section | Detailed section | Yes |
| 23 | `mdtldr search "forbidden" --mode keyword` | Keyword search | 5 results | Yes |
| 24 | `mdtldr search "corrupt" --mode keyword` | Keyword search | 5 results | Yes |
| 25 | `mdtldr tree docs/01-ARCHITECTURE.md` | Get document outline | 47 sections | Yes |
| 26 | `mdtldr context docs/01-ARCHITECTURE.md --section "Why This Architecture Works"` | Get rationale | Brief justification | Yes |
| 27 | `mdtldr context docs/01-ARCHITECTURE.md --section "Architectural Invariants"` | Get invariants | 8 invariants | Yes |
| 28 | `mdtldr search "fail" --mode keyword` | Keyword search | 10 results | Yes |
| 29 | `mdtldr context docs/00-README.md --section "What Problem"` | Get problem statement | Core problem | Yes |
| 30 | `mdtldr search "cost" --mode keyword` | Keyword search | 10 results | Yes |
| 31 | `mdtldr context docs.llm/feedback.md -t 3000` | Get feedback document | Chat feedback analysis | Yes |
| 32 | `mdtldr search "traditional" --mode keyword` | Keyword search | 10 results | Yes |
| 33 | `mdtldr tree docs.llm/amorphic.md` | Get amorphic outline | Full outline | Yes |
| 34 | `mdtldr context docs.llm/amorphic.md --section "Open Questions"` | Get open questions | 3 open questions | Yes |
| 35 | `mdtldr context docs.llm/amorphic.md --section "Paradox of Automation"` | Get paradox section | Detailed section | Yes |
| 36 | `mdtldr search "wrong" --mode keyword` | Keyword search | 6 results | Yes |
| 37 | `mdtldr context docs.amorphic/04-THE_HUMAN-AGENT_COLLABORATION_MODEL.md --section "Observability Problem"` | Get observability problem | Key issue identified | Yes |
| 38 | `mdtldr search "scale" --mode keyword` | Keyword search | 10 results | Yes |

## Findings

### Key Discoveries

#### 1. Criticisms of Traditional/Pure Automation (Major Theme)
The documentation extensively critiques traditional automation approaches:

- **Brittleness**: "The system becomes brittle not because any individual rule is wrong, but because the combinatorial explosion of rules creates a rigid lattice that cannot bend without breaking."
- **Coordination Trap**: Pure automation "multiplies coordination requirements by forcing human work into machine-readable formats that require constant translation and synchronization."
- **Innovation Strangulation**: "Teams avoid innovative approaches not because they're technically inferior, but because they're automation-incompatible."
- **Human Bottleneck Paradox**: Attempting to eliminate humans creates new bottlenecks in system configuration and exception handling.
- **Context Collapse**: Traditional systems treat "context as configuration rather than conversation."
- **Judgment Gap**: "Systems that handle 80% of cases flawlessly but create chaos in the remaining 20%."

#### 2. Agent System Criticisms (Self-Aware)
The documentation acknowledges problems with current agent systems:

> "Most agent systems fail at real work because they optimize for demos, single-shot tasks, and autonomous execution. They become opaque, brittle, hard to interrupt, impossible to rewind, and unsafe to scale."
> Source: docs/00-README.md

#### 3. Observability Problem
> "Most agent systems are black boxes. You send a request, wait, and get a result - with no visibility into what happened in between. When something goes wrong, you're left debugging phantom processes and mysterious failures. This opacity kills trust."
> Source: docs.amorphic/04-THE_HUMAN-AGENT_COLLABORATION_MODEL.md

#### 4. Anti-Patterns Explicitly Forbidden

**Memory Model Anti-Patterns:**
- Storing mutable state in Event Memory
- Treating Status Memory as authoritative
- Letting Semantic Memory drive execution
- Hiding Events from humans
- Creating circular dependencies between layers
- Bypassing Event Memory for "performance"
- Hard-deleting critical audit events

**Workflow Anti-Patterns:**
- Workflows that execute directly
- Workflows that mutate artifacts
- Workflows that allocate cost
- Workflows that own agents
- Hidden workflow state
- Workflows that become Turing-complete
- Mandatory workflows (at system level)
- Workflows that bypass Control Plane

#### 5. Architectural Invariants (Design Constraints)
The system explicitly maintains these constraints to avoid known issues:
- No hidden mutable state
- No irreversible execution
- No unobservable progress
- No agent-owned memory
- No loss of human authority
- No concurrent mutation of the same scope
- No execution without a Workspace
- No automatic flow from Org to Workspace

#### 6. Open Questions (Acknowledged Gaps)
> "How do we ensure HumanWork organizations remain aligned with human values as they become more autonomous?"
> "What are the limits of organizational intelligence? Are there problems that fundamentally require individual rather than collective cognition?"
> "How do we prevent organizational capture - scenarios where HumanWork systems optimize for their own perpetuation rather than their intended purposes?"
> Source: docs.llm/amorphic.md

#### 7. Substrate Problem
> "Implementation details leak into the conceptual model, making the workflow harder to reason about and modify."
> Source: docs.amorphic/03-ARCHITECTURAL_FOUNDATIONS.md

### Relevant Quotes/Sections Found

> "Pure automation assumes complete knowledge of the problem space. It requires that all possible states, transitions, and edge cases be enumerable at design time. This works beautifully for manufacturing widgets or processing financial transactions - domains where the rules are well-understood and the exceptions are genuinely exceptional. But knowledge work exists in a different regime entirely."
> Source: docs.amorphic/02-THE_FAILURE_OF_PURE_AUTOMATION.md, The Brittleness of Complete Systems

> "The paradox emerges when pure automation, in attempting to eliminate human bottlenecks, creates new bottlenecks in the form of system configuration, exception handling, and cross-system integration."
> Source: docs.amorphic/02-THE_FAILURE_OF_PURE_AUTOMATION.md, The Human Bottleneck Paradox

> "Traditional workflow systems model execution as directed acyclic graphs (DAGs) - nodes representing tasks, edges representing dependencies. This works well for batch processing and pipeline scenarios where the structure is known in advance. But it breaks down when workflows need to adapt their structure based on runtime conditions or accumulated learning."
> Source: docs.amorphic/03-ARCHITECTURAL_FOUNDATIONS.md, Component Relationships

> "If Status Memory cannot be rebuilt, it has become a source of truth and the system is corrupted."
> Source: docs/05-MEMORY_MODEL.md, The Hard Rule

### Answer to Research Question

**What architecture and design criticisms exist?**

The documentation contains extensive, self-aware architectural criticism organized into three categories:

1. **Criticisms of Traditional Approaches (external):** The docs thoroughly critique pure automation, traditional workflow systems (DAGs), black-box agent systems, and context-as-configuration approaches. These criticisms justify the HumanWork design decisions.

2. **Self-Imposed Constraints (internal guardrails):** The architecture explicitly forbids specific anti-patterns for both memory and workflows. These represent lessons learned about what NOT to do - treating them as "corrupted" states if they appear.

3. **Acknowledged Open Questions (honest gaps):** The documentation admits uncertainty about alignment with human values at scale, limits of organizational intelligence, and preventing organizational capture.

The architectural philosophy is defensive - explicitly naming what can go wrong and building constraints to prevent it. The invariants and anti-patterns serve as architectural "unit tests" against known failure modes.

## Proposed Spec Changes
- [ ] Add section on "Known Limitations and Trade-offs" to acknowledge what HumanWork architecture sacrifices (e.g., raw execution speed for observability)
- [ ] Expand on how the Judgment Gap (80/20 problem) is specifically addressed beyond "humans intervene"
- [ ] Document concrete answers to the Open Questions or mark them as research priorities
- [ ] Add guidance on detecting when Status Memory has "become authoritative" before corruption
- [ ] Create decision framework for when DAG-style execution IS appropriate vs. adaptive execution

## Tool Evaluation

### What Worked Well
- Keyword search (`--mode keyword`) was highly effective for finding specific terms like "failure", "brittle", "anti-pattern"
- Section-targeted context (`--section "X"`) efficiently extracted exactly what I needed
- The `tree` command helped understand document structure before diving in
- Embedding indexing was fast and one-time cost
- Token budget control (`-t`) helped manage context size

### What Was Frustrating
- Semantic search often returned 0 results for multi-word queries that should have matched
- Semantic search for "design trade-offs weaknesses concerns issues" returned nothing
- Semantic search for "failure problems complexity challenges" returned nothing
- Had to fall back to keyword search frequently after semantic failed
- Multi-word keyword searches didn't work (e.g., "issue challenge gap" = 0 results)
- Boolean operators in keyword mode unclear if supported

### What Was Missing
- No fuzzy/stemmed search (had to search "fail" vs "failure" separately)
- No "search within results" or progressive refinement
- No way to get context around keyword matches without re-running with `context`
- Semantic search threshold/sensitivity adjustment not available
- No combined semantic+keyword hybrid mode
- Difficult to search for concepts without exact terms

### Confidence Level
[X] Medium

The keyword search found the explicit criticisms comprehensively. However, I may have missed implicit criticisms or design concerns that don't use obvious negative terminology. Semantic search underperformed expectations.

### Would Use Again? (1-5)
**4** - Good for structured documentation analysis. Keyword search is reliable. Would use again but with clearer expectations that semantic search needs more work. The section-level context extraction is genuinely useful for targeted retrieval.

## Time & Efficiency
- Commands run: **38**
- Compared to reading all files: **Much less** - Would have taken 30+ minutes to read all docs manually. Tool-based search took approximately 15 minutes to find all relevant criticisms.
- Token efficiency: Reduced ~150k tokens of docs to targeted extracts totaling ~15k tokens of relevant content
