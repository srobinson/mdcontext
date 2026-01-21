# mdcontext

**Give LLMs exactly the markdown they need. Nothing more.**

```
QUICK REFERENCE
  mdcontext index [path]           Index markdown files (add --embed for semantic search)
  mdcontext search <query> [path]  Search by meaning or structure
  mdcontext context <files...>     Get LLM-ready summary
  mdcontext tree [path|file]       Show files or document outline
  mdcontext links <file>           Outgoing links
  mdcontext backlinks <file>       Incoming links
  mdcontext stats [path]           Index statistics
```

---

## Why?

Your documentation is 50K tokens of markdown. LLM context windows are limited. Raw markdown dumps waste tokens on structure, headers, and noise.

mdcontext extracts *structure* instead of dumping *text*. The result: **80%+ fewer tokens** while preserving everything needed to understand your docs.

```bash
npm install -g mdcontext
mdcontext index .                     # Index your docs
mdcontext search "authentication"     # Find by meaning
mdcontext context README.md           # Get LLM-ready summary
```

---

## Installation

```bash
npm install -g mdcontext
```

Requires Node.js 18+. Semantic search requires `OPENAI_API_KEY`.

---

## Commands

### index

Index markdown files. Run this first.

```bash
mdcontext index                       # Index current directory (prompts for semantic)
mdcontext index ./docs                # Index specific path
mdcontext index --embed               # Also build embeddings for semantic search
mdcontext index --no-embed            # Skip the semantic search prompt
mdcontext index --watch               # Watch for changes
mdcontext index --force               # Force full rebuild
```

### search

Search by meaning (semantic) or keyword (text match).

```bash
mdcontext search "how to authenticate"        # Semantic search (if embeddings exist)
mdcontext search -k "auth.*flow"              # Keyword search (text match)
mdcontext search -n 5 "setup"                 # Limit to 5 results
mdcontext search --threshold 0.8 "deploy"     # Higher similarity threshold
```

#### Context Lines

Show surrounding lines around matches (like grep):

```bash
mdcontext search "checkpoint" -C 3            # 3 lines before AND after each match
mdcontext search "error" -B 2 -A 5            # 2 lines before, 5 lines after
```

Auto-detection: Uses semantic search if embeddings exist and query looks like natural language. Use `-k` to force keyword search.

### context

Get LLM-ready summaries from one or more files.

```bash
mdcontext context README.md                   # Single file
mdcontext context README.md docs/api.md       # Multiple files
mdcontext context docs/*.md                   # Glob patterns work
mdcontext context -t 500 README.md            # Token budget
mdcontext context --brief README.md           # Minimal output
mdcontext context --full README.md            # Include full content
```

#### Section Filtering

Extract specific sections instead of entire files:

```bash
mdcontext context doc.md --sections           # List available sections
mdcontext context doc.md --section "Setup"    # Extract by section name
mdcontext context doc.md --section "2.1"      # Extract by section number
mdcontext context doc.md --section "API*"     # Glob pattern matching
mdcontext context doc.md --section "Config" --shallow  # Top-level only (no nested subsections)
```

The `--sections` flag shows all sections with their numbers and token counts, helping you target exactly what you need.

### tree

Show file structure or document outline.

```bash
mdcontext tree                        # List markdown files in current directory
mdcontext tree ./docs                 # List files in specific directory
mdcontext tree README.md              # Show document outline (heading hierarchy)
```

Auto-detection: Directory shows file list, file shows document outline.

### links / backlinks

Analyze link relationships.

```bash
mdcontext links README.md             # What does this file link to?
mdcontext backlinks docs/api.md       # What files link to this?
```

### stats

Show index statistics.

```bash
mdcontext stats                       # Current directory
mdcontext stats ./docs                # Specific path
```

---

## Workflows

### Before Adding Context to LLM

```bash
mdcontext tree docs/                          # See what's available
mdcontext tree docs/api.md                    # Check document structure
mdcontext context -t 500 docs/api.md          # Get summary within token budget
```

### Finding Documentation

```bash
mdcontext search "authentication"             # By meaning
mdcontext search -k "Setup|Install"           # By keyword pattern
```

### Setting Up Semantic Search

```bash
export OPENAI_API_KEY=sk-...
mdcontext index --embed                       # Build embeddings
mdcontext search "how to deploy"              # Now works semantically
```

---

## MCP Integration

For Claude Desktop, add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mdcontext": {
      "command": "mdcontext-mcp",
      "args": []
    }
  }
}
```

For Claude Code, add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "mdcontext": {
      "command": "mdcontext-mcp",
      "args": []
    }
  }
}
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `md_search` | Semantic search across indexed docs |
| `md_context` | Get LLM-ready summary for a file |
| `md_structure` | Get document outline |

---

## Configuration

### Index Location

Indexes are stored in `.mdcontext/` in your project root:

```
.mdcontext/
  indexes/
    documents.json    # Document metadata
    sections.json     # Section index
    links.json        # Link graph
    vectors.bin       # Embeddings (if enabled)
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Required for semantic search |

---

## Performance

| Metric | Raw Markdown | mdcontext | Savings |
|--------|--------------|---------|---------|
| Context for single doc | 2,500 tokens | 400 tokens | **84%** |
| Context for 10 docs | 25,000 tokens | 4,000 tokens | **84%** |
| Search latency | N/A | <100ms | - |

---

## License

MIT
