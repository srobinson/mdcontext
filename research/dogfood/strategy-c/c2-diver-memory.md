# Report: C2 - Diver: Memory Architecture

## Mission

Deep-dive into: Three-Layer Memory Architecture

## Command Log

| #   | Command                                                                                            | Purpose                            | Result                                     | Useful? |
| --- | -------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------ | ------- |
| 1   | `mdcontext search "memory"`                                                                        | Find memory content                | 10 results, found key files and references | Yes     |
| 2   | `mdcontext search "event memory"`                                                                  | Find event memory specifics        | 10 results with detailed sections          | Yes     |
| 3   | `mdcontext search "semantic memory"`                                                               | Find semantic memory specifics     | 10 results covering definition and usage   | Yes     |
| 4   | `mdcontext search "status memory"`                                                                 | Find status memory specifics       | 10 results with operational details        | Yes     |
| 5   | `mdcontext context docs/05-MEMORY_MODEL.md "## 2."`                                                | Try positional context (failed)    | ENOENT error - wrong syntax                | No      |
| 6   | `mdcontext context docs/05-MEMORY_MODEL.md --section "The Three-Layer Architecture"`               | Get architecture overview          | Clean section output                       | Yes     |
| 7   | `mdcontext context docs/05-MEMORY_MODEL.md --section "Layer 1: Event Memory"`                      | Get event memory details           | No match found                             | No      |
| 8   | `mdcontext context --sections docs/05-MEMORY_MODEL.md`                                             | List available sections            | Full section tree (17 top-level)           | Yes     |
| 9   | `mdcontext context docs/05-MEMORY_MODEL.md --section "3. Layer 1: Event / Fact Memory"`            | Get event memory with correct name | Full section with all subsections          | Yes     |
| 10  | `mdcontext context docs/05-MEMORY_MODEL.md --section "4. Layer 2: Status Memory"`                  | Get status memory details          | Complete operational truth section         | Yes     |
| 11  | `mdcontext context docs/05-MEMORY_MODEL.md --section "5. Layer 3: Semantic Memory"`                | Get semantic memory details        | Full knowledge graph layer info            | Yes     |
| 12  | `mdcontext context docs/05-MEMORY_MODEL.md --section "8. Time Travel and Branching"`               | Get time travel features           | Branching and replay mechanics             | Yes     |
| 13  | `mdcontext context docs/05-MEMORY_MODEL.md --section "7. Memory and Execution Context Resumption"` | Get resumption pattern             | Critical 5-step resumption flow            | Yes     |
| 14  | `mdcontext context docs/05-MEMORY_MODEL.md --section "1. Memory Philosophy"`                       | Get design rationale               | Core philosophy defined                    | Yes     |
| 15  | `mdcontext search "immutable"`                                                                     | Find immutability references       | 10 cross-doc references                    | Yes     |
| 16  | `mdcontext context docs/05-MEMORY_MODEL.md --section "13. Memory Guarantees"`                      | Get guarantees                     | 5 guarantee categories                     | Yes     |
| 17  | `mdcontext context docs/05-MEMORY_MODEL.md --section "14. Anti-Patterns (Explicitly Forbidden)"`   | Get anti-patterns                  | 7 forbidden patterns                       | Yes     |
| 18  | `mdcontext context docs/01-ARCHITECTURE.md --section "Workspace Memory"`                           | Get architecture view              | Concise 3-layer summary                    | Yes     |
| 19  | `mdcontext context docs/05-MEMORY_MODEL.md --section "17. Summary"`                                | Get summary                        | Concluding philosophy                      | Yes     |
| 20  | `mdcontext search "replay"`                                                                        | Find replay capability             | 7 replay references                        | Yes     |
| 21  | `mdcontext search "derived"`                                                                       | Find derived state refs            | 10 references showing derivation chain     | Yes     |
| 22  | `mdcontext context docs/05-MEMORY_MODEL.md --section "6. Memory Composition"`                      | Get composition details            | Layer relationships and consumers          | Yes     |
| 23  | `mdcontext context docs/05-MEMORY_MODEL.md --section "9. Org-Level Memory"`                        | Get org memory                     | Workspace-to-org flow                      | Yes     |
| 24  | `mdcontext search "knowledge graph"`                                                               | Find knowledge graph refs          | 7 results covering semantic layer          | Yes     |
| 25  | `mdcontext context docs/05-MEMORY_MODEL.md --section "16. Why This Model Works"`                   | Get rationale                      | Benefits and scaling                       | Yes     |
| 26  | `mdcontext context docs/05-MEMORY_MODEL.md --section "15. Implementation Guidance"`                | Get implementation tech            | Tech stack recommendations                 | Yes     |
| 27  | `mdcontext context docs/04-EXECUTION_MODEL.md --section "What Agents Receive"`                     | Get agent context details          | 4 memory sources for agents                | Yes     |

## Findings

### Key Discoveries

