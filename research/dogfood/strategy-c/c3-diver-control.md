# Report: C3 - Diver: Human-Agent Control

## Mission

Deep-dive into: Human-Agent Control Model

## Command Log

| #   | Command                                                                          | Purpose                               | Result                                                            | Useful?   |
| --- | -------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------- | --------- |
| 1   | `mdtldr --help`                                                                  | Understand available commands         | Full command list shown                                           | Yes       |
| 2   | `mdtldr tree`                                                                    | List all markdown files               | 23 files found                                                    | Yes       |
| 3   | `mdtldr search "human control"`                                                  | Find human control content            | 10 results across multiple files                                  | Yes       |
| 4   | `mdtldr search "control plane"`                                                  | Find control plane architecture       | 10 results showing core authority layer                           | Yes       |
| 5   | `mdtldr search "preemptive authority"`                                           | Find preemptive authority details     | 5 results with key definitions                                    | Yes       |
| 6   | `mdtldr search "interrupt"`                                                      | Find interruptibility patterns        | 10 results showing guaranteed interrupts                          | Yes       |
| 7   | `mdtldr tree docs/01-ARCHITECTURE.md`                                            | Show document outline                 | Full section hierarchy (5037 tokens)                              | Yes       |
| 8   | `mdtldr context docs/01-ARCHITECTURE.md --section "3. Control Plane"`            | Get Control Plane section             | Full section with responsibilities and authority model            | Excellent |
| 9   | `mdtldr tree docs.amorphic/04-THE_HUMAN-AGENT_COLLABORATION_MODEL.md`            | Show collaboration model outline      | Two-part structure revealed                                       | Yes       |
| 10  | `mdtldr context ... --section "The Authority Gradient"`                          | Get authority gradient details        | Complete section on dynamic control spectrum                      | Excellent |
| 11  | `mdtldr context ... --section "Intervention Points"`                             | Get intervention details              | Redirect, Override, Inject, Escalate actions                      | Excellent |
| 12  | `mdtldr search "checkpoint"`                                                     | Find checkpoint patterns              | 10 results showing deliberate pause points                        | Yes       |
| 13  | `mdtldr context docs/06-WORKFLOWS.md --section "Checkpoints"`                    | Get checkpoint details                | Comprehensive checkpoint types and why they matter                | Excellent |
| 14  | `mdtldr search "pause"`                                                          | Find pause control operations         | 10 results showing control actions                                | Yes       |
| 15  | `mdtldr context docs/02-PRIMITIVES.md --section "Control Actions"`               | Get control action primitives         | YAML schema for pause, resume, cancel, etc.                       | Excellent |
| 16  | `mdtldr search "human decision"`                                                 | Find human decision points            | 8 results on explicit decision points                             | Yes       |
| 17  | `mdtldr context docs/00-README.md --section "Core Principles"`                   | Get core principles                   | Human Control as explicit commitment                              | Excellent |
| 18  | `mdtldr context ... --section "Spectrum of Collaboration Modes"`                 | Get collaboration modes               | Four modes: Instructional, Consultative, Supervisory, Exploratory | Excellent |
| 19  | `mdtldr search "governance"`                                                     | Find governance patterns              | 10 results showing accountability structures                      | Yes       |
| 20  | `mdtldr search "trust"`                                                          | Find trust-related concepts           | 10 results showing designed trust model                           | Yes       |
| 21  | `mdtldr search "autonomous"`                                                     | Find autonomous vs controlled context | 10 results contrasting with human control                         | Yes       |
| 22  | `mdtldr context docs/01-ARCHITECTURE.md --section "Control Flow"`                | Get control flow details              | Three flows: Initiate, Interrupt, Resume                          | Excellent |
| 23  | `mdtldr search "override"`                                                       | Find override capabilities            | 10 results showing override principle                             | Yes       |
| 24  | `mdtldr context docs/06-WORKFLOWS.md --section "The Override Principle"`         | Get override details                  | Every suggestion overridable, logged, not penalized               | Excellent |
| 25  | `mdtldr search "directive"`                                                      | Find directive patterns               | 4 results on control plane directives                             | Yes       |
| 26  | `mdtldr context docs/01-ARCHITECTURE.md --section "Architectural Invariants"`    | Get invariants                        | "No loss of human authority" is an invariant                      | Excellent |
| 27  | `mdtldr search "escalate OR escalation"`                                         | Find escalation patterns              | 10 results on escalation mechanisms                               | Yes       |
| 28  | `mdtldr context ... --section "Event-Driven Transparency"`                       | Get transparency details              | Every action becomes observable event                             | Excellent |
| 29  | `mdtldr context docs/01-ARCHITECTURE.md --section "Why This Architecture Works"` | Get architecture rationale            | "Deep autonomy without loss of control"                           | Excellent |
| 30  | `mdtldr context docs/00-README.md --section "Key Differentiators"`               | Get differentiators table             | Control: Explicit & global vs Implicit                            | Excellent |

## Findings

### Key Discoveries

1. **Control Plane as Authority Layer**: The Control Plane is the system's central authority mechanism. It has "preemptive authority" over all execution - no agent, workflow, or job may refuse a control plane directive. This is the architectural guarantee of human control.

2. **Authority Gradient Concept**: HumanWork implements a dynamic "authority gradient" - humans can move anywhere along a spectrum from instructional (step-by-step) to supervisory (broad autonomy with monitoring) at any moment, even mid-execution.

