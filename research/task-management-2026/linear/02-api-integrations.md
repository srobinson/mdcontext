# Linear API and Integrations for AI/Automation Workflows (2026)

## Overview

Linear provides a comprehensive GraphQL API that powers both their internal applications and external integrations. The API supports full CRUD operations on all entities, real-time webhooks, and multiple authentication methods. Linear has also embraced the AI ecosystem with an official MCP server for Claude integration.

**API Endpoint**: `https://api.linear.app/graphql`

---

## GraphQL API Capabilities

### Authentication Methods

**1. Personal API Keys**
- Create at `https://linear.app/settings/api`
- Best for personal scripts and local development

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: <API_KEY>" \
  --data '{ "query": "{ issues { nodes { id title } } }" }' \
  https://api.linear.app/graphql
```

**2. OAuth 2.0**
- Recommended for applications used by others
- Supports dynamic client registration for MCP servers

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  --data '{ "query": "{ issues { nodes { id title } } }" }' \
  https://api.linear.app/graphql
```

### Query Operations (Read)

**Get Current User**
```graphql
query Me {
  viewer {
    id
    name
    email
  }
}
```

**Fetch All Teams**
```graphql
query Teams {
  teams {
    nodes {
      id
      name
    }
  }
}
```

**Get Team Issues**
```graphql
query Team {
  team(id: "9cfb482a-81e3-4154-b5b9-2c805e70a02d") {
    id
    name
    issues {
      nodes {
        id
        title
        description
        assignee {
          id
          name
        }
        createdAt
        archivedAt
      }
    }
  }
}
```

**Get Single Issue by Identifier**
```graphql
query Issue {
  issue(id: "BLA-123") {
    id
    title
    description
  }
}
```

**Issues Assigned to User**
```graphql
query {
  user(id: "USERID") {
    id
    name
    assignedIssues {
      nodes {
        id
        title
      }
    }
  }
}
```

**Workflow States**
```graphql
query {
  workflowStates {
    nodes {
      id
      name
    }
  }
}
```

### Mutation Operations (Create/Update)

**Create Issue**
```graphql
mutation IssueCreate {
  issueCreate(
    input: {
      title: "New exception"
      description: "More detailed error report in markdown"
      teamId: "9cfb482a-81e3-4154-b5b9-2c805e70a02d"
    }
  ) {
    success
    issue {
      id
      title
    }
  }
}
```

**Create Issue with All Common Fields**
```graphql
mutation IssueCreate {
  issueCreate(
    input: {
      title: "Bug: Login fails on mobile"
      description: "Users report login button unresponsive on iOS Safari"
      teamId: "YOUR_TEAM_ID"
      priority: 2
      labelIds: ["label-id-1", "label-id-2"]
      assigneeId: "assignee-user-id"
      estimate: 3
      projectId: "project-id"
      stateId: "workflow-state-id"
    }
  ) {
    success
    issue {
      id
      title
      identifier
      priority
      priorityLabel
    }
  }
}
```

**Priority Values**:
- 0: No priority
- 1: Urgent
- 2: High
- 3: Medium
- 4: Low

**Estimate Values** (T-shirt sizes):
- 1: XS
- 2: S
- 3: M
- 5: L
- 8: XL
- 13: XXL
- 21: XXXL

**Update Issue**
```graphql
mutation IssueUpdate {
  issueUpdate(
    id: "BLA-123",
    input: {
      title: "New Issue Title"
      stateId: "NEW-STATE-ID"
    }
  ) {
    success
    issue {
      id
      title
      state {
        id
        name
      }
    }
  }
}
```

### Pagination

Linear uses Relay-style cursor-based pagination with `first`/`after` and `last`/`before` arguments.

