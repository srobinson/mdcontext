# Report: C6 - Diver: Org-Workspace Model

## Mission
Deep-dive into: Org-Workspace-Cost Model (Theme #5 from C1 Explorer)

## Command Log
| # | Command | Purpose | Result | Useful? |
|---|---------|---------|--------|---------|
| 1 | `mdtldr search "workspace"` | Find workspace content | 10 results spanning 4 docs | Yes |
| 2 | `mdtldr search "org"` | Find org content | 10 results, good coverage | Yes |
| 3 | `mdtldr search "cost"` | Find cost-related content | 10 results, found key docs | Yes |
| 4 | `mdtldr context docs/03-ORG_WORKSPACE_MODEL.md` | Get main doc overview | Truncated to 24%, but overview helpful | Partial |
| 5 | `mdtldr context --section "5. Authority Model"` | Get authority details | Complete section retrieved | Yes |
| 6 | `mdtldr context --sections` | List all sections | Full section index shown | Yes |
| 7 | `mdtldr context --section "6. Cost and Resource Model"` | Get cost model details | Complete section with all subsections | Yes |
| 8 | `mdtldr context --section "9. Org-Workspace Information Flow"` | Cross-workspace learning | Found key principle on authority flow | Yes |
| 9 | `mdtldr search "promotion"` | Find artifact promotion content | 10 results, good workflow examples | Yes |
| 10 | `mdtldr context --section "Phase 11: Promotion to Org Level"` | Example workflow | Concrete promotion example | Yes |
| 11 | `mdtldr search "governance"` | Find governance content | 10 results including enterprise docs | Yes |
| 12 | `mdtldr context --section "12. Why This Model Works"` | Model rationale | Scaling from individuals to enterprises | Yes |
| 13 | `mdtldr search "job"` | Find job layer content | 10 results, found architecture section | Yes |
| 14 | `mdtldr context --section "6. Job Layer"` | Get job definition | Complete job layer explanation | Yes |
| 15 | `mdtldr search "execution context"` | Find context layer content | 10 results | Yes |
| 16 | `mdtldr context --section "7. Execution Context Layer"` | Get context definition | Full lifecycle and semantics | Yes |
| 17 | `mdtldr context --section "2. High-Level Stack"` | Get hierarchy diagram | ASCII stack visualization | Yes |
| 18 | `mdtldr context --section "15. Cost and Resource Model"` (arch) | Architecture cost summary | Concise cost flow explanation | Yes |
| 19 | `mdtldr search "enterprise"` | Find enterprise examples | Example 5 compliance review | Yes |
| 20 | `mdtldr context --section "Example 5: Enterprise"` | Get enterprise workflow | Detailed compliance review walkthrough | Yes |
| 21 | `mdtldr search "knowledge graph"` | Find org knowledge graph | Found definitions and usage | Yes |
| 22 | `mdtldr context --section "Org Knowledge Graph"` | Get knowledge graph details | Derived graph properties | Yes |
| 23 | `mdtldr context --section "13. Summary"` | Get model summary | Core principles list | Yes |
| 24 | `mdtldr search "policy"` | Find policy overlay content | 10 results on optional controls | Yes |
| 25 | `mdtldr context --section "Cost Attribution"` (exec) | Get cost attribution levels | Three-level cost hierarchy | Yes |
| 26 | `mdtldr search "authority"` | Find authority invariants | Key authority principles | Yes |
| 27 | `mdtldr search "boundary"` | Find containment boundaries | Workspace isolation semantics | Yes |
| 28 | `mdtldr context --section "Workspace Boundaries"` | Get boundary details | Strict isolation guarantees | Yes |
| 29 | `mdtldr context --section "17. Org Knowledge Graph"` (prim) | Formal knowledge graph def | Guarantees and properties | Yes |

## Findings

### Key Discoveries

1. **Two-Tier Model is Intentional**: The Org/Workspace split enables "shared learning without central control, reuse without coupling, governance without bureaucracy, cost visibility without micromanagement"

2. **Authority Never Flows Downward**: Critical invariant - Org-level artifacts can be suggested/referenced but never auto-attach, auto-execute, or auto-override Workspace decisions

3. **Agents Explicitly Excluded from Org-Level Authority**: Agents cannot create Workspaces, promote artifacts, or invite users - "keeps humans firmly in control"

4. **Governance is an Overlay, Not Foundation**: Default is permissive (trust-by-default), enterprise controls are optional policy additions

5. **Cost Visibility Over Control**: Philosophy emphasizes transparency and self-regulation over enforcement

### Model Hierarchy

```
Human(s)
   |
Control Plane (ALWAYS LISTENING, PREEMPTIVE)
   |
Org (identity, ownership, learning)
   |
Workspace (shared reality, work boundary)
   |
Jobs (intent over time, coordination)
   |
Execution Contexts (disposable actors, scoped attempts)
   |
Workflows/Steps/Agents/Tools
   |
Artifacts/Records (immutable facts)
```

- **Org**: Top-level identity and ownership boundary. Owns Workspaces, participants, Org-level Artifacts, Knowledge Graph, policies, and cost allocation. Represents an individual, family, team, company, or any collective.

- **Workspace**: The ONLY place where work occurs. Provides strict isolation - execution state, artifacts, history, and cost all exist within a Workspace. Can reference other Workspaces but never implicitly share state.

- **Job**: Human-meaningful coordination envelope that groups Execution Contexts. Provides continuity across execution attempts, UI handles, signal aggregation. Does NOT execute or store state - survives deletion of its contexts.

- **Context (Execution Context)**: The unit of actual work. Ephemeral, scoped, disposable. Binds a scope of work, roles, and optionally a workflow. Creates permanent records (events) but is itself temporary.

### Cost Model

**Three-Level Attribution:**

1. **Execution Context Level (Most Granular)**
   - Token consumption
   - Tool invocations
   - Compute time
   - Storage of context artifacts

2. **Job Level (Aggregated)**
   - Sum of all associated Execution Contexts
   - Visible to humans
   - Used for budget decisions

3. **Workspace Level (Boundary)**
   - Sum of all Jobs
   - Org-level reporting
   - Policy enforcement point

**Key Principles:**
- Cost is owned at Org level, attributed at Workspace level, accrued at Execution Context level
- Dormant Workspaces incur minimal cost
- Navigation and discovery are low-cost by design
- Default Workspace is intentionally lightweight (zero-friction onboarding)

**Future Controls (Optional Overlays):**
- Soft budgets per Workspace
- Org-level usage alerts
- Creation limits
- Execution throttles
- Approval workflows

### Cross-Workspace Learning (Promotion)

**Upward Flow (Workspace to Org):**
- Artifacts promoted via explicit human or policy action
- Patterns extracted for Org Knowledge Graph
- Learning aggregated
- Flow is one-way, lossy, asynchronous, revocable

**Downward Flow (Org to Workspace):**
- Org artifacts can be suggested, referenced, or explicitly imported
- May NEVER auto-attach, auto-execute, or auto-override

> **"Truth is local. Meaning is global. Authority never flows downward."**

### Relevant Quotes/Sections Found

> "This document defines the identity, containment, cost, and authority model for HumanWork."
> Source: docs/03-ORG_WORKSPACE_MODEL.md, intro

> "Workspace boundaries are strict and enforced... Workspaces may reference one another, but they never implicitly share state."
> Source: docs/03-ORG_WORKSPACE_MODEL.md, Workspace Boundaries

> "Cost is: owned at the Org level, attributed at the Workspace level, accrued at the Execution Context level, visible in real-time"
> Source: docs/01-ARCHITECTURE.md, Section 15

> "No authority flows from Org to Workspace automatically"
> Source: docs/02-PRIMITIVES.md, Section 19 Invariants

> "Agents: Never have Org-level roles, Only operate within Workspaces, Inherit authority from Workspace roles, Cannot create Workspaces, Cannot promote artifacts, Cannot invite users"
> Source: docs/03-ORG_WORKSPACE_MODEL.md, Agents Never Have Org-Level Authority

### Enterprise Governance Example

The compliance review example (Example 5) demonstrates:
- 10 participants across 5 functional areas
- Heavy checkpoint enforcement
- Parallel review streams (security, legal, technical)
- Remediation loops with clear ownership
- Executive approval flow with dual sign-off
- Automatic audit trail generation
- Org-level promotion of compliance artifacts
- Cost: $3,240 tracked and attributed
- Time: 23 days with full visibility

### Summary of Theme

The Org-Workspace model enables governance through:

1. **Clear Containment**: Two-tier hierarchy separates identity/ownership (Org) from execution/work (Workspace)

2. **Cost Attribution by Design**: Every cost element flows up from Context to Job to Workspace to Org, making budget decisions transparent

3. **Promotion Mechanism**: Cross-workspace learning happens through explicit artifact promotion, preserving autonomy while enabling reuse

4. **Authority Boundaries**: Agents operate only within Workspaces; humans control cross-workspace flows

5. **Overlay Architecture**: Governance is additive - enterprises add policy controls, individuals get trust-by-default

6. **Audit Trail**: Immutable events enable regulatory-grade compliance without bureaucratic overhead

## Proposed Spec Changes

- [ ] Add explicit cost budget alerts/limits API to the Cost Model section
- [ ] Define formal promotion workflow stages (propose, review, approve, publish)
- [ ] Clarify how Org Knowledge Graph recommendations surface in Workspace UX
- [ ] Add section on Workspace archival policies for cost management
- [ ] Define multi-Org scenarios (user belonging to multiple Orgs) and cross-Org patterns
- [ ] Add monitoring/dashboard primitives for cost visibility

## Tool Evaluation

### What Worked Well
- **Search was fast and relevant**: Every search returned useful results with context
- **Section targeting**: `--section` flag allowed precise extraction of specific topics
- **Hierarchical navigation**: `--sections` gave clear document structure for navigation
- **Line-level context**: Search showed surrounding lines which helped understand context
- **Token efficiency**: Got focused content without loading entire documents

### What Was Frustrating
- **Initial context truncation**: Default context command only showed 24% of large document
- **Two-word search failure**: `mdtldr search "job context"` returned 0 results (had to search separately)
- **No semantic search**: Tip kept reminding to run `--embed` but this was out of scope
- **Section name matching**: Had to get exact section names (e.g., "6" didn't work, needed "6. Cost and Resource Model")

### Confidence Level
[X] High / Medium / Low

The Org-Workspace-Cost Model is well-documented with:
- Dedicated document (03-ORG_WORKSPACE_MODEL.md)
- Architecture section coverage
- Primitives definitions
- Detailed enterprise example workflow
- Clear invariants and guarantees

### Would Use Again? (1-5)
**4** - The tool effectively supported deep-dive research. Section targeting was invaluable for large documents. The combination of search (for discovery) and context (for retrieval) worked well. Lost one point for multi-word search limitations and initial truncation confusion.
