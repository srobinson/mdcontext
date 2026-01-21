# Task Management for Ralph: Synthesis & Recommendations

**Date:** January 21, 2026
**Purpose:** Recommend a task management approach for capturing intent before AI agent (ralph) processing

---

## Executive Summary

**For capturing task intent in an AI agent workflow, use a file-based SPEC.md pattern stored in Git.** This approach offers the best balance of human usability, LLM compatibility, and zero friction. External tools like Linear or GitHub Issues add unnecessary complexity for the core problem of "capture intent quickly so ralph can act on it." The SPEC.md pattern is already proven in the codebase, requires no new tooling, and aligns with the emerging industry standard of spec-driven development. Reserve external tools (Linear, GitHub Issues) for team coordination and visibility, not for the AI agent interface.

---

## Context

### The Problem

We need a system for capturing task intent before processing through "ralph" (an AI agent orchestration system). This is specifically about the **input interface** to the agent, not project management at large.

### Requirements

| Requirement | Priority | Notes |
|-------------|----------|-------|
| Capture task intent quickly | Critical | Friction kills adoption |
| LLM-friendly format | Critical | Ralph must parse and understand it |
| Git-native | High | Version control, audit trail, offline |
| Low friction for humans | High | Must be faster than "just do it myself" |
| Scales to many tasks | Medium | Backlog accumulation, parallel work |

### Constraint

Ralph operates on files in a repository. Whatever system we choose must either:
1. **Live in the repo** (file-based), or
2. **Be accessible via MCP/API** (external tool)

---

## Options Matrix

### Top 4 Approaches Evaluated

| Approach | Quick Capture | LLM-Friendly | Git-Native | Low Friction | Scales | Overall |
|----------|---------------|--------------|------------|--------------|--------|---------|
| **SPEC.md Pattern** | A | A | A | A | B | **A** |
| **Backlog.md** | B | A | A | B | A | **A-** |
| **Linear** | B | B | C | A | A | **B+** |
| **GitHub Issues** | C | B | B | B | A | **B** |

### Detailed Analysis

#### 1. SPEC.md Pattern (File-Based Specifications)

**What it is:** Markdown files in the repo (e.g., `SPEC.md`, `TODO.md`, `PLAN.md`) that define task intent. Already emerging as the industry standard for AI-assisted development in 2026.

**Pros:**
- Zero dependencies - works with any editor, any AI tool
- Direct context injection into LLM prompts (no API calls)
- Git versioning provides audit trail and rollback for free
- Human and AI edit the same artifact
- Token-efficient format (markdown is LLM-native)
- Already using something similar in the codebase

**Cons:**
- No built-in visualization (Kanban, timelines)
- Requires discipline to maintain structure
- Doesn't scale well for team-wide coordination across multiple projects

**Best for:** Individual or small team AI coding workflows where the developer is the primary user.

#### 2. Backlog.md

**What it is:** Purpose-built tool for AI-human collaboration. Each task is a separate `.md` file in a `.backlog/` directory. CLI and web interface available.

**Pros:**
- Designed specifically for AI agent workflows
- Git-native with task IDs referencing commits/branches
- Terminal Kanban for visualization
- Works with Claude Code, Cursor, and MCP-compatible tools
- Open source, no vendor lock-in

**Cons:**
- Adds a tool/CLI dependency
- Slightly more structure than bare SPEC.md
- Newer tool with smaller community

**Best for:** Teams wanting more structure than plain markdown but still git-native.

#### 3. Linear

**What it is:** The leading AI-native project management tool. Treats AI agents as "full teammates" with native integrations to Cursor, Copilot, and Claude.

**Pros:**
- Best-in-class AI agent integration (agents as assignable teammates)
- Excellent API and MCP servers
- Team visibility and coordination features
- Fast, keyboard-first UI

**Cons:**
- External service (not in repo)
- Requires MCP/API integration for ralph to access
- Adds latency to task capture (open tool, create issue)
- Paid at scale ($8/user/month)
- Another tool to maintain

**Best for:** Team coordination, roadmap visibility, when multiple people need to see task status.

#### 4. GitHub Issues

**What it is:** GitHub's built-in issue tracker, now with Copilot coding agent that can be assigned issues directly.

**Pros:**
- Already using GitHub
- Copilot can autonomously work on issues
- No new tool adoption
- Free

**Cons:**
- Slow to create issues (web UI friction)
- Not optimized for quick intent capture
- Less LLM-friendly than markdown files
- Requires API calls for ralph to read

**Best for:** When you need the issue-to-PR workflow with Copilot, team-visible bug tracking.

---

## Recommendation

### Primary: SPEC.md Pattern

**Use file-based specifications as the primary interface between humans and ralph.**

#### Rationale

1. **Lowest friction for capture:** Open file, write intent, save. Done. No context switching to another tool.

