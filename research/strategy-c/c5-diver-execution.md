# Report: C5 - Diver: Execution Model

## Mission
Deep-dive into: Execution Model (Jobs, Contexts, Workflows)

## Command Log
| # | Command | Purpose | Result | Useful? |
|---|---------|---------|--------|---------|
| 1 | `mdtldr --help` | Understand available commands | Full command listing with examples | Yes |
| 2 | `mdtldr tree` | List all markdown files | 23 files found, identified key docs | Yes |
| 3 | `mdtldr tree docs/04-EXECUTION_MODEL.md` | Show document outline | 38 sections, 7418 tokens total | Very useful |
| 4 | `mdtldr context docs/04-EXECUTION_MODEL.md -t 4000` | Get overview of execution model | Truncated to 36%, got main sections | Useful |
| 5 | `mdtldr search "job" --json` | Find job-related content | 10 results across multiple files | Useful |
| 6 | `mdtldr search "execution context"` | Find execution context content | 10 results with context lines | Useful |
| 7 | `mdtldr context docs/04-EXECUTION_MODEL.md --section "2. Jobs"` | Deep dive on Jobs | Full Jobs section extracted | Very useful |
| 8 | `mdtldr context docs/04-EXECUTION_MODEL.md --section "3. Execution Contexts"` | Deep dive on Contexts | Full Execution Contexts section | Very useful |
| 9 | `mdtldr context docs/04-EXECUTION_MODEL.md --section "4. Workflows in Execution"` | Workflows in execution | Full workflows section | Very useful |
| 10 | `mdtldr tree docs/06-WORKFLOWS.md` | Outline of dedicated Workflows doc | 37 sections, 8541 tokens | Useful |
| 11 | `mdtldr context docs/06-WORKFLOWS.md --section "1. Workflow Philosophy"` | Workflow philosophy | Core principles extracted | Very useful |
| 12 | `mdtldr context docs/06-WORKFLOWS.md --section "2. What Problem Workflows Solve"` | Problem statement | Clear value proposition | Useful |
| 13 | `mdtldr search "parallel execution"` | Find parallel patterns | 10 results, multiple examples | Useful |
| 14 | `mdtldr context docs/04-EXECUTION_MODEL.md --section "5. Execution Coordination Patterns"` | Coordination patterns | Pipeline, Fan-out, Background patterns | Very useful |
| 15 | `mdtldr search "context resumption"` | Find resumption info | 6 results across docs | Useful |
| 16 | `mdtldr context docs/04-EXECUTION_MODEL.md --section "6. Context Creation and Resumption"` | Resumption mechanics | Critical resumption model explained | Very useful |
| 17 | `mdtldr context docs/04-EXECUTION_MODEL.md --section "7. Scope and Mutual Exclusion"` | Concurrency rules | Hard invariant explained | Very useful |
| 18 | `mdtldr search "scope"` | Find scope usage | 10 results showing scope patterns | Useful |
| 19 | `mdtldr context docs/04-EXECUTION_MODEL.md --section "16. Guarantees"` | System guarantees | 7 key guarantees listed | Very useful |
| 20 | `mdtldr context docs/04-EXECUTION_MODEL.md --section "18. Summary"` | Executive summary | Clean separation of concerns | Very useful |
| 21 | `mdtldr tree docs/07-EXAMPLE_WORKFLOWS.md` | Example workflows outline | 5 detailed examples, 14423 tokens | Useful |
| 22 | `mdtldr context docs/07-EXAMPLE_WORKFLOWS.md --section "Summary Across All Examples"` | Examples summary | Common patterns across use cases | Very useful |
| 23 | `mdtldr context docs/04-EXECUTION_MODEL.md --section "8. Steps and Agents"` | Steps and Agents | Atomic execution units | Very useful |
| 24 | `mdtldr context docs/04-EXECUTION_MODEL.md --section "17. Why This Model Scales"` | Scalability | Scale dimensions explained | Very useful |
| 25 | `mdtldr search "disposable"` | Find disposable concept | 10 results showing ephemeral nature | Useful |
| 26 | `mdtldr context docs/04-EXECUTION_MODEL.md --section "10. External Workflow Integration"` | External framework integration | BMAD, RD-Agent integration pattern | Very useful |
| 27 | `mdtldr context docs/04-EXECUTION_MODEL.md --section "11. Key Execution Patterns"` | Execution patterns | Ad-hoc, guided, background, parallel | Very useful |
| 28 | `mdtldr context docs/04-EXECUTION_MODEL.md --section "12. Control Plane Integration"` | Control plane | Intervention capabilities | Very useful |
| 29 | `mdtldr search "checkpoint"` | Find checkpoint content | 10 results showing checkpoint usage | Useful |
| 30 | `mdtldr context docs/06-WORKFLOWS.md --section "12. Checkpoints in Depth"` | Checkpoint mechanics | 6 checkpoint types, enforcement rules | Very useful |
| 31 | `mdtldr search "immutable"` | Find immutability patterns | 10 results confirming append-only model | Useful |
| 32 | `mdtldr stats` | Index statistics | 23 docs, 924 sections, no embeddings | Useful |