**Basic Pagination**
```graphql
query Issues {
  issues(first: 10) {
    edges {
      node {
        id
        title
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**Subsequent Page Request**
```graphql
query Issues {
  issues(first: 10, after: "CURSOR_FROM_PREVIOUS_RESPONSE") {
    edges {
      node {
        id
        title
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**Simplified Node Syntax** (without edges)
```graphql
query Teams {
  teams {
    nodes {
      id
      name
    }
  }
}
```

**Ordering Results**
```graphql
query Issues {
  issues(orderBy: updatedAt) {
    nodes {
      id
      identifier
      title
      createdAt
      updatedAt
    }
  }
}
```

**Default Behavior**:
- 50 results returned by default
- Results ordered by `createdAt`
- Archived resources hidden by default (use `includeArchived: true` to include)

### Rate Limiting

Linear uses complexity-based rate limiting with a leaky bucket algorithm.

| Authentication Type | Requests/Hour | Complexity Points/Hour |
|---------------------|---------------|------------------------|
| API Key             | 1,500         | 250,000                |
| OAuth App           | 500           | 200,000                |
| Unauthenticated     | 60            | 10,000                 |

**Best Practices**:
- Use webhooks instead of polling
- Specify explicit `first`/`last` limits to reduce complexity
- Filter in GraphQL queries, not in code
- Avoid fetching data you do not need

---

## Bulk Issue Creation

Linear does not have a dedicated bulk mutation endpoint. Use GraphQL aliases to batch multiple mutations in a single request.

**Batch Create Issues**
```graphql
mutation BulkCreate {
  issue1: issueCreate(input: {
    title: "Issue 1"
    teamId: "TEAM_ID"
    priority: 2
  }) {
    success
    issue { id identifier title }
  }
  issue2: issueCreate(input: {
    title: "Issue 2"
    teamId: "TEAM_ID"
    priority: 3
  }) {
    success
    issue { id identifier title }
  }
  issue3: issueCreate(input: {
    title: "Issue 3"
    teamId: "TEAM_ID"
    priority: 3
  }) {
    success
    issue { id identifier title }
  }
}
```

**Important**: GraphQL mutations execute in series (not parallel), so large batches may hit timeouts or rate limits. Recommended approach for high-volume operations:

```typescript
import { LinearClient } from '@linear/sdk';

const client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

async function bulkCreateIssues(issues: Array<{title: string, description?: string}>, teamId: string) {
  const results = [];

  for (const issue of issues) {
    const result = await client.createIssue({
      title: issue.title,
      description: issue.description,
      teamId,
    });
    results.push(result);

    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}
```

---

## TypeScript SDK

### Installation

```bash
npm install @linear/sdk
```

### Authentication

```typescript
import { LinearClient } from '@linear/sdk';

// API Key authentication
const client = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY
});

// OAuth authentication
const oauthClient = new LinearClient({
  accessToken: process.env.LINEAR_OAUTH_TOKEN
});
```

### Getting Current User

```typescript
import { LinearClient, LinearFetch, User } from "@linear/sdk";

const linearClient = new LinearClient({ apiKey });

async function getCurrentUser(): LinearFetch<User> {
  return linearClient.viewer;
}
```

### Querying Issues

```typescript
async function getMyIssues() {
  const me = await linearClient.viewer;
  const myIssues = await me.assignedIssues();

  if (myIssues.nodes.length) {
    myIssues.nodes.map(issue =>
      console.log(`${me.displayName} has issue: ${issue.title}`)
    );
  } else {
    console.log(`${me.displayName} has no issues`);
  }
}

getMyIssues();
```

### Promise-Based Alternative

```typescript
linearClient.viewer.then(me => {
  return me.assignedIssues().then(myIssues => {
    if (myIssues.nodes.length) {
      myIssues.nodes.map(issue =>
        console.log(`${me.displayName} has issue: ${issue.title}`)
      );
    } else {
      console.log(`${me.displayName} has no issues`);
    }
  });
});
```

### Raw GraphQL Access

```typescript
import { LinearGraphQLClient } from '@linear/sdk';

const graphQLClient = new LinearGraphQLClient(apiKey);

const response = await graphQLClient.rawRequest(`
  query {
    issues(first: 10) {
      nodes {
        id
        title
      }
    }
  }
`);
```

### Custom Headers

```typescript
const client = new LinearClient({
  apiKey,
  headers: { "my-header": "value" }
});
```

---

## MCP Servers for Claude Integration

### Official Linear MCP Server

Linear provides an officially supported MCP server for AI integration.

**Transport Options**:
- HTTP (Streamable): `https://mcp.linear.app/mcp` (recommended)
- SSE: `https://mcp.linear.app/sse`

**Claude Code Setup**:
```bash
claude mcp add --transport http linear-server https://mcp.linear.app/mcp
```

Then run `/mcp` in Claude Code to authenticate.

**Available Tools**:
- Search and find issues, projects, and comments
- Create new issues
- Update existing issues
- Add comments to issues
- More functionality planned

**Authentication**:
- OAuth 2.1 with dynamic client registration (interactive flow)
- Direct API key/OAuth token via `Authorization: Bearer <token>` header

**Claude Desktop Configuration** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.linear.app/mcp"]
    }
  }
}
```

**Troubleshooting**:
- Clear cached auth: `rm -rf ~/.mcp-auth`
- WSL users: Use `--transport sse-only` flag

### Community MCP Server (jerhadf/linear-mcp-server)

**Note**: Deprecated in favor of official Linear MCP server.

**Installation**:
```bash
npx @smithery/cli install linear-mcp-server --client claude
```

**Manual Configuration**:
```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "linear-mcp-server"],
      "env": {"LINEAR_API_KEY": "your_key_here"}
    }
  }
}
```

**Available Tools**:
1. **Issue Creation** - Create issues with title, team ID, description, priority (0-4), status
2. **Issue Updates** - Modify issues via ID (title, description, priority, status)
3. **Issue Searching** - Filter by query, team, status, assignee, labels, priority
4. **User Issue Retrieval** - Fetch assigned tasks
5. **Comment Addition** - Add markdown comments to issues

---

## Webhooks and Automation Triggers

### Supported Events

**Data Change Webhooks**:
- Issues, Issue attachments, Issue comments, Issue labels
- Comment reactions
- Projects, Project updates
- Documents
- Initiatives, Initiative Updates
- Cycles
- Customers, Customer Requests
- Users
- Issue SLA
- OAuthApp revoked

### Configuration

Webhooks require admin permissions. Configure via:
- Linear Settings: `https://linear.app/settings/api`
- GraphQL API mutations

