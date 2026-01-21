# Lightweight File-Based Task Management for AI Workflows

_Research compiled January 2026_

## Executive Summary

File-based task management is emerging as a foundational pattern for AI-assisted development. Unlike traditional task management systems that rely on databases and web APIs, plain-text and markdown-based approaches offer unique advantages for LLM workflows: direct context injection, version control integration, human-AI collaboration on the same artifacts, and zero vendor lock-in.

This research surveys the landscape of lightweight task management approaches in 2026, with particular focus on their applicability to AI coding workflows.

---

## 1. Why File-Based Task Management for AI Workflows?

### 1.1 The Context Window Problem

LLMs operate within finite context windows. Everything the model needs to understand must fit within this window: system prompts, conversation history, code context, and task specifications. File-based task management directly addresses this constraint:

- **Token Efficiency**: Plain text and markdown are inherently token-efficient. [Research shows](https://arxiv.org/html/2411.10541v1) that GPT-3.5-turbo performance varies by up to 40% depending on prompt format, with markdown being preferred for its readability and token efficiency.
- **Direct Injection**: File contents can be directly included in prompts without API calls or format conversion.
- **Selective Loading**: Agents can read specific sections or files rather than querying entire databases.

### 1.2 Version Control as Memory

AI coding agents famously have no memory between sessions. File-based systems leverage Git as a persistence layer:

> "The problem we all face with coding agents is that they have no memory between sessions -- sessions that only last about ten minutes. It's the movie Memento in real life." -- [Steve Yegge, creator of Beads](https://steve-yegge.medium.com/introducing-beads-a-coding-agent-memory-system-637d7d92514a)

Git-native task management provides:

- **Audit trails** that sync with codebase history
- **Branching** for parallel task exploration
- **Collaboration** between humans and multiple agents
- **Rollback** when agent work goes wrong

### 1.3 Human-AI Collaboration on Same Artifacts

When tasks live in markdown files within the repo, both humans and AI agents can:

- Read the same task definitions
- Update progress in the same format
- Add notes and context that persist
- Review each other's work through standard PR workflows

---

## 2. Plain-Text Task Management Systems

### 2.1 Todo.txt

[Todo.txt](http://todotxt.org/) represents the minimalist philosophy: tasks as lines in a plain text file.

**Format:**

```
(A) 2026-01-21 Call Mom @phone +Family
x 2026-01-20 2026-01-15 File taxes @computer +Finance
```

**Strengths for AI:**

- Extremely simple for LLMs to parse and generate
- No dependencies or special tooling required
- Portable across any system

**Limitations:**

- No support for subtasks or dependencies
- No due dates (only creation/completion dates)
- Limited metadata capabilities

**AI Applicability:** Best for simple, flat task lists where an agent needs to track its own work. The simplicity is both strength and weakness.

### 2.2 TaskWarrior

[TaskWarrior](https://taskwarrior.org/) offers a richer feature set for command-line task management.

**Key Features:**

- Dependencies between tasks
- Due dates, start dates, recurrence
- Projects, tags, and user-defined attributes
- Virtual tags (TODAY, OVERDUE, etc.)
- Sync capabilities

**AI Considerations:**

- More complex format for LLMs to work with
- Rich feature set useful for complex project management
- JSON export enables structured AI consumption
- Overkill for simple agent workflows

### 2.3 Org-mode (Emacs)

[Org-mode](https://orgmode.org/org.html) is the most powerful plain-text organizational system, combining task management with notes, documentation, and more.

**LLM Integration Tools:**

- [gptel](https://github.com/karthink/gptel): Simple, extensible LLM client for Emacs
- [org-ai](https://github.com/rksm/org-ai): Personal AI assistant for Emacs using LLMs
- [gptel-got](https://codeberg.org/bajsicki/gptel-got): Tooling for LLM interactions with org-mode

**AI-Specific Capabilities:**

- LLMs can generate subtasks from headlines
- Estimate task durations
- Review and reorganize task hierarchies
- All within version-controlled plain text

**Limitations:**

- Requires Emacs ecosystem
- Learning curve for org-mode syntax
- Not as universal as markdown

---

## 3. Markdown-Based Task Systems

### 3.1 Backlog.md

[Backlog.md](https://github.com/MrLesk/Backlog.md) transforms any Git repo into a self-contained project board using markdown files.

**Core Principles:**

1. **Markdown as database**: Each task is a separate `.md` file
2. **Git-native integration**: Task IDs reference commits and branches
3. **Terminal-first design**: Full CLI functionality

**AI Integration:**

- Works with Claude Code, Gemini CLI, Codex, and MCP-compatible assistants
- Structured format for easy AI parsing
- Web interface and terminal Kanban for visualization

**Example Structure:**

```
.backlog/
  tasks/
    TASK-001.md
    TASK-002.md
  config.yaml
```

### 3.2 Tasks.md

[Tasks.md](https://github.com/BaldissaraMatheus/Tasks.md) is a self-hosted, markdown-based Kanban board.

**Features:**

- Cards, lanes, and tags in a responsive web interface
- PWA installation support
- All data stored in markdown files

**Use Case:** Teams wanting visual task boards while keeping data in version-controllable markdown.

### 3.3 TODO.md Standard

The [TODO.md standard](https://github.com/todo-md/todo-md) defines an interchangeable format for task management that's machine-processable.

**Philosophy:** Manage todos the "git-way" across multiple repositories with a consistent format.

### 3.4 tik

[tik](https://github.com/vvhg1/tik) combines project/task management with Git integration using markdown files.

**Design Focus:** Simplicity and ease of use while maintaining project organization.

---

## 4. Git-Native Issue Tracking

### 4.1 Beads

[Beads](https://github.com/steveyegge/beads), created by Steve Yegge, is a "memory upgrade for coding agents" -- a Git-backed issue tracker designed specifically for AI workflows.

**Architecture:**

- Local SQLite database for speed
- JSONL files for Git synchronization
- Automatic sync between DB and files

**Key Differentiators:**

- **DAG + Priority Model**: Dependency-aware task graphs
- **Agent-Centric Design**: Agents file and manage issues automatically
- **JSON Interface**: Primary interface designed for programmatic access
- **Auto-Sync**: Changes flush to JSONL after 5 seconds of inactivity

**Why Not Plain Markdown?**

> "A flat markdown list doesn't explicitly define relationships between tasks. An agent might struggle to understand that Task C depends on completing Task A and Task B first."

**Visualization Tools:**

- Kanban board view
- Dependency graph visualization
- Graph metrics and bottleneck analysis via [Beads Viewer](https://github.com/Dicklesworthstone/beads_viewer)

### 4.2 Issues-as-Files Approach

The broader pattern of storing issues as files enables:

- Issues versioned alongside code
- Offline access and editing
- Standard text tools for search/manipulation
- No external service dependencies

---

## 5. Spec-Driven Development

### 5.1 The SDD Paradigm

[Spec-driven development (SDD)](https://www.thoughtworks.com/en-us/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices) has emerged as a key pattern for AI-assisted development in 2025-2026.

**Core Concept:**

> "Spec-driven development means writing a 'spec' before writing code with AI. The spec becomes the source of truth for the human and the AI."

**Typical File Structure:**

```
project/
  requirements.md    # What we're building
  design.md          # How we're building it
  tasks.md           # Implementation breakdown
  plan.md            # Execution steps
```

### 5.2 Tools and Frameworks

**GitHub Spec-Kit:**

- [Open-source toolkit](https://github.com/github/spec-kit/blob/main/spec-driven.md) for spec-driven workflows
- Structured directories for specs, contracts, data models
- Works with various AI coding tools

**Amazon Kiro:**

- Predefined SDD workflows
- Requirements-driven development
- Integrated task generation from specs

**JetBrains Junie:**

- [Spec-driven approach](https://blog.jetbrains.com/junie/2025/10/how-to-use-a-spec-driven-approach-for-coding-with-ai/) for AI coding
- Markdown-based requirements

### 5.3 Best Practices

From [Addy Osmani's guide on specs for AI agents](https://addyosmani.com/blog/good-spec/):

1. **Living Documents**: Update specs as decisions are made
2. **Ground Truth**: Specs drive implementation, tests, and task breakdowns
3. **Human-in-the-Loop**: Review specs before handing to agents
4. **Planning Method**: Use something like Backlog.md to break down work

---

## 6. AI Coding Tool Approaches

### 6.1 Claude Code

Claude Code uses markdown files for configuration and task persistence.

**CLAUDE.md Files:**

- [Project-level configuration](https://claude.com/blog/using-claude-md-files) in markdown
- Persistent instructions across sessions
- Can reference external files for context

**Task Persistence Challenges:**

- Built-in todo list doesn't persist across sessions
- Context window resets clear task state

**Workarounds:**

- Create `plan.md` or `todo.md` files manually
- Use [ralph-wiggum plugin](https://looking4offswitch.github.io/blog/2026/01/04/ralph-wiggum-claude-code/) for autonomous task loops
- [CCPM](https://github.com/automazeio/ccpm): Project management using GitHub Issues and Git worktrees

**Minimalist Workflow Pattern** (from [Nick Tune](https://medium.com/nick-tune-tech-strategy-blog/minimalist-claude-code-task-management-workflow-7b7bdcbc4cc1)):

```markdown
# TODO.md

- [ ] Task 1: Description
- [x] Task 2: Completed
- [ ] Task 3: In progress
```

### 6.2 Cursor and Windsurf

Modern AI IDEs [handle context differently](https://www.builder.io/blog/windsurf-vs-cursor):

**Cursor:**

- Manual context curation with @ symbols
- Rules files (`.cursorrules`) for project configuration
- Developer-driven approach

**Windsurf:**

- Automatic context detection
- Repository-scale comprehension
- Multi-file reasoning

**Common Pattern:** Both support AGENTS.md files for agent-specific instructions.

### 6.3 AGENTS.md Standard

[AGENTS.md](https://agents.md/) is now stewarded by the Linux Foundation's Agentic AI Foundation.

**Purpose:** A README for AI agents -- instructions on how to work with a codebase.

**Adoption:** Major repos (e.g., OpenAI) have multiple AGENTS.md files.

---

## 7. YAML/JSON Task Specifications

### 7.1 YAML for Agent Configuration

[YAML has become the de facto standard](https://empathyfirstmedia.com/yaml-files-ai-agents/) for AI agent configuration.

**Advantages:**

- Human-readable hierarchical structure
- Widely supported parsing libraries
- Clean separation of concerns

**Use Cases:**

- Agent role definitions
- Task parameters
- Workflow configurations

### 7.2 Agent Skills (VS Code)

[Copilot Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills) use YAML frontmatter:

```yaml
---
name: my-skill
description: What this skill does
---
# Skill instructions in markdown
```

**Benefits:**

- Portable across agents
- Metadata for skill discovery
- Instructions in natural language

### 7.3 Conformance Testing

YAML-based conformance suites define expected inputs/outputs for agent behavior:

- Language-independent test definitions
- Contract-style specifications
- Verifiable agent behavior

---

## 8. LLM-Native Formats

### 8.1 llm-md (Large Language Model Markdown)

[llm-md](https://llm.md/) is a workflow definition language built on markdown.

**Key Features:**

- Define conversations in `.md` files
- Context, user input, and responses in one file
- Version-controllable AI interactions
- Multi-agent workflows with operators (`>>>`, `>>=`, `=>>`, `!>>`)
- Shell command integration
- Scoped variables (global, session, agent, local)

**Example:**

```markdown
# Agent: researcher

You are a research assistant.

## User

Find information about task management.

## Assistant

[Response appears here]

> > >

# Agent: summarizer

Summarize the research above.
```

**Philosophy:**

> "AI interactions become plain-text files you can version, share, and trace, complete with context, agent flow, and conversation history."

### 8.2 llms.txt

[llms.txt](https://www.tryprofound.com/guides/what-is-llms-txt-guide) is an emerging standard for making websites LLM-friendly:

- Structured content for AI parsing
- Optimization for inference
- Bridge between human-centric web and machine-readable data

---

## 9. Recommendations for AI Workflow Task Management

### 9.1 For Simple Agent Tasks

**Recommended: Markdown checkbox lists in a `TODO.md` file**

```markdown
# Current Sprint

## In Progress

- [ ] Implement authentication module
  - [x] Set up JWT tokens
  - [ ] Add refresh token logic

## Pending

- [ ] Write unit tests
- [ ] Update documentation
```

**Why:**

- Zero tooling required
- Directly readable by any LLM
- Git-versioned automatically
- Human and AI can both update

### 9.2 For Complex Multi-Agent Projects

**Recommended: Beads or Backlog.md**

- Dependency tracking between tasks
- Multiple agents can coordinate
- Git sync for persistence
- Structured format for programmatic access

### 9.3 For Spec-Driven Development

**Recommended: Spec-Kit style structure**

```
project/
  SPEC.md           # High-level specification
  requirements.md   # Detailed requirements
  tasks.md          # Task breakdown
  AGENTS.md         # Agent instructions
```

**Why:**

- Specs as source of truth
- Clear separation of concerns
- Human review points before implementation
- Standard pattern gaining industry adoption

### 9.4 For Claude Code Specifically

**Recommended: File-based persistence + CLAUDE.md**

1. Use `CLAUDE.md` for project-wide agent instructions
2. Create `TODO.md` or `plan.md` for task persistence
3. Reference these files in CLAUDE.md
4. Use `/clear` between distinct tasks
5. Consider ralph-wiggum for autonomous loops

### 9.5 General Best Practices

1. **Keep It Simple**: Start with plain markdown before adding tools
2. **Version Everything**: All task state should be in Git
3. **Design for Context**: Structure files for selective loading
4. **Human Checkpoints**: Build review points into workflows
5. **Document Workflows**: Codify team standards in AGENTS.md
6. **Token Awareness**: Consider token costs when designing formats

---

## 10. Comparison Matrix

| Approach            | Complexity | AI-Friendliness   | Dependencies | Version Control | Best For                   |
| ------------------- | ---------- | ----------------- | ------------ | --------------- | -------------------------- |
| Todo.txt            | Very Low   | High              | None         | Excellent       | Simple flat lists          |
| Markdown checklists | Low        | Very High         | None         | Excellent       | Most use cases             |
| TaskWarrior         | Medium     | Medium            | CLI tool     | Good            | Complex personal task mgmt |
| Org-mode            | High       | High (with tools) | Emacs        | Excellent       | Emacs users                |
| Backlog.md          | Medium     | Very High         | CLI tool     | Excellent       | Team projects              |
| Beads               | Medium     | Very High         | CLI tool     | Excellent       | Multi-agent coordination   |
| Spec-Kit            | Medium     | High              | None         | Excellent       | Spec-driven development    |
| llm-md              | Medium     | Very High         | CLI tool     | Excellent       | LLM workflow definition    |

---

## 11. Conclusion

File-based task management is not a step backward -- it's a strategic choice for AI-native development. The benefits are clear:

1. **Direct LLM Consumption**: No API translation, no format conversion
2. **Git Integration**: History, branching, collaboration for free
3. **Human-AI Parity**: Same artifacts, same tools, same workflows
4. **Zero Lock-in**: Plain text survives all tooling changes
5. **Context Control**: Selective loading respects token budgets

The trend in 2026 is toward treating specifications and task definitions as primary artifacts, with code as their expression. File-based systems align perfectly with this shift.

**For our use case (md-tldr project)**: A simple markdown-based approach with SPEC.md/TODO.md files, combined with CLAUDE.md for agent instructions, provides the best balance of simplicity and capability. Consider adopting Beads if multi-agent coordination becomes important.

---

## Sources

### Task Management Tools

- [Todo.txt](http://todotxt.org/)
- [TaskWarrior](https://taskwarrior.org/)
- [Backlog.md](https://github.com/MrLesk/Backlog.md)
- [Tasks.md](https://github.com/BaldissaraMatheus/Tasks.md)
- [tik](https://github.com/vvhg1/tik)
- [Beads](https://github.com/steveyegge/beads)

### AI Coding Tools

- [Claude Code CLAUDE.md](https://claude.com/blog/using-claude-md-files)
- [AGENTS.md Standard](https://agents.md/)
- [VS Code Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)

### Spec-Driven Development

- [GitHub Spec-Kit](https://github.com/github/spec-kit/blob/main/spec-driven.md)
- [Thoughtworks on SDD](https://www.thoughtworks.com/en-us/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)
- [Addy Osmani on Specs](https://addyosmani.com/blog/good-spec/)
- [Martin Fowler on SDD Tools](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)

### LLM Workflow Tools

- [llm-md](https://llm.md/)
- [gptel for Emacs](https://github.com/karthink/gptel)

### AI Workflow Articles

- [Addy Osmani's LLM Coding Workflow 2026](https://addyosmani.com/blog/ai-coding-workflow/)
- [Steve Yegge on Beads](https://steve-yegge.medium.com/introducing-beads-a-coding-agent-memory-system-637d7d92514a)
- [Nick Tune's Minimalist Task Workflow](https://medium.com/nick-tune-tech-strategy-blog/minimalist-claude-code-task-management-workflow-7b7bdcbc4cc1)

### Comparisons and Reviews

- [Windsurf vs Cursor](https://www.builder.io/blog/windsurf-vs-cursor)
- [AI Code Editor Comparison 2026](https://research.aimultiple.com/ai-code-editor/)
- [LLM Context Management Guide](https://eval.16x.engineer/blog/llm-context-management-guide)