## Findings

### Key Discoveries
- **Execution is scoped, disposable attempts guided by durable intent** - This is the philosophical core
- **Jobs coordinate, Contexts execute, Workflows guide** - Clean separation of concerns
- **Immutability transforms conflicts into choices** - No race conditions, no merge logic
- **Resumption creates new contexts** - No hidden state, perfect auditability
- **External frameworks (BMAD, RD-Agent) execute WITHIN the model** - Not above it

### Model Components

#### Jobs: Human-Meaningful Coordination Envelopes
> "A Job is a human-meaningful coordination envelope that groups one or more Execution Contexts to achieve an objective."
> Source: docs/04-EXECUTION_MODEL.md, Section 2

Jobs provide:
- **Continuity**: Survive execution attempts
- **Grouping**: Relate multiple execution contexts
- **Navigation**: Stable handle for UI/API
- **Signals**: Aggregate status and attention needs
- **Artifact reference**: Point to key outputs

Jobs have NO stored state - status is derived from signals. They can coordinate serial, parallel, or mixed execution patterns.

#### Execution Contexts: Disposable Actors
> "An Execution Context is a temporary, scoped binding that performs one unit of concrete work."
> Source: docs/04-EXECUTION_MODEL.md, Section 3

Key duality:
- **Contexts are disposable**: May be deleted anytime, not resumed
- **But emit permanent records**: Events logged immutably, artifacts preserved, provenance captured

**The Hard Concurrency Rule**:
> "No two Execution Contexts may concurrently mutate the same scope of work."
> Source: docs/04-EXECUTION_MODEL.md, Section 3

Because the system is fully immutable:
- Contexts do not mutate - they produce new artifacts
- "Conflict" is just parallel alternatives
- Resolution is a separate, explicit act

#### Workflows: Guidance Not Execution
> "Reusable coordination patterns that shape how work unfolds, without prescribing execution logic."
> Source: docs/06-WORKFLOWS.md, Section 1

Workflows consist of:
- **Entry Signals**: When relevant
- **Roles**: Which perspectives needed
- **Phases**: Broad stages of work
- **Activities**: What kind of work happens
- **Checkpoints**: Deliberate pauses for human re-engagement

**Critical Rule**: An Execution Context may reference AT MOST ONE workflow.

### Relevant Quotes/Sections Found

> "HumanWork treats execution as a series of scoped, disposable attempts guided by durable intent."
> Source: docs/04-EXECUTION_MODEL.md, Section 1

> "Execution Contexts do not resume. Instead: A new Execution Context is created. It reads Workspace Memory to understand prior work."
> Source: docs/04-EXECUTION_MODEL.md, Section 6

> "This transforms conflicts from correctness problems into choice problems."
> Source: docs/04-EXECUTION_MODEL.md, Section 3

