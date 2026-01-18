# md-tldr: Markdown Analysis for LLMs

**Give LLMs exactly the markdown they need. Nothing more.**

```bash
# One-liner: Install, index, search
npm install -g md-tldr && mdtldr index . && mdtldr semantic -q "what you're looking for"
```

Your documentation is 50K tokens of markdown. LLM context windows are limited. Raw markdown dumps waste tokens on structure, headers, and noise.

md-tldr extracts *structure* instead of dumping *text*. The result: **80%+ fewer tokens** while preserving everything needed to understand your docs.

```bash
npm install -g md-tldr
mdtldr index .                     # Index your docs
mdtldr context -f README.md        # Get LLM-ready summary
```

---

## How It Works

md-tldr builds multiple analysis layers from your markdown:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Semantic        → "Find docs about authentication" │
│ Layer 3: Summarization   → "TLDR this in 100 tokens"        │
│ Layer 2: Link Graph      → "What links to this file?"       │
│ Layer 1: Structure       → "What sections exist?"           │
└─────────────────────────────────────────────────────────────┘
```

**Why layers?** Different tasks need different depth:
- Browsing docs? Layer 1 (structure) is enough
- Finding related content? Layer 2 (link graph) shows connections
- Searching by topic? Layer 4 (semantic) finds by meaning

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      YOUR MARKDOWN                               │
│  docs/*.md, README.md, CHANGELOG.md                              │
└───────────────────────────┬──────────────────────────────────────┘
                            │ remark + unified
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                     STRUCTURAL ANALYSIS                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                 │
│  │ Sections│→│  Links  │→│ Summary │→│Semantic │                 │
│  │  (AST)  │ │  Graph  │ │  Engine │ │  Index  │                 │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                 │
└───────────────────────────┬──────────────────────────────────────┘
                            │ text-embedding-3-small
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                      VECTOR INDEX                                │
│  Section embeddings in hnswlib → "find auth docs"                │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                      LLM-READY OUTPUT                            │
│  Token-efficient summaries • Hierarchical structure • Links      │
└──────────────────────────────────────────────────────────────────┘
```

---

## The Workflow

### Before Reading Docs
```bash
mdtldr tree docs/                  # See file structure
mdtldr structure -f docs/api.md   # See document outline
```

### Before Adding Context
```bash
mdtldr context -f docs/setup.md              # LLM-ready summary
mdtldr context -f docs/setup.md -t 200       # Budget: 200 tokens
mdtldr assemble -s "a.md,b.md" -b 1000       # Multi-doc context
```

### Finding Related Content
```bash
mdtldr links -f docs/api.md       # Outgoing links
mdtldr backlinks -f docs/api.md   # Incoming links
```

### Searching
```bash
mdtldr search --heading "Setup"              # By heading pattern
mdtldr search --has-code                     # Sections with code
mdtldr semantic -q "authentication flow"     # By meaning
```

---

## Quick Setup

### 1. Install

```bash
npm install -g md-tldr
```

### 2. Index Your Docs

```bash
mdtldr index /path/to/docs
```

This builds section indexes and link graphs. Takes seconds for typical projects.

### 3. Add Embeddings (Optional)

```bash
export OPENAI_API_KEY=sk-...
mdtldr embed /path/to/docs
```

This enables semantic search using OpenAI embeddings.

### 4. Start Using

```bash
mdtldr context -f README.md        # Get LLM-ready context
mdtldr semantic -q "how to deploy" # Find by meaning
```

---

## Command Reference

### Exploration
| Command | What It Does |
|---------|--------------|
| `mdtldr tree [dir]` | File tree of markdown files |
| `mdtldr structure -f <file>` | Document outline (heading hierarchy) |
| `mdtldr parse -f <file>` | Full parsed JSON output |
| `mdtldr stats` | Index statistics |

### Analysis
| Command | What It Does |
|---------|--------------|
| `mdtldr context -f <file>` | LLM-ready summary |
| `mdtldr context -f <file> -t 500` | With token budget |
| `mdtldr summarize -f <file>` | Hierarchical summary |
| `mdtldr summarize -f <file> --level brief` | Brief (100 tokens) |

### Multi-Document
| Command | What It Does |
|---------|--------------|
| `mdtldr assemble -s "a.md,b.md" -b 2000` | Assemble context from multiple files |
| `mdtldr links -f <file>` | Outgoing links |
| `mdtldr backlinks -f <file>` | Incoming links |

### Indexing
| Command | What It Does |
|---------|--------------|
| `mdtldr index [dir]` | Build/update indexes |
| `mdtldr index --watch` | Watch for changes |
| `mdtldr index --force` | Force full rebuild |
| `mdtldr embed` | Build embedding index |

### Search
| Command | What It Does |
|---------|--------------|
| `mdtldr search --heading "pattern"` | Find by heading regex |
| `mdtldr search --path "*.md"` | Filter by file path |
| `mdtldr search --has-code` | Sections with code blocks |
| `mdtldr search --has-table` | Sections with tables |
| `mdtldr search --has-list` | Sections with lists |
| `mdtldr semantic -q "query"` | Natural language search |

### Output Formats

All commands support:
- `--json` - JSON output
- `--pretty` - Pretty-printed JSON

---

## MCP Integration

For AI tools (Claude Desktop, Claude Code):

**Claude Desktop** - Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "md-tldr": {
      "command": "mdtldr-mcp",
      "args": []
    }
  }
}
```

**Claude Code** - Add to `.claude/settings.json`:
```json
{
  "mcpServers": {
    "md-tldr": {
      "command": "mdtldr-mcp",
      "args": []
    }
  }
}
```

### MCP Tools

| Tool | What It Does |
|------|--------------|
| `md_search` | Semantic search across indexed docs |
| `md_context` | Get LLM-ready summary for a file |
| `md_structure` | Get document outline |

---

## Configuration

### Index Location

Indexes are stored in `.md-tldr/` in your project root:

```
.md-tldr/
  config.json         # Configuration
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

| Metric | Raw Markdown | md-tldr | Savings |
|--------|--------------|---------|---------|
| Context for single doc | 2,500 tokens | 400 tokens | **84%** |
| Context for 10 docs | 25,000 tokens | 4,000 tokens | **84%** |
| Search latency | N/A | <100ms | - |

---

## Features

- **GFM Support** - Tables, task lists, strikethrough
- **YAML Frontmatter** - Extracts metadata
- **Accurate Token Counting** - Uses tiktoken for precise estimates
- **Incremental Indexing** - Only re-indexes changed files
- **File Watching** - Auto-update on changes
- **Hierarchical Summaries** - Brief/summary/full compression levels

---

## License

MIT