3. **Checkpoints as Core Control Mechanism**: Checkpoints are explicitly called "the most important concept for human-first workflows." They provide deliberate pauses where humans are re-engaged, direction is confirmed, and escalation is considered.

4. **Four Collaboration Modes**: The system defines Instructional, Consultative, Supervisory, and Exploratory modes - each with different balances of human involvement and agent autonomy.

5. **Guaranteed Interruptibility**: Unlike "best-effort" interrupts in typical agent frameworks, HumanWork guarantees interruptibility as a core differentiator. This is achieved through immutable event records and control plane architecture.

6. **Override Principle**: Every workflow suggestion can be overridden by humans - including skipping phases, ignoring activities, bypassing checkpoints (with acknowledgment), or detaching workflows entirely. Overrides are logged but not penalized.

7. **Architectural Invariant**: "No loss of human authority" is explicitly listed as a system-wide invariant that guides all implementation decisions.

8. **Control Actions Primitive**: The system defines a formal schema for control actions: pause, resume, cancel, reassign, modify_metadata, inject_step, fork, terminate.

### Relevant Quotes/Sections Found

> "The Control Plane has **preemptive authority** over all execution. No agent, workflow, or job may refuse a control plane directive. This guarantees human control at all times."
> Source: docs/01-ARCHITECTURE.md, Authority Model section

> "Humans retain authority over execution at all times. Any step can be paused, redirected, modified, or terminated immediately."
> Source: docs/00-README.md, Core Principles

> "Critically, humans can move anywhere along this gradient at any moment, even mid-execution."
> Source: docs.amorphic/04-THE_HUMAN-AGENT_COLLABORATION_MODEL.md, The Authority Gradient

> "Checkpoints are where: Human control is enforced, Cost is consciously acknowledged, Autonomy is bounded, Trust is built. Most agent systems lack this concept entirely."
> Source: docs/06-WORKFLOWS.md, Checkpoints (Guardrails)

> "Every workflow suggestion can be overridden by humans... Overrides are: Logged, Explained, Not penalized"
> Source: docs/06-WORKFLOWS.md, The Override Principle

> "No loss of human authority" [listed as architectural invariant]
> Source: docs/01-ARCHITECTURE.md, Architectural Invariants

> "The system doesn't break - it adapts. The workflow doesn't restart - it continues from the intervention point with new constraints."
> Source: docs.amorphic/04-THE_HUMAN-AGENT_COLLABORATION_MODEL.md, Intervention Points

### Summary of Theme

The Human-Agent Control Model in HumanWork is fundamentally different from typical autonomous agent frameworks. Rather than treating human control as a constraint or afterthought, it is architected as the primary design principle.

**Core Philosophy**: "The system favors clarity, safety, and trust over raw autonomy."

**Key Architectural Elements**:

1. **Control Plane** - An always-active authority layer that governs (but doesn't participate in) execution
2. **Checkpoints** - Deliberate pause points for human re-engagement built into workflow design
3. **Authority Gradient** - Dynamic spectrum allowing humans to adjust autonomy level at any moment
4. **Intervention Points** - Every event boundary is an opportunity for human redirect, override, inject, or escalate

**Guarantees**:

- Preemptive authority (agents cannot refuse directives)
- Guaranteed interruptibility (not best-effort)
- All overrides logged but not penalized
- No loss of human authority (architectural invariant)

**Differentiation from Typical Frameworks**:

| Aspect           | Typical     | HumanWork         |
| ---------------- | ----------- | ----------------- |
| Control          | Implicit    | Explicit & global |
| Interruptibility | Best-effort | Guaranteed        |
| Trust            | Assumed     | Designed          |

The model enables "deep autonomy without loss of control" - agents can operate with significant independence while humans retain the ability to intervene, redirect, or terminate at any moment. This is achieved through immutable event recording, the Control Plane architecture, and systematic checkpoint placement.

## Proposed Spec Changes

- [ ] Add explicit section on "Human Authority Guarantees" listing all control mechanisms
- [ ] Document the Control Plane API/interface more concretely (how do humans issue directives?)
- [ ] Add examples of authority gradient transitions (moving from Supervisory to Instructional mid-task)
- [ ] Clarify checkpoint enforcement mechanisms (how is "required" vs "optional" enforced technically?)
- [ ] Add comparison table showing HumanWork control model vs other frameworks (LangGraph, AutoGPT, etc.)

## Tool Evaluation

### What Worked Well

- `mdtldr search` with keyword queries was highly effective for finding relevant content
- `mdtldr context --section` was excellent for extracting focused, complete sections
- `mdtldr tree <file>` provided perfect document outlines for navigation
- Boolean operators (`OR`) worked as expected for combining search terms
- Search results showed line numbers and context, making it easy to understand matches
- The workflow of search -> tree -> context was very natural for deep-diving

### What Was Frustrating

- No way to search within a specific file (had to search globally then filter mentally)
- Could not request multiple sections in one `context` command
- No embeddings indexed, so semantic search unavailable (would have helped with concept exploration)
- Search result limit of 10 sometimes truncated useful results (no way to paginate or increase)
- Phrase search with multiple words ("pause resume terminate") returned 0 results - had to search individually

### Confidence Level

[X] High - I found comprehensive documentation on the human-agent control model across multiple files and was able to extract detailed information on the Control Plane, checkpoints, authority gradient, and intervention mechanisms.

### Would Use Again? (1-5)

**4** - Effective for focused documentation research. The search-tree-context workflow is well-designed for finding and extracting specific information. Would be a 5 if embeddings were available for semantic search and if there were better multi-section extraction options.
