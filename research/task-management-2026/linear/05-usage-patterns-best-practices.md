# Linear Usage Patterns and Best Practices

Research on real-world Linear usage patterns from blog posts, case studies, and community discussions.

## Table of Contents

1. [Quick Idea Capture Before Planning](#quick-idea-capture-before-planning)
2. [Triage Workflows](#triage-workflows)
3. [Solo Developer Workflows](#solo-developer-workflows)
4. [Team Workflows](#team-workflows)
5. [Common Mistakes and Anti-Patterns](#common-mistakes-and-anti-patterns)
6. [Templates and Starter Setups](#templates-and-starter-setups)
7. [Keyboard-First Productivity](#keyboard-first-productivity)
8. [Real-World Case Studies](#real-world-case-studies)

---

## Quick Idea Capture Before Planning

### The Problem Linear Solves

Unlike many native task management apps, Linear doesn't have a built-in quick-entry global hotkey. However, the tool's design philosophy prioritizes speed: **issues only require a title and status** - all other properties are optional. This makes rapid idea capture possible.

### Recommended Quick Capture Methods

#### 1. Raycast Integration (Recommended)

Descript's internal guide recommends using [Raycast](https://www.raycast.com/), a free system-wide command bar:

> "Install the Linear extension and bind the 'create issue for myself' action to a hotkey like Command+Space+Shift. This solves a key requirement of any task management system - a way to quickly capture an emergent issue so you're never left trying to store things in your brain."

#### 2. Slack to Linear Automation

Descript built a Zapier automation workflow:
1. New Slack message triggers the automation
2. ChatGPT summarizes the message into 12 words or less
3. Creates a Linear issue with the summary as title
4. Populates description with markdown link back to Slack

#### 3. Direct Keyboard Shortcut

Press `C` anywhere in Linear to create a new issue instantly.

### Quick Capture Best Practices

- **Capture first, organize later**: Don't worry about labels, assignees, or priorities during brain dump
- **Use Triage as your inbox**: Issues can sit in Triage until you're ready to process them
- **Set a daily triage routine**: Process your captured ideas at a scheduled time
- **Keep titles action-oriented**: Even in quick capture, write titles that describe what needs to happen

---

## Triage Workflows

### Understanding Triage in Linear

Triage is an optional status category that acts as an **inbox for your team**. It creates a separation between incoming work and your committed backlog.

### When Issues Land in Triage

Issues automatically go to Triage when:
- Created through integrations (Slack, Sentry, Zendesk)
- Created while inside the Triage view
- Created by workspace members not belonging to your specific team
- Submitted via in-app feedback widgets

### The Triage Workflow

```
[New Issue] -> [Triage Inbox] -> Decision Point
                                      |
                    +--------+--------+--------+--------+
                    |        |        |        |        |
                 Accept   Escalate  Merge   Decline   Snooze
                    |        |        |        |        |
                    v        v        v        v        v
               Backlog   Current   Existing  Closed  Later
                         Cycle     Issue
```

### Triage Intelligence (AI-Powered)

Linear's AI features automate triage assessment:
- Automatically flags duplicate requests
- Links related issues together
- Suggests properties like labels and assignees
- Routes issues to the appropriate team

### Triage Best Practices

1. **Daily review**: Someone should check Triage daily (or set a rotating responsibility)
2. **Use keyboard shortcuts**: `G` then `T` navigates to Triage view
3. **Process, don't park**: Every issue in Triage should move within 24-48 hours
4. **Decline with explanation**: When declining, always leave a comment explaining why
5. **Use snooze strategically**: For issues that aren't ready but shouldn't be lost

### Triage vs Backlog: When to Use Each

| Triage | Backlog |
|--------|---------|
| Unvetted, needs review | Accepted, ready to be worked |
| Source may be unclear | Properly scoped and assigned |
| May be duplicate or invalid | Validated and unique |
| Requires assessment | Prioritized for future work |

---

## Solo Developer Workflows

### Setting Up for Solo Work

> "If you're solo, just create one team (e.g., 'Development' or 'My Work')."

Solo developers benefit from Linear's structure without the overhead of team coordination.

### Recommended Solo Setup

1. **Single Team**: One team for all your work
2. **Label Groups for Life Areas**: Create labels for different contexts (e.g., "Side Project", "Learning", "Client Work")
3. **2-Week Cycles**: Short enough to stay focused, long enough to complete meaningful features
4. **Realistic Planning**: Target 80-90% completion rate per cycle

### Solo Developer Workflow Example

From a personal productivity case study:

**Planning Phase (Sprint Grooming)**:
- List all pending tasks
- Estimate time and priority for each
- If completion rates hover around 50-70%, reduce workload

**Execution Phase**:
- Plan next day's tasks the night before
- Review day's completion each morning
- Update issue statuses daily

**Review Phase**:
- Track completion rates at end of cycle
- Note emotional state during execution
- Identify improvements for next sprint

### Personal Productivity Tips

1. **Use "My Issues" view**: Press `G` then `M` to see all your assigned issues
2. **Keep "Scheduled" list tight**: No more than 3 high-priority items at a time
3. **Linear as second brain**: Use it to reduce cognitive load - if it's not in Linear, it doesn't exist
4. **Leverage MCP integration**: Use AI (Claude) to batch-create tasks from syllabi, notes, or requirements

### Managing Side Projects with Initiatives

Even solo, use Linear's hierarchy:
- **Initiatives**: Major life/work streams (e.g., "Client Work", "Products", "Learning")
- **Projects**: Specific deliverables under each initiative
- **Issues**: Individual tasks

---

## Team Workflows

### The Plum Approach

[Plum's engineering blog](https://build.plumhq.com/how-we-use-linear/) details their three-stage workflow:

#### Plan Stage
- Create quarterly roadmaps aligned with OKRs
- Projects listed for every key result
- One week before cycle starts, managers assign estimated projects

#### Work Stage

**For Managers:**
- Use cycle views during standups (filter by assignee)
- Log blocking issues in Linear for async notifications
- Mid-cycle: assess progress using cycle graph
- Maintain updated project and milestone due dates

**For Contributors:**
- Update issue statuses daily before standups
- Use GitHub integration for automatic PR status sync
- Append deliverables (Figma, GitHub PRs) to issues
- Keep due dates continuously updated

#### Review Stage
- Calculate team velocity from previous 3 cycles
- Identify missed milestones
- Evaluate progress toward quarterly objectives

### Cycle Planning Best Practices

> "The cycle is planned when each team member has an adequate number of estimated points assigned. Estimate points serve as a guideline to avoid overloading developers."

1. **Calculate bandwidth**: Team size x working days - carryover work
2. **Don't overload**: Cycles should feel reasonable
3. **Auto-rollover**: Let unfinished items move to next cycle automatically
4. **Include bug fixes**: All software has bugs - budget for them in every cycle

### Team Organization Principles

From The Linear Method:

1. **Clear ownership**: Every project and issue should have a single responsible owner
2. **Break down work**: Large tasks into smaller parts, ideally completable in a day or two
3. **Brevity in specs**: Short documents force clear scoping
4. **Designer-engineer collaboration**: Work together throughout, not in handoffs

### GitHub Integration Workflow

```
1. Copy git branch name from Linear (auto-moves issue to "In Progress")
2. Create branch with issue ID (e.g., eng-123-my-feature)
3. PR automatically links to Linear issue
4. PR merge automatically moves issue to "Done"
```

Configuration tip: Set workflow automations per team in team settings.

---

## Common Mistakes and Anti-Patterns

### Mistake 1: Over-Customization

> "Teams try to recreate Jira-level complexity with too many custom statuses, nested labels, or rigid workflows. Before long, people stop following the process altogether."

**What goes wrong:**
- Too many custom states (keep to 5-7 maximum)
- Excessive automation rules that become hard to maintain
- Too many teams and projects that fragment work
- Complex workflows that team members can't follow

**The fix:** Start with Linear's defaults. Only customize if a real pain point arises.

### Mistake 2: User Stories Instead of Issues

> "At Linear, they don't write user stories and think they're an anti-pattern in product development."

**What goes wrong:**
- Formulaic "As a user, I want to..." adds overhead without value
- Focus shifts from clear communication to format compliance

**The fix:** Write simple issues in plain language. Focus on what needs to be done, not on following a template.

### Mistake 3: Hoarding Everything in the Backlog

> "You don't need to save every feature request or piece of feedback indefinitely. Important ones will resurface, low priority ones will never get fixed."

**What goes wrong:**
- Backlog becomes a graveyard of forgotten ideas
- Planning sessions become overwhelming
- Team loses trust in the system

**The fix:**
- Archive issues untouched for 30+ days
- Schedule regular "Linear gardening" sessions
- Keep backlog focused on realistic work

### Mistake 4: Abandoning Cycles

> "Teams stop using cycles, letting issues pile up in the backlog or stay perpetually 'In Progress.' Planning becomes reactive. Velocity becomes meaningless."

**What goes wrong:**
- No rhythm or routine to work
- No way to measure progress
- Scope creep becomes unmanageable

**The fix:** Commit to a consistent cycle length and planning routine.

### Mistake 5: Misusing Estimates

**What goes wrong:**
- Equating story points with hours (1 SP = 4 hours)
- Using estimates for delivery date promises
- Judging performance by points completed

**The fix:**
- Use estimates for relative sizing only
- Consider issue count instead (with "split until small" rule)
- Focus estimates on understanding scope, not timelines

### Mistake 6: Misunderstanding Linear Concepts

> "Linear's concept of 'Project' is actually what you would call a Feature. Teams have tried to use Linear's Projects as features, as traditional Projects and as Epics, and neither way made sense."

**The fix:** Understand Linear's conceptual model:
- **Workspace**: Your company
- **Team**: A group working together (engineering, design, etc.)
- **Project**: A time-bound deliverable (like a feature launch)
- **Cycle**: A rhythm for work (like a sprint, but not tied to releases)
- **Issue**: An individual task

---

## Templates and Starter Setups

### Project Templates

Access via `G` `S` (Settings) -> Templates, or per-team settings.

**Workspace Templates:**
- Available to all teams
- Cannot preset team-specific properties
- Best for cross-team issue types

**Team Templates:**
- Only available within that team
- Full access to team labels and statuses
- Best for team-specific workflows (bugs, features, etc.)

### Form Templates

More structured than standard templates. Useful for:
- Bug reports requiring repro steps and environment details
- Security incidents capturing severity and timing
- IT/HR requests for equipment or onboarding

Form template fields can include:
- Text input, dropdowns, checkboxes
- Issue properties (priority, customer, label groups)
- Required field markers

### Starter Issue Templates

#### Bug Report Template
```markdown
## Description
[Brief description of the bug]

## Steps to Reproduce
1.
2.
3.

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Browser/App version:
- OS:
- Device:

## Screenshots/Videos
[Attach if available]
```

#### Feature Request Template
```markdown
## Problem Statement
[What problem does this solve?]

## Proposed Solution
[Brief description of the feature]

## Success Criteria
- [ ]
- [ ]

## Additional Context
[Any relevant background]
```

### Recommended Label Setup

Keep labels minimal and consistent:

```
Priority (built-in):
- Urgent
- High
- Medium
- Low

Type:
- Bug
- Feature
- Improvement
- Tech Debt

Area (team-specific):
- Frontend
- Backend
- Infrastructure
- Documentation
```

**Naming conventions:**
- Singular, not plural ("Bug" not "Bugs")
- Consistent capitalization ("Frontend" not "front-end")
- Don't replicate statuses as labels

### Starter Workflow Setup

**Default statuses (recommended to keep):**
1. Triage (optional but recommended)
2. Backlog
3. Todo
4. In Progress
5. In Review
6. Done
7. Canceled

**Cycle setup:**
- 2-week cycles are most common
- Set automatic start day (Monday recommended)
- Enable automatic rollover for incomplete items

---

## Keyboard-First Productivity

Linear is arguably the most keyboard-optimized project management tool. Mastering shortcuts dramatically improves efficiency.

### Essential Shortcuts

| Shortcut | Action |
|----------|--------|
| `?` | Show keyboard shortcuts help |
| `Cmd/Ctrl + K` | Command palette (context-sensitive) |
| `C` | Create new issue |
| `Option/Alt + C` | Create issue from template |

### Navigation

| Shortcut | Action |
|----------|--------|
| `G` then `M` | Go to My Issues |
| `G` then `T` | Go to Triage |
| `G` then `B` | Go to Backlog |
| `G` then `A` | Go to Active issues |
| `O` then `P` | Search projects |
| `O` then `T` | Switch teams |

### Issue Management

| Shortcut | Action |
|----------|--------|
| `A` | Assign to user |
| `L` | Add label |
| `P` | Set priority |
| `S` | Change status |
| `F` | Add filter |
| `E` | Archive notification |
| `Shift + H` | Snooze issue |
| `J` / `K` | Navigate up/down in list |

### Power User Tips

1. **Command-K is context-sensitive**: It shows commands relevant to what you're currently viewing
2. **Copy branch name**: Automatically assigns issue and moves to "In Progress"
3. **Learn navigation shortcuts first**: `G` + key combos are the foundation
4. **Use filters, then save views**: Build your personal dashboards with saved filtered views

---

## Real-World Case Studies

### Descript: Building a Work Operating System

Descript (all-in-one video editing platform) has used Linear since December 2020.

**Key practices:**
- Linear as "central work operating system" for EPD and business teams
- Heavy use of keyboard shortcuts
- Slack + ChatGPT automation for issue creation
- Raycast for global quick capture
- Triage status for initial assignment ("putting issues directly into Todo declares they'll be worked on this week")

### Plum: Structured Three-Stage Workflow

**Their setup:**
- Quarterly roadmaps aligned with OKRs
- 2-week cycles with bandwidth calculation
- Projects kept short (no more than 2 cycles)
- Issues broken into 2-day chunks maximum
- Daily status updates before standups
- Heavy use of async communication through Linear

**Key insight:**
> "When adequately put to use, the majority of communication will be async, freeing teams from the cycle of indefinitely updating people about the same thing."

### Creative Agency Use

Small design studios report:
- Linear feels "less bloated" than traditional tools
- Freelancers can be onboarded quickly
- Tags separate dev, design, content, and marketing work in one workspace

### Non-Traditional Uses

According to Linear staff, people use the tool for:
- TV productions
- Wedding planning
- House builds

This demonstrates the flexibility of the system beyond software development.

---

## Summary: Key Principles

### The Linear Method Core Ideas

1. **Momentum over perfection**: Find a cadence and routine; don't rush toward the end
2. **Clear ownership**: Single person responsible for every project and issue
3. **Brevity**: Short specs are more likely to be read
4. **Break down work**: Small tasks you can complete create visible progress
5. **Opinionated defaults**: Flexibility creates chaos; constraints create clarity

### Daily Habits for Success

1. **Morning**: Review "My Issues", update statuses before standup
2. **Throughout day**: Use keyboard shortcuts, avoid mouse when possible
3. **Evening**: Quick capture any lingering ideas, review tomorrow's priorities
4. **Weekly**: Triage processing, cycle planning, backlog grooming
5. **Quarterly**: Review workflows, simplify what isn't working, adjust structure

### When to Scale Complexity

Add structure only when its absence becomes painful:
- Start with defaults
- Customize only for real pain points
- Review and simplify every quarter
- What works for 5 people may not work for 15

---

## Sources

### Official Linear Resources
- [Linear Method: Principles & Practices](https://linear.app/method/introduction)
- [Linear Docs: Triage](https://linear.app/docs/triage)
- [Linear Docs: Issue Templates](https://linear.app/docs/issue-templates)
- [Linear Docs: GitHub Integration](https://linear.app/docs/github-integration)
- [Linear Docs: Estimates](https://linear.app/docs/estimates)
- [Linear Docs: Conceptual Model](https://linear.app/docs/conceptual-model)

### Case Studies and Blog Posts
- [Descript's Internal Guide for Using Linear](https://linear.app/now/descript-internal-guide-for-using-linear)
- [How Plum Uses Linear](https://build.plumhq.com/how-we-use-linear/)
- [How to Use Linear: Setup, Best Practices, and Hidden Features Guide (Morgen)](https://www.morgen.so/blog-posts/linear-project-management)
- [Why I Choose Linear as My Personal Project Management Tool (Jing Su)](https://www.jinghuangsu.com/writing/productivity/solo-project-management-with-linear)
- [How I Use Linear to Manage Projects at Lunch Pail Labs](https://lunchpaillabs.com/blog/managing-projects-at-lpl-with-linear)
- [Fast Growing Startups Are Built on Linear (Karri Saarinen)](https://medium.com/linear-app/fast-growing-startups-are-built-on-linear-74511bf96afb)
- [Building at the Early Stage (Karri Saarinen)](https://medium.com/linear-app/building-at-the-early-stage-e79e696341db)

### Guides and Reviews
- [Linear Task Management: Organize, Prioritize, and Deliver (Everhour)](https://everhour.com/blog/linear-task-management/)
- [Linear App Case Study: How to Build a $400M Issue Tracker (Eleken)](https://www.eleken.co/blog-posts/linear-app-case-study)
- [Mastering Linear: How to Optimize Your Team's Project Management Experience (OneHorizon)](https://onehorizon.ai/blog/linear-app-review)
- [The Linear Method: Opinionated Software (Figma Blog)](https://www.figma.com/blog/the-linear-method-opinionated-software/)
- [How Linear Builds Product (Lenny's Newsletter)](https://www.lennysnewsletter.com/p/how-linear-builds-product)

### Keyboard Shortcuts
- [Linear Keyboard Shortcuts (KeyCombiner)](https://keycombiner.com/collections/linear/)
- [Linear App Cheat Sheet (ShortcutFoo)](https://www.shortcutfoo.com/app/dojos/linear-app-mac/cheatsheet)
