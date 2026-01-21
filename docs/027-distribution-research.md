# Developer Tool Distribution Research for AI Coding Agents (2026)

Research conducted: January 2026

## Executive Summary

The landscape for distributing developer tools to AI coding agents has evolved dramatically. MCP (Model Context Protocol) has become an industry standard with massive adoption, but CLI tools remain the practical workhorse for most agents. The optimal strategy for mdcontext is **CLI-first with MCP as an enhancement layer**.

**Key Recommendation**: Focus on CLI distribution via npx/npm with an optional MCP server wrapper. This maximizes reach while minimizing maintenance burden.

---

## 1. MCP (Model Context Protocol)

### Current Adoption (2025-2026)

MCP has experienced explosive growth since Anthropic's November 2024 release:

- **97+ million monthly SDK downloads**
- **10,000+ active servers**
- First-class support across major platforms: ChatGPT, Claude, Cursor, Gemini, Microsoft Copilot, VS Code

**Major Milestones**:
- March 2025: OpenAI adopted MCP across Agents SDK, Responses API, and ChatGPT desktop
- April 2025: Google DeepMind confirmed MCP support in Gemini
- September 2025: GitHub MCP Registry launched for discovering MCP servers
- December 2025: MCP joined Linux Foundation's Agentic AI Foundation (AAIF)

### Which Agents Support MCP

| Agent | MCP Support | Notes |
|-------|-------------|-------|
| Claude Code | Full | Native support, `claude mcp add` command |
| Claude Desktop | Full | JSON configuration |
| ChatGPT Desktop | Full | Added March 2025 |
| Cursor | Full | Automatic mcp.json detection |
| VS Code (Copilot) | Full | Native integration |
| Gemini | Full | Added April 2025 |
| Aider | Partial | Via external MCP bridges |
| Cline | Full | Built-in MCP support |

### Pros of MCP

1. **Standardization**: One server works across all MCP-compatible clients
2. **Ecosystem**: GitHub MCP Registry for discovery
3. **Type Safety**: Structured tool definitions
4. **Developer Outcomes**: Can expose high-level operations rather than raw CLI mappings
5. **Authentication**: Built-in credential handling with remote MCP servers

### Cons of MCP

1. **Token Overhead**: Tool definitions consume significant context
   - GitHub's MCP server uses ~50,000 tokens for tool definitions alone
   - Initializing some servers consumes 5-10% of context window before work begins
2. **Security Concerns**: Tool names/descriptions become part of prompts and can change unexpectedly
3. **Debugging**: Less detailed error output compared to CLI (basic errors vs full stack traces)
4. **Maintenance**: Additional server to maintain alongside CLI
5. **Complexity**: Adds a layer between the agent and the tool

### Adding MCP to Claude Code

```bash
# HTTP transport (remote servers)
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Stdio transport (local servers like mdcontext could use)
claude mcp add --transport stdio mdcontext -- npx mdcontext-mcp
```

---

## 2. Direct CLI Integration

### How Agents Use CLI Tools

**Claude Code**:
- Built-in Bash tool executes commands directly
- Supports headless mode: `claude -p "your prompt" --json`
- Can define custom subagents with specific tool access
- Uses AGENTS.md files to discover project-specific CLI workflows

**Cursor**:
- Agent can "generate files, run terminal commands, search your codebase"
- MCP support via mcp.json but also direct shell execution
- Non-interactive mode built for CI/CD

**Aider**:
- Slash commands to run shell commands and feed output back to chat
- Scriptable via `aider --message "instruction"` or Python API
- Direct terminal integration is core to the experience

### The Agentic Loop

AI agents operate on a fundamental pattern: "just an LLM, a loop, and enough tokens." They:
1. Plan a task
2. Execute commands (often via CLI)
3. Read output
4. Iterate based on results

CLI tools fit naturally into this loop because:
- Predictable input/output format
- Clear exit codes for success/failure
- Composable with other Unix tools
- Detailed error messages for debugging

### AGENTS.md for Tool Discovery

AGENTS.md is emerging as a standard for helping agents discover project tools:
- Endorsed by OpenAI Codex, Amp, Jules (Google), Cursor, Factory
- Contains build steps, tests, and conventions
- Perfect place to document mdcontext usage

---

## 3. npm Global Install

### How It Works
```bash
npm install -g mdcontext
mdcontext index ./docs
```

### Friction Points

1. **Permission Issues**: Often requires `sudo` on Linux/Mac
2. **Version Conflicts**: Different projects may need different versions
3. **Node.js Requirement**: User must have Node.js installed
4. **Update Burden**: User must manually update
5. **System Pollution**: Adds to global namespace

### When It Works Well

- Teams standardizing on a specific version
- CI/CD environments with controlled setup
- Power users who want instant access
- Long-term tools used across many projects

