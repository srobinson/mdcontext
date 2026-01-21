# Linear: Core Features and Workflow Research (2026)

## Overview

Linear is a modern issue tracking and project management tool designed for software development teams. Founded in 2019, it has positioned itself as a streamlined, opinionated alternative to tools like Jira and GitHub Issues. Linear emphasizes speed, simplicity, and a delightful user experience.

**Key Philosophy**: Linear takes an "Apple-like" approach - it assumes you want to ship fast and tells you how to work, rather than offering infinite customization.

---

## 1. Quick Ticket/Issue Capture

### Primary Methods for Creating Issues

#### Keyboard Shortcut (`C`)
The fastest way to create an issue in Linear is pressing `C` from anywhere in the app. This opens the issue creation modal immediately.

```
C           → Open issue creation modal
V           → Open full-screen issue creation
Option/Alt C → Create from template
```

#### Command Palette (`Cmd/Ctrl + K`)
Linear's command palette provides universal access to all actions:
- Press `Cmd/Ctrl + K` to open
- Type "create issue" or any action name
- Execute without navigating through menus

#### Quick Create URL
Navigate to `https://linear.new` in your browser to instantly create a new issue (must be logged in).

#### Pre-filled Issue URLs
Create issues with pre-populated fields using query parameters:
```
https://linear.new?title=Bug%20Report&priority=2&labelIds=abc123
```

Supported pre-fill fields: title, description, status, priority, assignee, estimate, cycle, labels, project, milestone, link attachments.

### Issue Requirements

**Minimum Required**:
- Title
- Status (auto-assigned to team default)
- Team assignment

**Optional Properties**:
- Assignee
- Priority (None, Low, Medium, High, Urgent)
- Estimate (points)
- Labels
- Due date
- Cycle assignment
- Project assignment
- Description (Markdown supported)

### Quick Capture Workarounds

Linear lacks a native global system hotkey for quick capture. Power users work around this with:

**Raycast Integration** (macOS):
1. Install Raycast (free "Spotlight on Steroids")
2. Add the Linear extension
3. Bind "create issue for myself" to a custom hotkey (e.g., `Cmd+Shift+Space`)

### Draft Preservation
- Navigating away from issue creation saves a temporary local draft
- Press `Esc` to save a persistent draft for later
- Highlighting text before pressing `C` auto-fills the issue title

---

## 2. Inbox, Triage, and Backlog

Linear has three distinct concepts for managing incoming work, each serving a different purpose:

### Personal Inbox (Notifications)

**Purpose**: Your personal notification center for activity on issues you're involved with.

**Navigation**: `G` then `I` (Go to Inbox)

**What Appears Here**:
- Updates on issues you created
- Updates on issues assigned to you
- Mentions in descriptions or comments
- Status changes on subscribed issues
- Reactions to your comments

**Inbox Management Shortcuts**:
```
G, I                → Go to Inbox
J / K               → Navigate up/down through notifications
U                   → Mark as read/unread
Option/Alt U        → Mark all as read/unread
Backspace           → Delete notification
Shift + Backspace   → Delete all notifications
Cmd/Ctrl D          → Delete all read notifications
H                   → Snooze notification
Cmd/Ctrl F          → Search inbox (by title, ID, type, assignee)
```

**Limits**: Linear retains up to 500 notifications in your inbox.

**Notification Channels**:
- In-app Inbox (always)
- Desktop/mobile push notifications
- Email digests
- Slack personal notifications (via Linear app in Slack)

### Team Triage (Shared Inbox)

**Purpose**: A team-level staging area for reviewing new incoming issues before accepting them into the workflow.

**Navigation**: `G` then `T` (Go to Triage)

**What Enters Triage**:
- Issues created through integrations (Slack, Sentry, Zendesk, etc.)
- Issues created by workspace members outside your specific team
- Issues created directly in the Triage view
- Issues routed via Linear Asks

**Triage Actions**:
```
1       → Accept (move to team's default status)
2 / MM  → Mark as Duplicate (merge into existing issue)
3       → Decline (cancel with optional explanation)
H       → Snooze (hide until specified time or new activity)
```

**Accept**: Approves the issue and moves it to your team's default status (typically Backlog or Todo). Option to add a comment.

**Mark as Duplicate**: Merges into an existing issue. Attachments, customer requests, and linked items transfer to the canonical issue. The duplicate is marked Canceled.

**Decline**: Rejects the issue, marks it Canceled. Option to add an explanation comment.

**Snooze**: Temporarily hides the issue from triage. Returns at:
- A specified date/time
- When new activity occurs on the issue

