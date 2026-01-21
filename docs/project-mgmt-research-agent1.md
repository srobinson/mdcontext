# Project Management Tools Research for mdcontext (2026)

Research conducted: January 21, 2026

## Executive Summary

For a solo developer or small team working on an open-source CLI tool like mdcontext, **GitHub Issues + Labels combined with plain markdown files (ROADMAP.md, BACKLOG.md)** remains the optimal approach in 2026. This is precisely what mdcontext already uses, and the research validates this choice.

The key insight: the overhead of external tools (Linear, Notion) outweighs their benefits for solo/small projects where the code already lives on GitHub. However, GitHub Projects has matured significantly and may warrant adoption for visualization when the project grows.

---

## 1. GitHub Projects (2026 State)

### Recent Features (January 2026)

GitHub Projects received significant updates:

- **Hierarchy View** (January 15, 2026): View full issue hierarchy in table views, expand/collapse sub-issues up to 8 levels deep
- **Sub-issues GA**: Now generally available with 50 sub-issues per parent, 8 levels of nesting
- **Increased Item Limits**: Expanded from 1,200 to 50,000 items per project
- **Performance Improvements**: Focus on instant loading (under 200ms)
- **New View Menu**: Easier access to display options, REST API for creating views

Sources:
- [GitHub Changelog - Hierarchy View](https://github.blog/changelog/2026-01-15-hierarchy-view-now-available-in-github-projects/)
- [GitHub Changelog January 2026](https://github.blog/changelog/month/01-2026/)
- [GitHub Issues & Projects Evolution Discussion](https://github.com/orgs/community/discussions/154148)

### Strengths

| Feature | Benefit for Solo Dev |
|---------|---------------------|
| Native GitHub integration | Zero context switching |
| Free for all users | No cost barrier |
| Kanban + Table views | Visual progress tracking |
| Custom fields | Flexible categorization |
| Automation rules | Reduce manual work |
| Public visibility | Contributors can see roadmap |

### Limitations (Still Present in 2026)

1. **No workflow state machine**: Cannot enforce transitions (e.g., must visit QA before Done)
2. **Mixed field challenges**: Different issue types can't have different fields
3. **Limited advanced filtering**: Not as powerful as code search
4. **Sub-issues can't include PRs**: PRs can't be nested under issues
5. **Historical data analysis**: Archiving old items affects insights

### Verdict for mdcontext

**Consider adopting** when you need visual progress tracking for milestones or want to onboard contributors. Not essential for current solo phase.

---

## 2. Linear

### Overview

Linear is a fast, keyboard-driven project management tool designed for software teams. It's known for its polished UI and speed.

### Pricing (2026)

- **Free tier**: 250 issue limit
- **Standard**: $10/user/month
- **Plus**: $14/user/month

The 250-issue limit makes Linear impractical for most real projects. Once you exceed this, costs become significant.

Sources:
- [Linear Review 2026](https://efficient.app/apps/linear)
- [Linear Pricing](https://www.saasworthy.com/product/linear-app/pricing)

### Open Source Considerations

Linear is **not ideal for open source** because:
1. Free tier's 250-issue limit is restrictive
2. External contributors can't easily access your Linear board
3. Creates friction between where code lives (GitHub) and where work is tracked (Linear)
4. Per-user pricing doesn't align with open source contributor models

### GitHub Integration

Linear integrates with GitHub but:
- It's "straightforward issue tracking" with limitations in "GitHub integration depth"
- Requires syncing between two systems
- Contributors opening GitHub issues need them mirrored to Linear

### Verdict for mdcontext

**Not recommended.** The overhead of maintaining two systems (GitHub + Linear) and the free tier limitations make Linear unsuitable for a solo open-source project.

---

## 3. Notion

### Overview

Notion combines docs, wikis, and databases in a flexible workspace. Many teams use it for project management.

### Project Management Features (2026)

- Kanban boards, tables, calendars, Gantt charts
- Database relations and rollups
- Automation for repetitive tasks
- AI features for content generation and summarization
- Templates for sprint planning, bug tracking

Sources:
- [Notion Projects](https://www.notion.com/product/projects)
- [Notion Review 2026](https://www.linktly.com/productivity-software/notion-review/)
- [Notion for Software Project Management](https://shiftasia.com/column/notion-for-software-project-management-a-comprehensive-guide/)

### Pricing

- **Free**: Unlimited pages, limited blocks for teams
- **Plus**: $10/user/month
- **Business**: $15/user/month

### Downsides for Open Source

1. **Performance**: "Notion is very slow compared to many other apps"
2. **GitHub Integration**: Weaker than Linear, requires third-party tools
3. **Public Access**: Notion pages can be shared but lose interactivity
4. **Contributors**: External contributors can't easily participate in your project management
5. **Overhead**: Maintaining Notion + GitHub Issues = double work

### When Notion Makes Sense

- Internal documentation (not public-facing)
- Complex planning before development starts
- Teams with non-technical stakeholders

### Verdict for mdcontext

**Not recommended for project management.** Could be useful for private planning notes, but adds overhead without clear benefit for a public open-source project.

---

## 4. Plain Markdown Files

### The Approach

Use markdown files checked into the repository:
- `ROADMAP.md` - High-level phases and milestones
- `BACKLOG.md` - Ideas and improvements to revisit
- `CHANGELOG.md` - Release history
- `TODO.md` - Active work items (optional)

Sources:
- [TODO.md Format](https://github.com/todomd/todo.md)
- [Every Project Should Have a TODO.md](https://betterprogramming.pub/every-project-should-have-a-todo-md-file-20703bb6fd5f)
- [Roadmapping Best Practices](https://mozillascience.github.io/working-open-workshop/roadmapping/)

### Benefits

| Benefit | Why It Matters |
|---------|---------------|
| Zero overhead | No external tool to maintain |
| Version controlled | History of decisions tracked in git |
| Public by default | Contributors see the plan |
| AI-friendly | LLMs can read/update markdown directly |
| No lock-in | Standard format, portable |
| Works offline | No internet required |
| Searchable | grep, ripgrep, IDE search |

### Recommended Structure

```
docs/
  ROADMAP.md      # Phases, milestones, dependencies
  BACKLOG.md      # Ideas to revisit later
  PROJECT.md      # Vision, architecture, decisions
CHANGELOG.md      # Release notes (root)
README.md         # Entry point (root)
```

### Limitations

1. **No automation**: Manual status updates
2. **No visualization**: No burndown charts, kanban boards
3. **No assignments**: No built-in ownership tracking
4. **No notifications**: No deadline reminders

### mdcontext Already Does This

Your current setup (`docs/ROADMAP.md`, `docs/BACKLOG.md`, `docs/PROJECT.md`) is well-structured and follows best practices:
- Clear phase breakdown with deliverables
- Dependency visualization
- Progress tracking table
- Dated backlog items with context

### Verdict for mdcontext

**Strongly recommended to continue.** This is working and matches the solo developer context perfectly.

---

## 5. GitHub Issues + Labels

### Overview

GitHub Issues is the native issue tracking for GitHub repositories. Combined with labels, milestones, and templates, it can handle most project management needs.

Sources:
- [Best Practices for GitHub Issues](https://rewind.com/blog/best-practices-for-using-github-issues/)
- [GitHub Labels Best Practices](https://climbtheladder.com/10-github-labels-best-practices/)
- [Sane GitHub Labels](https://medium.com/@dave_lunny/sane-github-labels-c5d2e6004b63)
- [GitHub Projects for Solo Developers](https://www.bitovi.com/blog/github-projects-for-solo-developers)

### Best Practices for Labels

**Use prefixes and consistent colors:**

```
type:bug       (red)
type:feature   (blue)
type:docs      (purple)
type:chore     (gray)

priority:high  (red)
priority:med   (yellow)
priority:low   (green)

status:blocked     (red)
status:needs-info  (yellow)
status:ready       (green)

size:small    (light green)
size:medium   (medium green)
size:large    (dark green)
```

**Keep it minimal for solo projects:**
- Don't need status labels if using Projects
- Priority may be overkill when you're the only one deciding
- Type + Size often sufficient

### Milestones

"Milestones are buckets for your issues with a clock attached. Set regular deadlines (every two weeks) and pull in the issues you think you can complete within that time frame."

Benefits:
- Progress visualization (% complete)
- Deadline tracking
- Release planning

### Issue Templates

Create `.github/ISSUE_TEMPLATE/`:
- `bug_report.md`
- `feature_request.md`

Ensures contributors provide necessary information.

### When to Use Issues vs Markdown

| Use Issues For | Use Markdown For |
|---------------|------------------|
| Bugs from users | High-level roadmap |
| Feature requests | Architectural decisions |
| Specific tasks | Project vision |
| Contributor coordination | Backlog of ideas |
| Discussion threads | Documentation |

### Verdict for mdcontext

**Recommended as primary task tracking.** Use Issues for:
- Bugs and specific tasks
- External contributor coordination
- Work that benefits from discussion threads

Combine with markdown files for the big picture.

---

## 6. AI/Agent-Friendly Considerations

### 2026 State of AI in Project Management

AI agents are increasingly integrated into development workflows:

- **GitHub Agent HQ** (announced at Universe): Orchestrate AI agents for bug triage, documentation updates, security reviews
- **GitHub Copilot Agent Mode**: Independently translate ideas into code, handle infrastructure tasks
- **CCPM (Claude Code Project Management)**: Project management using GitHub Issues and Git worktrees for parallel agent execution
- **APM (Agentic Project Management)**: Framework for managing projects with AI assistants through multi-agent workflows

Sources:
- [GitHub Agent HQ](https://www.eficode.com/blog/why-github-agent-hq-matters-for-engineering-teams-in-2026)
- [CCPM on GitHub](https://github.com/automazeio/ccpm)
- [Agentic Project Management](https://github.com/sdi2200262/agentic-project-management)

### What Makes a Tool AI-Friendly?

| Factor | Best | Acceptable | Problematic |
|--------|------|------------|-------------|
| Format | Markdown, JSON | REST API | Proprietary UI only |
| Access | Local files, CLI | API with auth | OAuth flows |
| Structure | Predictable schema | Semi-structured | Unstructured |
| Updates | File writes, API calls | Web hooks | Manual only |

### Tool Rankings for AI Agents

1. **Plain Markdown** - Agents can read/write directly, no API needed
2. **GitHub Issues** - `gh` CLI makes read/write trivial
3. **GitHub Projects** - GraphQL API works but more complex
4. **Linear** - API available but requires authentication setup
5. **Notion** - API exists but complex, rate-limited

### mdcontext Implication

Since mdcontext is itself an AI-friendly tool, your project management should be equally AI-friendly:
- Markdown files: Perfect for AI agents
- GitHub Issues: Excellent via `gh` CLI
- This aligns with your users' expectations

---

## 7. Recommendation for mdcontext

### Current State (Optimal)

Your current setup is well-suited for the project's stage:

```
Markdown Files (docs/)
├── ROADMAP.md    # Phases, deliverables, dependencies
├── BACKLOG.md    # Ideas to revisit
├── PROJECT.md    # Vision, architecture
└── DESIGN.md     # Technical decisions

GitHub Issues
├── Bug reports
├── Feature requests
└── Specific implementation tasks
```

### Suggested Minimal Additions

1. **Add a few key labels** (if not already present):
   ```
   type:bug
   type:feature
   type:docs
   good-first-issue    (for contributors)
   help-wanted         (for contributors)
   ```

2. **Create Issue Templates**:
   - Bug report template
   - Feature request template

3. **Consider GitHub Milestones** for:
   - MVP release
   - v1.0 release
   - Each phase completion

### What NOT to Do

- Don't add Linear or Notion - overhead exceeds value
- Don't create GitHub Projects board yet - wait until you need visualization
- Don't over-label - keep it simple
- Don't duplicate information between Issues and markdown

### Scaling Strategy

When/if mdcontext grows:

| Trigger | Action |
|---------|--------|
| Regular contributors | Add GitHub Projects board |
| Release cadence established | Add milestones for versions |
| Complex feature planning | Use Issues for sub-tasks |
| Need for metrics | Consider GitHub Insights |

### Summary

**Keep your current approach.** It's aligned with 2026 best practices for solo/small open-source projects:

1. Markdown files for vision, roadmap, architecture (already doing this)
2. GitHub Issues for bugs and specific tasks
3. Labels for categorization (minimal set)
4. Skip external tools entirely

The "plain markdown + GitHub Issues" approach is:
- Zero-cost
- Zero-overhead
- AI-agent friendly
- Open-source friendly
- Well-documented in your project

---

## Open Source Alternatives Mentioned

If you ever need more than GitHub provides, consider these open-source options instead of SaaS:

| Tool | Description | Self-Hosted |
|------|-------------|-------------|
| [Plane](https://plane.so) | Modern, clean alternative to Jira/Linear | Yes |
| [OpenProject](https://www.openproject.org) | Full-featured, enterprise-ready | Yes |
| [Wekan](https://wekan.github.io) | Open-source Kanban | Yes |
| [Focalboard](https://www.focalboard.com) | Notion-like boards, part of Mattermost | Yes |

Sources:
- [Plane on GitHub](https://github.com/makeplane/plane)
- [Top Open Source Project Management Tools](https://www.nocobase.com/en/blog/github-open-source-project-management-tools)
- [Top 6 Open Source Project Management Software 2026](https://plane.so/blog/top-6-open-source-project-management-software-in-2026)

---

## Research Sources

### GitHub Projects
- [Hierarchy View Announcement](https://github.blog/changelog/2026-01-15-hierarchy-view-now-available-in-github-projects/)
- [GitHub Changelog January 2026](https://github.blog/changelog/month/01-2026/)
- [GitHub Issues & Projects Evolution](https://github.com/orgs/community/discussions/154148)
- [GitHub Projects Best Practices](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/best-practices-for-projects)
- [GitHub Projects for Solo Developers](https://www.bitovi.com/blog/github-projects-for-solo-developers)

### Linear
- [Linear Review 2026](https://efficient.app/apps/linear)
- [Linear Alternatives 2026](https://monday.com/blog/rnd/linear-alternatives/)
- [Linear vs Notion Comparison](https://everhour.com/blog/notion-vs-linear/)

### Notion
- [Notion Projects](https://www.notion.com/product/projects)
- [Notion Review 2026](https://www.linktly.com/productivity-software/notion-review/)
- [Notion vs GitHub Comparison](https://www.softwareadvice.com/project-management/github-profile/vs/notion/)

### Plain Markdown
- [TODO.md Format Specification](https://github.com/todomd/todo.md)
- [Every Project Should Have a TODO.md](https://betterprogramming.pub/every-project-should-have-a-todo-md-file-20703bb6fd5f)
- [Open Leadership Roadmapping](https://mozillascience.github.io/working-open-workshop/roadmapping/)

### GitHub Issues & Labels
- [Best Practices for GitHub Issues](https://rewind.com/blog/best-practices-for-using-github-issues/)
- [Sane GitHub Labels](https://medium.com/@dave_lunny/sane-github-labels-c5d2e6004b63)
- [GitHub Labels Best Practices](https://climbtheladder.com/10-github-labels-best-practices/)

### AI/Agents
- [GitHub Agent HQ 2026](https://www.eficode.com/blog/why-github-agent-hq-matters-for-engineering-teams-in-2026)
- [CCPM - Claude Code Project Management](https://github.com/automazeio/ccpm)
- [Agentic Project Management Framework](https://github.com/sdi2200262/agentic-project-management)

---

*Research conducted by Claude Opus 4.5 on January 21, 2026*