---

## 4. npx (Zero-Install Execution)

### How It Works
```bash
npx mdcontext index ./docs
```

### Advantages

1. **Zero Installation**: Just run it
2. **Always Latest**: Downloads fresh each time (or uses cache)
3. **No Permissions**: No global install needed
4. **Clean System**: Nothing permanent installed
5. **Version Pinning**: `npx mdcontext@1.2.3` for specific versions

### Limitations

1. **Network Required**: Each invocation may need network access
2. **Startup Latency**: First run downloads the package
3. **Node.js Dependency**: Still requires Node.js runtime
4. **Cache Management**: `~/.npm/_npx/` can grow over time
5. **npm v7+ Changes**: Some workflows migrated to `npm exec`

### 2025 Ecosystem Notes

- Bun's `bunx` offers faster alternative to npx
- pnpm's `pnpx` also available
- npm 10 improvements in Node.js 22

### Best For

- One-off executions
- Trying out tools
- Scripts that need latest version
- CI/CD without pre-installation step

---

## 5. Homebrew / apt / Package Managers

### Homebrew Tap Maintenance

**Setup**:
1. Create GitHub repo (e.g., `your-org/homebrew-tap`)
2. Write formula file in Ruby
3. Users run: `brew tap your-org/tap && brew install mdcontext`

**Maintenance Burden**:
- Formula updates for each release
- Testing across macOS versions
- Handling dependencies
- Responding to Homebrew policy changes

### Homebrew 5.0 Changes (2026)

Major changes coming September 2026:
- Gatekeeper removal for unsigned apps
- Third-party taps become more important
- Code signing may be required for official core formulas

### apt/deb/rpm

**Considerations**:
- Each distro has different packaging requirements
- Need to maintain multiple package formats
- Updates lag behind npm releases
- Good for enterprise environments with package policies

### Worth It?

**For mdcontext**: Probably not initially
- Target audience (AI agents) already has Node.js
- npm/npx covers the primary use case
- Homebrew is worth adding later if demand emerges

---

## 6. Binary Releases (Single Binary Distribution)

### Advantages

1. **No Runtime Dependencies**: Just download and run
2. **Fast Startup**: No interpreter overhead
3. **Easier Distribution**: Single file to download
4. **Cross-Platform**: Build for Linux/Mac/Windows

### Implementation Options

**Go**:
- Fast compile times
- Excellent cross-compilation
- GoReleaser for automated releases to Homebrew, Scoop, deb/rpm
- "Single self-contained binaries and effortless cross-compiling are killer for ops-y tools"

**Rust**:
- Best performance
- Memory safety
- cargo-dist for distribution
- clap for excellent CLI parsing

### Tradeoffs for mdcontext