#### Triage Intelligence (AI-Powered)

Available on Business and Enterprise plans. Triage Intelligence uses LLMs to:

- Analyze new issues against existing backlog
- Suggest properties (assignee, labels, priority)
- Detect likely duplicates
- Surface related issues
- Provide brief explanations for suggestions

The AI draws on historical behavior patterns in your workspace to make contextual recommendations.

#### Triage Rules (Enterprise)

Custom automation rules for issues entering Triage:
- Trigger on filterable properties
- Auto-update team, status, assignee, label, project, or priority
- Execute in configured order (top to bottom)

#### Triage Best Practices

1. **Daily review routine**: Review triage inbox daily
2. **Rotate responsibility**: Share triage duty among team members
3. **Use templates**: Standardize intake with form templates
4. **Connect scheduling tools**: Integrate with PagerDuty, OpsGenie, Rootly, or Incident.io for automated rotations

### Backlog (Accepted Work)

**Purpose**: Holds accepted issues that are waiting to be prioritized and worked on.

**Navigation**: `G` then `B` (Go to Backlog)

**Characteristics**:
- Default destination for newly created or accepted issues
- Organized by priority rather than urgency
- Not time-bound (unlike Cycles)
- Teams can have multiple backlog statuses (e.g., "Icebox", "Backlog")

**Flow Summary**:
```
External Input → Triage → Backlog → Todo → In Progress → Done
                   ↓
              (Declined)
                   ↓
               Canceled
```

---

## 3. Linear Asks (Slack/Email Intake)

Linear Asks transforms workplace requests from Slack and email into actionable Linear issues.

### How It Works with Slack

**Request Creation Methods**:
1. React with the ticket emoji to any Slack message
2. Use `/asks` slash command
3. Mention `@Linear Asks` in messages
4. Create private Asks via Direct Messages
5. Auto-create through configured channels

**Key Features**:
- Non-Linear users can submit requests (Business/Enterprise plans)
- Synced comment thread between Slack and Linear
- Real-time status updates delivered to original Slack channel
- Works in shared Slack Connect channels

### Templates and Configuration

- Create channel-specific templates with custom fields
- Set required fields to standardize every request
- Pre-populate issue properties automatically
- All Asks route to team's Triage for review

### Email Intake

- Forward custom email addresses to unique Linear intake addresses
- Email subject becomes issue title
- Email body becomes description
- Attachments supported (25 MB limit)

**Availability**: Business and Enterprise plans. Advanced features on Enterprise.

---

## 4. Issue States and Workflow Customization

### Status Categories

Linear organizes workflows into five default categories that cannot be reordered:

1. **Backlog** - Unstarted work waiting to be prioritized
2. **Todo** (Unstarted) - Work ready to begin
3. **In Progress** (Started) - Active work
4. **Done** (Completed) - Finished work
5. **Canceled** - Rejected or abandoned work

Additionally:
- **Triage** - Optional inbox category for review before acceptance

### Default Workflow

```
Backlog → Todo → In Progress → Done
                              ↘ Canceled
```

### Customizing Statuses

**Access**: Settings → Teams → Issue statuses & automations

**What You Can Customize**:
- Add new statuses within any category (click `+` button)
- Edit status names, colors, and descriptions
- Reorder statuses within a category (drag and drop)
- Remove statuses (minimum one per category required)
- Set default status for new issues

**What You Cannot Customize**:
- Category order (Backlog → Todo → In Progress → Done → Canceled is fixed)
- Category names

### Example Custom Workflow (Linear's Product Team)

```
Backlog:      Icebox, Backlog
Unstarted:    Todo
Started:      In Progress, In Review, Ready to Merge
Completed:    Done
Canceled:     Canceled, Could not reproduce, Won't Fix, Duplicate
```

### Status Automations

**Auto-Close**: Automatically closes issues inactive for a specified period
- Marks as Canceled status type
- Publishes history item to Activity feed
- Notifies subscribers
- Won't auto-close issues in active cycles/projects

**Auto-Archive**: Archives issues that have been closed for several months
- Archives happen automatically (no manual option)
- Configurable time period in Team Settings
- Creator notified when archived (opportunity to unarchive)
- Archived issues remain searchable and restorable
- Extends to completed Cycles and Projects

**Default Settings**: Auto-close and auto-archive are enabled by default for new teams.

### Duplicate Handling

Marked duplicates automatically receive Canceled status. You can customize to use alternatives like "Duplicate" status.

---

## 5. Priority System

### Priority Levels

Linear offers five priority levels:

| Priority | Shortcut | Use Case |
|----------|----------|----------|
| Urgent | `P` then `1` | Immediate attention required |
| High | `P` then `2` | Important, schedule soon |
| Medium | `P` then `3` | Normal priority |
| Low | `P` then `4` | Nice to have |
| No Priority | `P` then `0` | Unset/unspecified |

**Note**: Linear intentionally does not allow custom priorities. "Adding too many options makes it harder to set priority and leads to diminishing returns."

### Micro-Adjusting Priority Order

On any view ordered by priority:
1. Drag and drop issues to reorder within the same priority level
2. Position is saved globally across your workspace
3. All team members see the same relative positions

---

## 6. Estimation System

### Available Scales

Teams can choose from four estimation scales:

| Scale | Values | Extended |
|-------|--------|----------|
| Exponential | 1, 2, 4, 8, 16 | 32, 64 |
| Fibonacci | 1, 2, 3, 5, 8 | 13, 21 |
| Linear | 1, 2, 3, 4, 5 | 6, 7 |
| T-Shirt | XS, S, M, L, XL | XXL, XXXL |

T-Shirt sizes convert to Fibonacci values for numerical calculations.

### Configuration

**Access**: Team Settings → General → Estimates

**Options**:
- Enable/disable estimates per team
- Extended scales (adds two higher values)
- Allow zero estimates
- Default handling for unestimated issues (default: 1 point)

**Keyboard Shortcut**: `Shift + E` to add/edit estimates

### Best Practice

"Larger estimates usually mean that there is uncertainty about the issue's complexity. We find that breaking up issues into smaller ones is the best approach."

---

## 7. Labels and Organization

### Label Scope

- **Workspace labels**: Accessible to all teams (e.g., "Bug", "Feature")
- **Team labels**: Scoped to specific teams only

### Label Groups

- Provide organizational nesting
- Maximum 250 labels per group
- Labels within groups are NOT multi-selectable (only one label per group can be applied)

### Creating Labels

**Three Methods**:
1. Settings → Workspace → Labels (or Team → Labels)
2. During label application: type new name, auto-saves
3. Syntax shortcut: `group/label` or `group:label` (e.g., "Type/Bug" creates both)

**Keyboard Shortcut**: `L` to add/edit labels

### Label Descriptions

Add descriptions in label settings. They:
- Appear on hover over applied labels
- Help maintain consistent usage
- Inform Triage Intelligence suggestions

### Reserved Label Names

Cannot use: assignee, cycle, effort, estimate, hours, priority, project, state, status

### Managing Labels

- Merge duplicate labels
- Archive labels (keeps on existing issues, prevents future use)
- Delete labels (irreversible, removes from all issues)
- Move between workspace and team levels

---

## 8. Cycles (Time-Boxed Sprints)

### Overview

Cycles are Linear's equivalent to sprints - fixed-duration time periods for completing work.

**Navigation**: `G` then `C` (Go to Cycles) or `G` then `V` (current cycle)

### Configuration

**Enable**: Team Settings → Cycles → Enable cycles

**Duration Options**: 1-8 weeks (fixed intervals, cannot vary)

**Schedule**: Set start day of week; cycles auto-generate on schedule

### Key Features

- **Automatic rollover**: Incomplete issues roll to next cycle automatically
- **Cooldown periods**: Optional breaks between cycles for tech debt/planning
- **Upcoming cycles**: Pre-create up to 15 future cycles
- **Auto-add**: Automatically assign started issues lacking cycle assignment

### Capacity Planning

The capacity dial estimates completion likelihood based on:
- Team's velocity from previous three completed cycles
- Measured by issues or estimate points completed

### Cycles vs. Projects

| Aspect | Cycles | Projects |
|--------|--------|----------|
| Time-bound | Yes (fixed duration) | Yes (but flexible) |
| Thematic | No | Yes |
| Auto-recur | Yes | No |
| Cross-team | No | Yes |
| Releases | Not tied | Can be tied |

---

## 9. Projects and Roadmaps

### Projects

**Purpose**: Time-bound deliverables like launching a new feature.

**Characteristics**:
- Can span multiple teams
- Contains milestones (meaningful completion stages)
- Has its own status (Backlog, Planned, In Progress, Completed, Canceled)
- Can have priority, labels, and lead assignee

### Milestones

Represent meaningful completion stages within a project. Enable progress tracking at granular level.

### Roadmaps

**Purpose**: High-level overview of projects for alignment with long-term goals.

- Group projects into roadmap sections
- Define goals and milestones
- Provide visibility into active, planned, and completed initiatives
- Visual timeline view

### Initiatives

Manually curated collections of projects that showcase company goals. Enable executive-level planning across extended timelines.