**Create Webhook via GraphQL**:
```graphql
mutation {
  webhookCreate(input: {
    url: "https://your-server.com/webhook"
    teamId: "team-id"
    resourceTypes: ["Issue", "Comment"]
  }) {
    success
    webhook {
      id
      secret
    }
  }
}
```

### Payload Structure

**HTTP Headers**:
- `Linear-Delivery`: UUID identifying the payload
- `Linear-Event`: Entity type (Issue, Comment, etc.)
- `Linear-Signature`: HMAC-SHA256 signature
- `User-Agent`: `Linear-Webhook`

**Body Fields**:
```json
{
  "action": "create | update | remove",
  "type": "Issue",
  "actor": { "id": "user-id", "name": "User Name" },
  "createdAt": "2026-01-21T10:00:00.000Z",
  "data": { /* serialized entity */ },
  "url": "https://linear.app/team/issue/BLA-123",
  "updatedFrom": { /* previous values for updates */ },
  "webhookTimestamp": 1705831200000,
  "webhookId": "webhook-id"
}
```

### Security Verification

```typescript
const crypto = require("node:crypto");
const { createHmac } = require('node:crypto');

// Verify signature
const signature = createHmac("sha256", WEBHOOK_SECRET)
  .update(rawBody)
  .digest("hex");

if (signature !== request.headers.get('linear-signature')) {
  return new Response(null, { status: 400 });
}

// Check timestamp (prevent replay attacks)
if (Math.abs(Date.now() - payload.webhookTimestamp) > 60000) {
  return new Response(null, { status: 401 });
}

return new Response(null, { status: 200 });
```

**IP Allowlist** (for firewall rules):
- 35.231.147.226
- 35.243.134.228
- (and 4 additional IPs - check Linear docs for current list)

### Retry Behavior

- Endpoint must return HTTP 200 within 5 seconds
- Failed deliveries retry up to 3 times: 1 minute, 1 hour, 6 hours
- Unresponsive webhooks may be auto-disabled

---

## CLI Tools

### schpet/linear-cli (Recommended)

Interactive CLI for managing Linear issues from the terminal.

**Installation**:
```bash
# Homebrew
brew install schpet/tap/linear

# Deno
deno install -A --reload -f -g -n linear jsr:@schpet/linear-cli
```

**Setup**:
```bash
export LINEAR_API_KEY="your-api-key"
linear config  # Creates .linear.toml in repo
```

**Key Commands**:
```bash
# View issue details
linear issue view BLA-123

# List your issues
linear issue list

# Start working on issue (creates branch, marks as started)
linear issue start BLA-123

# Create GitHub PR with issue details
linear issue pr

# List and add comments
linear comment list BLA-123
linear comment add BLA-123 "Your comment here"
```

**Features**:
- Works with Git and Jujutsu (jj) VCS
- Includes Claude Code skill for AI assistance
- Auto-detects current issue from branch name