> "Workflows do not execute. They provide coordination patterns."
> Source: docs/04-EXECUTION_MODEL.md, Section 4

### Execution Coordination Patterns

**Pattern A: Serial Execution (Pipeline)**
- Context 1: Design -> spec
- Context 2: Implement -> code
- Context 3: Review -> approval
- Job survives and maintains continuity

**Pattern B: Parallel Execution (Fan-Out/Fan-In)**
- Context A, B, C run concurrently on distinct scopes
- Context D compares and merges
- Resolution is explicit, not automatic

**Pattern C: Background + Foreground**
- Long-running analysis + interactive brainstorming
- Both execute because scopes are distinct

### Steps and Agents
- **Steps**: Atomic units within Execution Context, owned by role, emit progress
- **Agents**: Stateless workers, receive assembled context, must report status before token exhaustion

**Agent Replaceability**: Work continues seamlessly if agent crashes/exhausts tokens because context is external.

### System Guarantees
1. Single-scope coherence: no concurrent mutation of same scope
2. Human control: execution always interruptible
3. Deterministic replay: all execution reproducible from records
4. Cost attribution: every execution traceable
5. No hidden state: all context external and inspectable
6. Agent replaceability: work continues regardless of agent instance
7. Workflow interoperability: external systems integrate cleanly

### Summary of Theme
The HumanWork execution model separates:
- **Human intent** (Jobs)
- **Work attempts** (Execution Contexts)
- **Guidance patterns** (Workflows)
- **Concrete execution** (Steps/Agents)

This enables:
- Parallel exploration without conflicts
- Long-running work without loss of control
- Framework integration without lock-in
- Enterprise safety without bureaucracy
- Scale without brittleness

The model scales from $3 individual explorations to $3000 enterprise compliance reviews without changing architecture.

## Proposed Spec Changes
- [ ] Add glossary entry clarifying "scope" types (explicit, implicit, tag-based, artifact-based)
- [ ] Create diagram showing Job -> Context -> Steps -> Agents hierarchy
- [ ] Document checkpoint timeout escalation paths in more detail
- [ ] Add explicit guidance on when to use parallel vs serial execution patterns
- [ ] Clarify what "Semantic Memory" contributes to context resumption (mentioned but not detailed)
- [ ] Add example of scope conflict resolution workflow

## Tool Evaluation

### What Worked Well
- **`--section` flag is excellent**: Precise extraction of specific sections without reading full documents
- **`tree` on individual files**: Instant document outline with token counts per section - perfect for planning
- **Search with context lines**: Default context before/after matches aids understanding
- **Section numbering**: Consistent 1.2, 1.3 scheme makes navigation predictable
- **Token budgeting**: `-t 4000` respects limits while showing included/excluded sections
- **Stats command**: Quick index health check

### What Was Frustrating
- **Initial `--section` syntax error**: Passing multiple `--section` flags tried to read flag as filename (had to call once per section)
- **No embeddings**: Semantic search would have helped find conceptual relationships
- **Search results capped at 10**: Sometimes wanted to see more matches
- **Context command truncation**: 36% of 7418 tokens shown with default budget; would prefer explicit "this section won't fit" warning

### Confidence Level
[X] High - The execution model is thoroughly documented with clear definitions, examples, and guarantees. The section-based extraction worked extremely well for deep-diving into complex technical documentation.

### Would Use Again? (1-5)
**5** - The `--section` flag is a game-changer for deep dives. Being able to see the full document outline with token counts, then surgically extract specific sections, made this investigation highly efficient. The search found relevant content across files quickly. This is exactly how technical documentation exploration should work.

**Key workflow discovered**:
1. `tree <file>` - see structure and token counts
2. `context <file> --section "X"` - extract needed sections
3. `search "term"` - find cross-references
4. Repeat as needed

Total commands: 32
Useful commands: 32 (100%)
Highly useful commands: ~20 (63%)