1. **Event Memory is the Single Source of Truth**
   - Immutable, append-only log of all Workspace events
   - Contains Records: execution_context.started, artifact.produced, step.completed, etc.
   - All other memory layers can be rebuilt from Event Memory
   - Optimized for correctness/durability, not query performance

2. **Status Memory is Derived Operational Truth**
   - Computed from Event Memory, never authoritative
   - Stores: active jobs, pending signals, resource usage, attention state
   - Can be deleted and rebuilt at any time
   - Hard rule: "Status Memory must be fully derivable from Event Memory"

3. **Semantic Memory is Understanding, Not Facts**
   - Knowledge graph of relationships, concepts, patterns
   - Probabilistic and explainable (every edge has provenance)
   - Advises but never controls execution
   - Uses LLMs, heuristics, and annotations for extraction

4. **Time Travel and Branching are Natural Consequences**
   - Rewind to any point by replaying Events up to timestamp T
   - Branches share history up to fork point, then diverge
   - Each branch has independent Status and Semantic Memory
   - "Time travel is a query, not a feature"

5. **5-Step Context Resumption Pattern**
   - Query Event Memory (what happened)
   - Query Artifact Store (what exists)
   - Query Status Memory (what's pending)
   - Query Semantic Memory (what it means)
   - Assemble context for Agent

### Relevant Quotes/Sections Found

> "Event Memory is the immutable, append-only log of everything that occurred in the Workspace. This is the source of truth."
> Source: docs/05-MEMORY_MODEL.md, Section 3 Definition

> "Status Memory must be fully derivable from Event Memory. You must be able to delete Status Memory entirely, rebuild it from Events, get identical results."
> Source: docs/05-MEMORY_MODEL.md, Section 4.6 The Hard Rule

> "Semantic Memory advises but never controls. It may suggest, recommend, highlight. It may never block execution, override decisions, mutate artifacts, drive workflows."
> Source: docs/05-MEMORY_MODEL.md, Section 5.6 The Non-Authoritative Rule

> "Memory is the connective tissue that enables long-running, interruptible human work with perfect continuity and trust."
> Source: docs/05-MEMORY_MODEL.md, Section 17 Summary

> "No circular dependencies. Clean derivation hierarchy."
> Source: docs/05-MEMORY_MODEL.md, Section 6 Memory Composition

### Summary of Theme

The Three-Layer Memory Architecture is the foundational innovation of HumanWork that enables its core promises: interruptibility, auditability, and time travel.

**Layer 1: Event Memory (Facts)** - The immutable append-only log that records every meaningful event. This is the only source of truth. Technologies: EventStoreDB, append-only DBs, WAL.

**Layer 2: Status Memory (Operational Truth)** - Derived projections optimized for fast queries about current state. Ephemeral and recomputable. Technologies: Redis, PostgreSQL projections.

**Layer 3: Semantic Memory (Understanding)** - Derived knowledge graph capturing relationships, concepts, and patterns. Advisory only, never authoritative. Technologies: Neo4j, Graphiti, vector DBs.

The key insight is the strict derivation hierarchy: Event -> Status -> Semantic. No circular dependencies. This enables:

- **Time travel**: Replay events to any timestamp
- **Branching**: Fork at any event boundary, independent evolution
- **Resumption**: Any agent can continue any work with full context
- **Auditability**: Complete traceable history
- **Agent independence**: No hidden agent state required

The model explicitly forbids anti-patterns like treating Status Memory as authoritative, letting Semantic Memory drive execution, or bypassing Event Memory for performance.

## Proposed Spec Changes

- [ ] Clarify the distinction between Event Memory and Artifact Store (both immutable, but different purposes)
- [ ] Add concrete examples of Record types and their schema
- [ ] Define retention policy defaults for each layer
- [ ] Specify maximum acceptable latency for Status Memory queries
- [ ] Document conflict resolution when Semantic Memory inferences contradict

## Tool Evaluation

### What Worked Well

- `mdcontext search` quickly found all relevant documents and sections
- `mdcontext context --section` returned clean, well-formatted output with full section content
- `mdcontext context --sections` listing was invaluable for finding exact section names
- Keyword search with compound terms ("event memory", "status memory") worked well
- Token counts in section listings help estimate content size

### What Was Frustrating

- Initial attempt at context extraction failed due to positional argument confusion (thought section name was second positional, not a flag)
- Section name matching requires exact match including numbering prefix (e.g., "3. Layer 1: Event / Fact Memory" not just "Layer 1")
- No fuzzy/partial matching for section names
- Had to list sections first to get exact names, adding an extra step
- Search results capped at 10, potentially missing relevant content

### Confidence Level

[X] High / Medium / Low

The three-layer memory architecture is extremely well documented with clear definitions, properties, guarantees, anti-patterns, and implementation guidance. The documentation is comprehensive and internally consistent.

### Would Use Again? (1-5)

4 - The tool is effective for systematic exploration once you learn the patterns. The `--sections` listing feature is essential. The combination of broad search followed by targeted context extraction works well. Would rate 5 if section matching was more forgiving and search results weren't capped.