### Hierarchy

```
Workspace
├── Team 1
│   ├── Issues (in Backlog, Cycles, or Projects)
│   ├── Cycles
│   ├── Projects
│   │   └── Milestones
│   └── Issue Views
├── Team 2
└── Project Views & Initiatives (workspace-level)
```

---

## 10. Complete Keyboard Shortcuts Reference

### Navigation

| Shortcut | Action |
|----------|--------|
| `G, I` | Go to Inbox |
| `G, M` | Go to My Issues |
| `G, A` | Go to Active Issues |
| `G, B` | Go to Backlog |
| `G, D` | Go to Board |
| `G, C` | Go to Cycles |
| `G, V` | Go to current cycle (View) |
| `G, P` | Go to Projects |
| `G, T` | Go to Triage |
| `G, S` | Go to Settings |
| `/` | Open search |
| `?` | Show keyboard shortcuts help |

### Issue Actions

| Shortcut | Action |
|----------|--------|
| `C` | Create new issue |
| `V` | Create issue (full screen) |
| `Option/Alt C` | Create from template |
| `E` | Edit issue |
| `A` | Assign to user |
| `I` | Assign to me |
| `L` | Add/edit label |
| `S` | Change status |
| `P` | Change priority |
| `Shift + E` | Set estimate |
| `Cmd/Ctrl D` | Set due date |
| `#` | Archive issue |
| `Backspace` | Delete (in list) |

### Issue Relations

| Shortcut | Action |
|----------|--------|
| `M, B` | Mark as blocked |
| `M, X` | Mark as blocking |
| `M, R` | Reference related issue |
| `M, M` (or `2` in triage) | Mark as duplicate |

### Selection and Navigation

| Shortcut | Action |
|----------|--------|
| `X` | Select item in list |
| `Shift + Click` | Select multiple items |
| `Shift + Up/Down` | Extend selection |
| `Esc` | Clear selection / Go back |
| `J / K` | Move down/up |
| `Arrow keys` | Navigate |
| `Enter` or `O` | Open focused item |
| `Space` (hold) | Peek into issue |

