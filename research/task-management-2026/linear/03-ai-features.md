# Linear AI Features Analysis (2026)

## Executive Summary

Linear has positioned itself as a genuinely **AI-native** task management tool rather than having AI features bolted on as an afterthought. The platform treats AI agents as first-class team members with dedicated APIs, authentication flows, and workspace integration. This represents a fundamental architectural difference from competitors who have retrofitted AI capabilities onto traditional project management systems.

**Verdict**: Linear is truly AI-native, not AI bolt-on. The depth of agent integration, the Agent Interaction SDK, and the delegation model all point to AI being a core architectural consideration, not a feature layer.

---

## Native AI Features

### Triage Intelligence

Linear's flagship AI feature uses an **agentic approach** where models actively pull context from workspace data to make intelligent decisions.

**How it works**:

- Analyzes every issue entering triage against existing backlog data
- Uses GPT-5 and Gemini 2.5 Pro for complex reasoning
- Learns from how similar work was organized historically
- Runs in background with no manual trigger required

**Capabilities**:

- **Duplicate detection**: Automatically merges duplicate requests into existing issues
- **Related issue linking**: Surfaces connections between related work
- **Property suggestions**: Recommends teams, projects, assignees, and labels
- **Auto-apply options**: Configurable automation for trusted suggestion types

**Architecture**: The system uses a combination of search, ranking, and LLM-based reasoning. Smaller models proved insufficient, leading Linear to adopt an agentic architecture where larger models can request additional context as needed.

> "The limitation of smaller models led Linear to an agentic approach, where the model could pull in whatever additional context it needed from Linear's data."

### AI Workflows

Linear's AI assists with routine manual tasks across the product:

- Summarizing issues and projects
- Drafting updates
- Organizing work
- Managing routine triage operations

---

## The "AI as Teammate" Model

### Core Philosophy

Linear treats agents as **full workspace members**, not external tools:

- Agents appear in team rosters
- Can be @mentioned like human teammates
- Can be assigned to issues
- Can be added to projects
- Participate in comment threads
- Activity tracked in Insights analytics

### Delegation vs Assignment

Critical distinction in Linear's model:

> "Agents are not traditional assignees. Assigning an issue to an agent triggers delegation - the agent acts on the issue, but the human teammate remains responsible for its completion."

This **human accountability** model means:

- Humans maintain ownership while agents execute
- Clear visibility into what agents are doing
- Agents act on behalf of the responsible human
- No "orphaned" work where AI took over without oversight

### Agent Sessions

The core interaction model centers on **Agent Sessions**:

- Sessions track the lifecycle of agent tasks
- Created automatically on mention or delegation
- State visible to users in real-time
- Updated automatically based on agent activities
- No manual state management required

Agents communicate through **Agent Activities**:

- Thoughts (reasoning)
- Actions (what they're doing)
- Clarification prompts
- Final responses
- Error states

---

## Cursor Integration (@Cursor Assignment)

Linear has deep integration with Cursor, allowing issues to be assigned directly to Cursor's cloud agent.

### How It Works

1. **Trigger methods**:
   - Assign issue to @Cursor from assignee menu
   - Mention @Cursor in a comment
   - Create triage rules for automatic assignment

2. **Execution**:
   - Cursor cloud agent spins up automatically
   - Pulls full issue context (description, comments, linked references)
   - Works in context of the issue
   - Tracks progress directly in Linear, Cursor web app, or IDE

3. **Completion**:
   - Agent updates issue automatically with PR
   - Team can review diffs directly from Linear
   - Full audit trail maintained

### Capabilities

- Answer questions about codebase
- Fix bugs
- Implement features
- Take first pass on triage queue issues
- Open pull requests

### Automatic Triage Rules

Configure rules to auto-assign issues to Cursor based on:

- Labels
- Projects
- T-shirt size (e.g., "small or less")
- Team assignments

> "In this project, with this label, and t-shirt size small or less, let the agent handle it."

### Technical Integration

Linear built an **API specifically for agents**:

- "Agent session" concept provides full context to agents
- Structured webhooks with issue details, comments, references
- Bi-directional communication

**Requirements**: Cursor Pro or Ultra plan, admin installation

---

## GitHub Copilot Integration

Available in public preview since October 2025.

### How It Works

1. **Trigger**: Mention @GitHub or assign Copilot to a Linear issue
2. **Analysis**: Copilot captures entire issue description and comments as context
3. **Execution**: Works in ephemeral development environment (GitHub Actions powered)
4. **Output**: Opens draft pull request

### Capabilities

- Explore codebase
- Make code changes
- Run automated tests and linters
- Create pull requests
- Update Linear issue with progress

### Key Features

- Asynchronous, autonomous background agent
- Works independently without blocking developer
- Uses full issue context for implementation decisions
- Isolated cloud environment for safety

**Requirements**: Copilot Pro, Pro+, Business, or Enterprise; Linear team membership; org owner GitHub permissions

---

## OpenAI Codex Integration

Launched December 2025.

### Capabilities

- Answer questions about codebase
- Fix bugs
- Write features
- Propose pull requests for review
- Take first pass at triage queue issues

### How It Works

1. **Trigger**: Assign to Codex or @mention in comment
2. **Execution**: Codex creates cloud task, runs in sandbox with repo preloaded
3. **Communication**: Replies with progress and results
4. **Completion**: Typically 1-30 minutes depending on complexity

### Automatic Assignment

Via triage rules:

1. Navigate to Settings > Team > Workflow > Triage
2. Create rule: Delegate > Codex
3. New issues matching criteria auto-assigned

### Sandbox Capabilities

- Read and edit files
- Run commands
- Execute test harnesses
- Run linters and type checkers
- Real-time progress monitoring

**Requirements**: ChatGPT paid plan, GitHub account connection

---

## Other Agent Integrations

Linear's agent ecosystem includes specialized tools:

| Agent       | Capabilities                                                       |
| ----------- | ------------------------------------------------------------------ |
| **Devin**   | Scopes issues, drafts PRs, built-in Linear tool                    |
| **Sentry**  | Root cause analysis with Seer, diagnoses and fixes issues          |
| **ChatPRD** | Writes requirements, manages issues, provides feedback             |
| **Warp**    | Investigates bugs, suggests fixes, opens PRs                       |
| **Factory** | Codes, tests, creates pull requests in isolated cloud environments |

### Sentry Agent Details

- Runs Seer diagnostics directly from Linear issues
- Posts back insights without context switching
- OAuth-secured webhook communication
- Handles issue detail requests and fix operations

### Factory (Droids) Details

- Autonomous Droids work in isolated cloud environments
- Pull full context: descriptions, comments, linked tickets, dependencies
- End-to-end task completion

---

## Building Custom AI Agents

Linear provides a full developer platform for custom agents.

### Agent Interaction SDK

- TypeScript-based SDK
- Cloudflare-ready demo agent ("Weather Bot") as starting point
- No cost to develop agents
- Agents don't count as billable seats

### Authentication

Uses OAuth2 with special `actor=app` parameter:

- Creates dedicated user for the agent
- Token tied to specific scopes and teams
- Workspace admin controls installation

### Required Scopes

- Mention capability: separate scope
- Assignment capability: separate scope
- Team access: configurable per-team

### Agent Activity System

Agents emit structured activities to Linear:

- `thought`: Agent's reasoning
- `action`: Current execution step
- `prompt`: Clarification needed
- `response`: Final result
- `error`: Failure states

Linear renders appropriate UI automatically based on activity types.

### Distribution Options

1. **Private**: Internal workspace use only
2. **Public**: Submit to Linear's Integration Directory for community use

### Developer Resources

- Documentation: <https://linear.app/developers/agents>
- Agent Docs: <https://linear.app/docs/agents-in-linear>
- Agents Overview: <https://linear.app/agents>

---

## AI-Native Architecture Assessment

### Evidence of AI-Native Design

1. **Dedicated Agent APIs**: Not retrofitted - purpose-built for AI interaction
2. **Agent Sessions**: First-class concept in the data model
3. **Delegation model**: Architectural distinction from assignment
4. **Activity system**: Standardized agent-to-human communication
5. **Agent Authentication**: Separate OAuth flow (`actor=app`)
6. **No billable seats for agents**: Pricing model anticipates AI teammates
7. **Agentic Triage Intelligence**: Core feature, not add-on

### Comparison with Bolt-On Approaches

| Aspect           | AI-Native (Linear)             | AI Bolt-On (Typical)          |
| ---------------- | ------------------------------ | ----------------------------- |
| Agent identity   | First-class workspace member   | External integration          |
| Authentication   | Dedicated OAuth flow           | API key or user impersonation |
| State management | Automatic via sessions         | Manual tracking               |
| UI integration   | Native rendering               | Webhook comments              |
| Pricing          | Agents don't count             | Often per-seat                |
| Delegation model | Human accountability preserved | Full transfer or nothing      |

### Limitations

- **Not a general PM tool**: Built specifically for engineering/product teams
- **Customer conversation processing**: Requires bridging tools for support workflows
- **Not for compliance-heavy workflows**: Tools like Jira may be better for regulatory needs

---

## Future Direction

Linear has signaled continued AI investment:

> "Linear intends to move in the direction of more automation and decisions based on richer context. Triage Intelligence will improve as it draws on a deeper understanding of your workspace and as they adopt newer models and techniques."

Expected developments:

- More automation options with user control
- Richer context understanding
- Adoption of newer models and techniques
- Expanded agent capabilities

---

## Industry Context (2026)

Linear's approach aligns with broader industry trends:

- **40% of enterprise apps** will embed AI agents by end of 2026 (Gartner)
- **MCP adoption** surging for agent-to-tool communication
- **75% of API gateway vendors** expected to have MCP features by 2026
- Shift from chatbots to **autonomous agentic systems**

Linear appears well-positioned as this transition accelerates, having built agent-first architecture before the wave of retrofitting began.

---

## Sources

- [Linear AI Agents Documentation](https://linear.app/docs/agents-in-linear)
- [Linear for Agents](https://linear.app/agents)
- [Triage Intelligence Documentation](https://linear.app/docs/triage-intelligence)
- [How Linear Built Triage Intelligence](https://linear.app/now/how-we-built-triage-intelligence)
- [Cursor Integration](https://linear.app/integrations/cursor)
- [How Cursor Integrated with Linear for Agents](https://linear.app/now/how-cursor-integrated-with-linear-for-agents)
- [Bringing the Cursor Agent to Linear](https://cursor.com/blog/linear)
- [GitHub Copilot Integration](https://linear.app/integrations/github-copilot)
- [GitHub Copilot for Linear Documentation](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/integrate-coding-agent-with-linear)
- [OpenAI Codex Agent Changelog](https://linear.app/changelog/2025-12-04-openai-codex-agent)
- [Codex Linear Integration](https://developers.openai.com/codex/integrations/linear/)
- [Linear Agent Interaction SDK Approach](https://linear.app/now/our-approach-to-building-the-agent-interaction-sdk)
- [Linear Developer Documentation](https://linear.app/developers/agents)
- [Sentry Agent Integration](https://linear.app/integrations/sentry-agent)
- [Factory Integration](https://linear.app/integrations/factory)
- [Linear AI Overview (eesel.ai)](https://www.eesel.ai/blog/linear-ai)
- [Linear Reviews 2026 (G2)](https://www.g2.com/products/linear/reviews)