**Against Binary Rewrite**:
- mdcontext is already TypeScript
- Would require significant rewrite effort
- Target users have Node.js (they're developers)
- npm/npx works well for the use case

**For Binary (Future)**:
- If targeting non-Node environments
- If startup performance becomes critical
- If adoption grows beyond developer audience

---

## 7. MCP vs CLI: Which Should mdcontext Focus On?

### Direct Comparison

| Aspect | CLI | MCP |
|--------|-----|-----|
| Setup Friction | Low (npx just works) | Medium (add server config) |
| Agent Compatibility | Universal | Growing but not 100% |
| Token Overhead | None | Significant |
| Debugging | Excellent (full output) | Limited |
| Maintenance | Tool only | Tool + MCP server |
| Discovery | AGENTS.md, README | MCP Registry |
| Composability | Unix pipes, scripts | MCP-specific patterns |

### The Token Budget Reality

A critical insight from 2025: MCP servers can consume massive token budgets for tool definitions. GitHub's MCP server uses ~50,000 tokens just for definitions. For a tool like mdcontext with a few commands, the overhead may not be worth it compared to a simple CLI call.

### When MCP Adds Value

1. **Complex Multi-Tool Workflows**: When mdcontext is part of a larger toolchain
2. **Remote Server Mode**: If mdcontext offers hosted indexing
3. **Enterprise Deployments**: Standardized tool discovery
4. **Non-CLI Environments**: GUI apps, browser extensions

### When CLI is Better

1. **Simple Operations**: Index, search, query
2. **Scripting**: Compose with other tools
3. **Debugging**: Full output visibility
4. **Low Overhead**: No token cost for tool definitions

---

## 8. Concrete Recommendations for mdcontext

### Primary Distribution: npx (Zero-Install CLI)

```bash
# Primary usage pattern
npx mdcontext index ./docs
npx mdcontext search "authentication"
npx mdcontext summarize README.md
```

**Why**:
- Lowest friction for AI agents
- No installation step in AGENTS.md
- Always gets latest version
- Works immediately in any project

### Secondary: npm Global Install

```bash
npm install -g mdcontext
```

**Why**:
- For power users
- Faster repeated execution
- CI/CD environments

### Tertiary: MCP Server (Optional Enhancement)

```bash
# Published as separate package
npx mdcontext-mcp

# Or bundled as subcommand
npx mdcontext mcp-server
```

**Why**:
- Captures MCP ecosystem users
- Minimal maintenance (thin wrapper around CLI)
- Can expose higher-level operations

### NOT Recommended Initially

- **Homebrew tap**: Add later if demand emerges
- **Binary releases**: Requires rewrite, low ROI for current audience
- **apt/deb/rpm**: Too much maintenance overhead

---

## 9. Implementation Strategy

### Phase 1: CLI Excellence (Current)

1. Ensure `npx mdcontext` works flawlessly
2. Document usage in README with AI agent focus
3. Create example AGENTS.md snippet:
   ```markdown
   ## Documentation Tools
   Use `npx mdcontext search "query"` to search indexed documentation.
   Use `npx mdcontext context "query"` to get relevant context for a task.
   ```

### Phase 2: MCP Server (Optional)

If MCP adoption continues and users request it:

1. Create thin MCP wrapper: `mdcontext-mcp`
2. Expose 3-5 high-value operations (not 1:1 CLI mapping)
3. Register in GitHub MCP Registry
4. Document setup for Claude Code, Cursor

### Phase 3: Expanded Distribution (If Needed)

Based on user feedback:
- Homebrew tap if Mac users request it
- Consider binary builds if startup time is problematic

---

## 10. Key Takeaways

1. **CLI is the universal interface** - Every AI coding agent can execute commands
2. **npx minimizes friction** - No install step, always works
3. **MCP is valuable but not essential** - Token overhead and maintenance cost are real
4. **Start simple, expand based on demand** - Don't over-engineer distribution
5. **Document for AI agents** - AGENTS.md and clear CLI examples matter

### Final Answer to Key Questions

**Should mdcontext focus on MCP or CLI or both?**
> CLI first, MCP optional. The CLI is the stable foundation; MCP is a nice-to-have enhancement.

**What's the lowest-friction way for an AI agent to use the tool?**
> `npx mdcontext <command>` - zero installation, immediate execution, works everywhere.

**Is maintaining an MCP server worth it if CLI works fine?**
> Not initially. Add MCP only if: (1) users specifically request it, (2) you want presence in MCP registries, or (3) you need to expose operations that don't map well to CLI.

---

## Sources

- [Model Context Protocol - Wikipedia](https://en.wikipedia.org/wiki/Model_Context_Protocol)
- [The Model Context Protocol's impact on 2025 | Thoughtworks](https://www.thoughtworks.com/en-us/insights/blog/generative-ai/model-context-protocol-mcp-impact-2025)
- [A Year of MCP: From Internal Experiment to Industry Standard | Pento](https://www.pento.ai/blog/a-year-of-mcp-2025-review)
- [MCP joins the Agentic AI Foundation | Model Context Protocol Blog](http://blog.modelcontextprotocol.io/posts/2025-12-09-mcp-joins-agentic-ai-foundation/)
- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference)
- [Claude Code: Best practices for agentic coding | Anthropic](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Cursor Agent CLI](https://cursor.com/blog/cli)
- [Aider Documentation](https://aider.chat/docs/)
- [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp)
- [npm vs npx in Node.js: A 2025 Guide](https://www.geekboots.com/story/npm-vs-npx-in-nodejs-a-2025-guide-to-smarter-development)
- [How to Create and Maintain a Tap - Homebrew Documentation](https://docs.brew.sh/How-to-Create-and-Maintain-a-Tap)
- [Building Great CLIs in 2025: Node.js vs Go vs Rust](https://medium.com/@no-non-sense-guy/building-great-clis-in-2025-node-js-vs-go-vs-rust-e8e4bf7ee10e)
- [MCP vs CLI: Which Interface Do AI Agents Actually Prefer?](https://gist.github.com/szymdzum/c3acad9ea58f2982548ef3a9b2cdccce)
- [Why Top Engineers Are Ditching MCP Servers | FlowHunt](https://www.flowhunt.io/blog/why-top-engineers-are-ditching-mcp-servers/)
- [AI Coding Tools in 2025: Welcome to the Agentic CLI Era | The New Stack](https://thenewstack.io/ai-coding-tools-in-2025-welcome-to-the-agentic-cli-era/)
- [AGENTS.md](https://agents.md/)
- [Package Manager Design Tradeoffs | Andrew Nesbitt](https://nesbitt.io/2025/12/05/package-manager-tradeoffs.html)