### Linearis (by Carlo Zottmann)

CLI optimized for LLM agents with JSON output.

**Key Features**:
- JSON output for structured data
- Smart ID resolution
- Optimized GraphQL queries
- Designed for agent integration

### linear-cli (Rust)

Fast CLI built with Rust (released January 2026).

**Features**:
- Full API coverage (projects, issues, labels, teams, users, cycles, comments, documents)
- Git integration for branch checkout and PR linking
- Jujutsu (jj) first-class support
- Interactive TUI mode

---

## Integration Platforms (2026)

### n8n

Open-source workflow automation with deep Linear integration.

**Linear Triggers**:
- Issue Created/Updated/Deleted
- Comment Added
- Project Updated

**Linear Actions**:
- Create/Update/Delete Issues
- Add Comments
- Update Issue Status
- Assign Issues

**Example n8n Workflow** (webhook to Linear):
```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "github-issue",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Linear",
      "type": "n8n-nodes-base.linear",
      "parameters": {
        "operation": "create",
        "teamId": "={{ $env.LINEAR_TEAM_ID }}",
        "title": "={{ $json.issue.title }}",
        "description": "={{ $json.issue.body }}"
      }
    }
  ]
}
```

### Zapier

8,000+ app integrations with simple trigger-action model.

**Linear Triggers**:
- New Issue
- Issue Updated
- New Comment

**Linear Actions**:
- Create Issue
- Update Issue
- Create Comment

### Make (formerly Integromat)

Visual workflow builder with branching logic.

**Linear Module**:
- ~2,400 integrations
- Deeper actions per integration than Zapier
- Cost-effective for high-volume workflows

---

## Best Practices for AI/Automation Workflows

### 1. Use Webhooks, Not Polling
```typescript
// DO NOT do this
setInterval(async () => {
  const issues = await client.issues();
  // Process issues...
}, 60000);

// DO use webhooks
app.post('/linear-webhook', (req, res) => {
  const { action, data } = req.body;
  // React to changes in real-time
  res.status(200).send();
});
```

### 2. Implement Proper Error Handling
```typescript
import { parseLinearError } from '@linear/sdk';

try {
  const issue = await client.createIssue({ title, teamId });
} catch (error) {
  const linearError = parseLinearError(error);
  if (linearError?.type === 'RATELIMITED') {
    // Back off and retry
    await sleep(60000);
  }
}
```

### 3. Cache Team and State IDs
```typescript
// Fetch once at startup
const teams = await client.teams();
const teamMap = new Map(teams.nodes.map(t => [t.name, t.id]));

const states = await client.workflowStates();
const stateMap = new Map(states.nodes.map(s => [s.name, s.id]));

// Use cached IDs
const todoStateId = stateMap.get('Todo');
```

### 4. Use Filtering in Queries
```graphql
# Instead of fetching all issues and filtering
query {
  issues(filter: {
    state: { name: { eq: "In Progress" } }
    assignee: { id: { eq: "user-id" } }
  }) {
    nodes {
      id
      title
    }
  }
}
```

---

## API Explorer

Explore the Linear GraphQL API interactively:
- **Apollo Studio**: [https://studio.apollographql.com/public/Linear-API](https://studio.apollographql.com/public/Linear-API)
- **Linear Developers**: [https://linear.app/developers](https://linear.app/developers)

---

## Sources

- [Linear Developers Portal](https://linear.app/developers)
- [Linear GraphQL Getting Started](https://linear.app/developers/graphql)
- [Linear API and Webhooks Documentation](https://linear.app/docs/api-and-webhooks)
- [Linear MCP Server Documentation](https://linear.app/docs/mcp)
- [Linear TypeScript SDK on npm](https://www.npmjs.com/package/@linear/sdk)
- [Linear Pagination Documentation](https://linear.app/developers/pagination)
- [Linear Rate Limiting Documentation](https://linear.app/developers/rate-limiting)
- [Linear Webhooks Documentation](https://linear.app/developers/webhooks)
- [schpet/linear-cli on GitHub](https://github.com/schpet/linear-cli)
- [jerhadf/linear-mcp-server on GitHub](https://github.com/jerhadf/linear-mcp-server)
- [n8n Linear Integration](https://n8n.io/integrations/linear/)
- [Claude Code Remote MCP Support](https://claude.com/blog/claude-code-remote-mcp)