### Command Palette

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl K` | Open command menu |
| `Cmd/Ctrl .` | Copy issue ID |
| `Cmd/Ctrl Shift .` | Copy git branch name |
| `Cmd/Ctrl Shift O` | Create sub-issue |
| `Cmd/Ctrl M` | Comment on issue |

### Filtering

| Shortcut | Action |
|----------|--------|
| `F` | Open filter menu |
| `Shift + F` | Clear last filter |
| `Option/Alt Shift F` | Clear all filters |

### Editor Formatting

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl B` | Bold |
| `Cmd/Ctrl I` | Italic |
| `Cmd/Ctrl U` | Underline |
| `Cmd/Ctrl Shift \` | Code block |
| `Cmd/Ctrl Shift 7` | Numbered list |
| `Cmd/Ctrl Shift 8` | Bulleted list |
| `Cmd/Ctrl Shift 9` | Todo list |
| `Cmd/Ctrl Z` | Undo |
| `Cmd/Ctrl Shift Z` | Redo |

### Triage Specific

| Shortcut | Action |
|----------|--------|
| `1` | Accept issue |
| `2` | Mark as duplicate |
| `3` | Decline issue |
| `H` | Snooze issue |

### Inbox Specific

| Shortcut | Action |
|----------|--------|
| `U` | Mark read/unread |
| `Option/Alt U` | Mark all read/unread |
| `Backspace` | Delete notification |
| `Shift + Backspace` | Delete all notifications |
| `Cmd/Ctrl D` | Delete all read |
| `H` | Snooze notification |
| `Shift + S` | Unsubscribe from issue |

---

## 11. Linear vs. Jira vs. GitHub Issues: Philosophy

### Linear's Philosophy

**"Opinionated Software"**: Linear is purpose-built for helping teams build better products. Unlike general-purpose tools, it guides you toward a default process.

Core beliefs:
1. **Purpose-built software** - Flexible software lets everyone invent their own workflows, creating chaos at scale
2. **Simple terminology** - Don't invent terms; projects should be called projects
3. **Tasks over user stories** - Write short, simple issues in plain language; user stories are considered an anti-pattern
4. **Work in cycles** - Maintain healthy momentum, not rushing toward the end
5. **Designer-engineer collaboration** - Best creators have talent for both

**Speed as Feature**: Linear loads approximately 2x faster than Jira. Every interaction is optimized for keyboard-first workflow.

### Jira's Philosophy

**"Customizable Workflow Engine"**: Jira offers extreme flexibility for every team to configure their own process.

Characteristics:
- Highly customizable workflows, fields, issue types
- Complex hierarchies and dependencies
- Extensive reporting and dashboards
- 3,000+ integrations via Atlassian Marketplace
- Native integration with Bitbucket, Confluence
- Designed for enterprise (1000+ employees)

**Target**: Enterprise engineering teams using traditional Scrum/Agile methodologies.

### GitHub Issues Philosophy

**"Code-Centric Project Management"**: Keep everything inside the development environment.

Characteristics:
- Tightly tied to code repositories
- Lightweight agility (not ideal for SCRUM ceremonies)
- Tag-based organization with project boards
- GitHub Actions for automation
- Best for teams that "live in code"

### Comparison Summary

| Aspect | Linear | Jira | GitHub Issues |
|--------|--------|------|---------------|
| Philosophy | Opinionated, fast | Flexible, comprehensive | Code-centric, lightweight |
| Setup Time | Minutes | Hours to days | Minutes |
| Learning Curve | Low | High | Low |
| Customization | Limited by design | Extensive | Moderate |
| Speed | Very fast | Slower | Fast |
| Best For | Startups, product teams | Enterprise, complex projects | Dev teams in GitHub |
| Integration Count | 200+ | 3,000+ | GitHub ecosystem |
| Pricing Model | Per-user | Per-user | Included with GitHub |

### When to Choose Each

**Choose Linear if**:
- You want speed and minimal setup
- You prefer opinionated defaults over configuration
- Your team is small to medium-sized
- You value clean, modern UI
- You want to reduce decision fatigue

**Choose Jira if**:
- You need custom workflows and hierarchies
- You have complex reporting requirements
- You're in a large enterprise environment
- You need extensive third-party integrations
- You use other Atlassian products

**Choose GitHub Issues if**:
- Your team lives in GitHub
- You prefer minimal tooling
- You want everything in one place
- You have simple project management needs

---

## 12. Best Practices Summary

### Issue Capture
1. Use `C` for rapid issue creation
2. Set up Raycast/Alfred for global hotkey access
3. Leverage Linear Asks for non-technical team members
4. Use templates for standardized intake

### Triage Management
1. Review triage inbox daily
2. Rotate triage responsibility among team
3. Use Triage Intelligence suggestions (Business/Enterprise)
4. Set up triage rules for automation (Enterprise)

### Backlog Health
1. Keep backlog clean and prioritized
2. Enable auto-close for stale issues
3. Enable auto-archive for completed work
4. Break large issues into smaller ones

### Workflow Customization
1. Start with Linear's defaults
2. Only customize when pain points arise
3. Keep statuses minimal and meaningful
4. Use consistent label naming conventions

### Keyboard-First Workflow
1. Learn navigation shortcuts (`G` + letter)
2. Use command palette (`Cmd/Ctrl K`) for discovery
3. Master issue actions (`C`, `S`, `P`, `L`, `A`)
4. Use peek (`Space` hold) for quick preview

---

## Sources

- [Linear Triage Documentation](https://linear.app/docs/triage)
- [Linear Issue Status Configuration](https://linear.app/docs/configuring-workflows)
- [Linear Conceptual Model](https://linear.app/docs/conceptual-model)
- [Linear Cycles Documentation](https://linear.app/docs/use-cycles)
- [Linear Creating Issues](https://linear.app/docs/creating-issues)
- [Linear Inbox Documentation](https://linear.app/docs/inbox)
- [Linear Asks Documentation](https://linear.app/docs/linear-asks)
- [Linear Estimates Documentation](https://linear.app/docs/estimates)
- [Linear Labels Documentation](https://linear.app/docs/labels)
- [Linear Priority Documentation](https://linear.app/docs/priority)
- [Linear Method Principles](https://linear.app/method/introduction)
- [Linear Keyboard Shortcuts - KeyCombiner](https://keycombiner.com/collections/linear/)
- [Linear vs Jira 2026 Guide - Everhour](https://everhour.com/blog/linear-vs-jira/)
- [Linear vs Jira Comparison - Nuclino](https://www.nuclino.com/solutions/linear-vs-jira)
- [Linear Review 2026 - Work Management](https://work-management.org/software-development/linear-review/)
- [How to Use Linear - Morgen](https://www.morgen.so/blog-posts/linear-project-management)
- [The Linear Method: Opinionated Software - Figma Blog](https://www.figma.com/blog/the-linear-method-opinionated-software/)
- [Linear: Designing for Developers - Sequoia Capital](https://sequoiacap.com/article/linear-spotlight/)