2. **Best LLM compatibility:** Markdown is the native language of LLMs. No translation layer, no API calls, no token overhead from structured formats.

3. **Already proven:** The research shows spec-driven development is the emerging standard. GitHub Spec-Kit, JetBrains Junie, Amazon Kiro - all use this pattern.

4. **Git-native by default:** Every change is versioned. Branching allows parallel task exploration. History shows what was attempted and why.

5. **Zero new tooling:** Works today with the existing setup. No adoption curve, no dependencies to maintain.

6. **Context window optimization:** Files can be selectively loaded. Large backlogs don't need to be sent to the LLM - only the relevant spec.

#### Proposed File Structure

```
.ralph/
  BACKLOG.md          # Quick task capture (one-liner ideas)
  active/
    feature-x.spec.md # Detailed spec for in-progress work
    bug-fix-y.spec.md
  completed/          # Archived specs (reference/learning)
  templates/
    feature.spec.md   # Template for new features
    bugfix.spec.md    # Template for bug fixes
```

#### Spec File Format

```markdown
# [Task Title]

## Intent
[One paragraph: What do we want to accomplish and why?]

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Context
[Any relevant background, links, constraints]

## Notes
[Optional: implementation hints, considerations]
```

### Secondary: Linear for Team Visibility

**If you need team coordination or external visibility, sync completed specs to Linear.**

- Use Linear for roadmap and sprint planning
- Use Linear for stakeholder visibility
- Keep ralph's input interface file-based
- Consider automation: completed specs could auto-create Linear issues for tracking

### Why Not Linear as Primary?

Linear is excellent, but it adds friction to the core workflow:

1. **Context switch:** You're in your editor, you have an idea, you have to open Linear
2. **API dependency:** Ralph needs MCP/API calls instead of file reads
3. **Not the source of truth:** The code is in git, the spec should be too
4. **Overkill for capture:** Linear is optimized for team coordination, not quick intent capture

Linear makes sense for *visibility and coordination*, not for *AI agent input*.

### Why Not Backlog.md?

Backlog.md is well-designed and could work. However:

1. **Adds a dependency** for marginal benefit over plain markdown
2. **Learning curve** for the CLI and conventions
3. **SPEC.md is simpler** and already aligns with industry patterns

If the team grows or the backlog becomes complex, Backlog.md is a good upgrade path.

---

## Implementation Path

### Phase 1: Establish the Pattern (Day 1)

1. Create `.ralph/` directory structure
2. Create `BACKLOG.md` for quick capture
3. Create spec templates
4. Document the pattern in CLAUDE.md

### Phase 2: Integrate with Ralph (Week 1)

1. Update ralph to look for specs in `.ralph/active/`
2. Implement spec parsing (extract intent, success criteria)
3. Add success criteria tracking (ralph marks criteria complete)
4. Move completed specs to `.ralph/completed/`

### Phase 3: Optimize (Ongoing)

1. Refine templates based on what works
2. Consider auto-sync to Linear for visibility (if needed)
3. Add tooling for quick spec creation (CLI or editor shortcuts)

### Example Workflow

```bash
# Human captures intent quickly
echo "# Add dark mode support

## Intent
Users want dark mode to reduce eye strain during night coding sessions.

## Success Criteria
- [ ] Toggle in settings
- [ ] Persists across sessions
- [ ] Respects system preference by default
" > .ralph/active/dark-mode.spec.md

# Ralph picks it up and executes
ralph process .ralph/active/dark-mode.spec.md
```

---

## Decision Summary

| Decision | Choice | Confidence |
|----------|--------|------------|
| Primary task capture | SPEC.md files in `.ralph/` | High |
| Format | Markdown with structured sections | High |
| Location | Git repository | High |
| Team coordination | Linear (optional, secondary) | Medium |
| External issue tracking | GitHub Issues (for bugs, community) | Medium |

---

## Sources

This synthesis is based on four research documents:

1. **01-ai-workflow-tools.md** - Survey of AI-native task management tools (Linear, Taskade, Backlog.md, Plane.so, etc.)
2. **02-agent-framework-patterns.md** - How AI agent frameworks (LangGraph, CrewAI, Claude Code) handle task persistence
3. **03-lightweight-file-based.md** - File-based approaches (SPEC.md, Beads, todo.txt, etc.)
4. **04-established-tools-ai-features.md** - AI features in GitHub, Linear, Jira, Notion

Key external sources informing this recommendation:
- [GitHub Spec-Kit](https://github.com/github/spec-kit/blob/main/spec-driven.md)
- [Addy Osmani on specs for AI agents](https://addyosmani.com/blog/good-spec/)
- [Steve Yegge on coding agent memory](https://steve-yegge.medium.com/introducing-beads-a-coding-agent-memory-system-637d7d92514a)
- [Thoughtworks on Spec-Driven Development](https://www.thoughtworks.com/en-us/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)
