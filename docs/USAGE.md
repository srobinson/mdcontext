# md-tldr Usage Guide

Complete command reference and workflows for md-tldr.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [parse](#parse)
  - [tree](#tree)
  - [structure](#structure)
  - [index](#index)
  - [links](#links)
  - [backlinks](#backlinks)
  - [search](#search)
  - [context](#context)
  - [summarize](#summarize)
  - [assemble](#assemble)
  - [embed](#embed)
  - [semantic](#semantic)
  - [stats](#stats)
- [MCP Server](#mcp-server)
- [Workflows](#workflows)
- [Configuration](#configuration)

---

## Installation

```bash
# Global install
npm install -g md-tldr

# Or use npx
npx md-tldr --help
```

**Requirements:**
- Node.js 18+
- OpenAI API key (for semantic search only)

---

## Quick Start

```bash
# 1. Index your markdown files
mdtldr index ./docs

# 2. View structure
mdtldr tree ./docs
mdtldr structure -f ./docs/README.md

# 3. Get LLM-ready context
mdtldr context -f ./docs/README.md

# 4. Enable semantic search (optional)
export OPENAI_API_KEY=sk-...
mdtldr embed ./docs
mdtldr semantic -q "how to authenticate"
```

---

## Commands

### parse

Parse a single markdown file and output structured JSON.

```bash
mdtldr parse -f <file> [--json] [--pretty]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-f, --file` | Path to markdown file (required) |
| `--json` | Output as JSON |
| `--pretty` | Pretty-print JSON |

**Example:**
```bash
mdtldr parse -f README.md --json --pretty
```

**Output includes:**
- Title (from H1 or frontmatter)
- Sections (hierarchical)
- Links (internal, external, images)
- Code blocks
- Metadata (word count, token count, etc.)

---

### tree

Display markdown file structure in a directory.

```bash
mdtldr tree [dir] [--json] [--pretty]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-d, --dir` | Directory to scan (default: current) |
| `--json` | Output as JSON |
| `--pretty` | Pretty-print JSON |

**Example:**
```bash
mdtldr tree ./docs
```

**Output:**
```
docs/
├── README.md (2,450 tokens)
├── api/
│   ├── endpoints.md (1,200 tokens)
│   └── authentication.md (890 tokens)
└── guides/
    └── getting-started.md (1,560 tokens)
```

---

### structure

Display document outline (heading hierarchy).

```bash
mdtldr structure -f <file> [--json] [--pretty]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-f, --file` | Path to markdown file (required) |
| `--json` | Output as JSON |
| `--pretty` | Pretty-print JSON |

**Example:**
```bash
mdtldr structure -f docs/api.md
```

**Output:**
```
# API Reference (450 tokens)
  ## Authentication (120 tokens)
    ### OAuth Flow (45 tokens)
    ### API Keys (35 tokens)
  ## Endpoints (280 tokens)
    ### Users (95 tokens)
    ### Products (105 tokens)
```

---

### index

Build or update the document index.

```bash
mdtldr index [dir] [--force] [--watch] [--json] [--pretty]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-d, --dir` | Directory to index (default: current) |
| `--force` | Force full rebuild (ignore cache) |
| `-w, --watch` | Watch for file changes |
| `--json` | Output as JSON |
| `--pretty` | Pretty-print JSON |

**Example:**
```bash
# Initial index
mdtldr index ./docs

# Watch mode for development
mdtldr index ./docs --watch

# Force rebuild
mdtldr index ./docs --force
```

**Index location:** `.md-tldr/indexes/`

---

### links

Show outgoing links from a file.

```bash
mdtldr links -f <file> [-r <root>] [--json] [--pretty]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-f, --file` | Path to markdown file (required) |
| `-r, --root` | Root directory for index (default: current) |
| `--json` | Output as JSON |
| `--pretty` | Pretty-print JSON |

**Example:**
```bash
mdtldr links -f docs/README.md
```

**Output:**
```
Internal Links:
  → ./getting-started.md (Getting Started)
  → ./api/endpoints.md (API Reference)
  → #installation (Installation)

External Links:
  → https://github.com/example (GitHub)
```

---

### backlinks

Show files that link to a specific file.

```bash
mdtldr backlinks -f <file> [-r <root>] [--json] [--pretty]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-f, --file` | Path to markdown file (required) |
| `-r, --root` | Root directory for index (default: current) |
| `--json` | Output as JSON |
| `--pretty` | Pretty-print JSON |

**Example:**
```bash
mdtldr backlinks -f docs/api/authentication.md
```

**Output:**
```
Files linking to docs/api/authentication.md:
  ← docs/README.md (in section "Quick Start")
  ← docs/guides/getting-started.md (in section "Authentication")
```

---

### search

Search for sections by structural criteria.

```bash
mdtldr search [-r <root>] [--heading <pattern>] [--path <pattern>]
              [--has-code] [--has-table] [--has-list] [-l <limit>]
              [--json] [--pretty]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-r, --root` | Root directory for index |
| `-h, --heading` | Regex pattern to match headings |
| `-p, --path` | Glob pattern to filter files |
| `--has-code` | Only sections with code blocks |
| `--has-table` | Only sections with tables |
| `--has-list` | Only sections with lists |
| `-l, --limit` | Maximum results (default: 10) |
| `--json` | Output as JSON |
| `--pretty` | Pretty-print JSON |

**Examples:**
```bash
# Find sections about authentication
mdtldr search --heading "auth|login|session"

# Find code examples in API docs
mdtldr search --path "api/*.md" --has-code

# Find configuration sections
mdtldr search --heading "config|settings" --limit 5
```

---

### context

Get LLM-ready context for a file.

```bash
mdtldr context -f <file> [-r <root>] [-t <tokens>]
               [--level brief|summary|full] [--json] [--pretty]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-f, --file` | Path to markdown file (required) |
| `-r, --root` | Root directory for index |
| `-t, --tokens` | Maximum token budget |
| `--level` | Compression level: brief (100), summary (500), full |
| `--json` | Output as JSON |
| `--pretty` | Pretty-print JSON |

**Examples:**
```bash
# Default context
mdtldr context -f docs/README.md

# Constrained to 200 tokens
mdtldr context -f docs/README.md -t 200

# Brief summary
mdtldr context -f docs/README.md --level brief
```

**Output includes:**
- Document title and path
- Section summaries (respecting token budget)
- Token count
- Metadata markers for code, tables, etc.

---

### summarize

Generate a hierarchical summary of a file.

```bash
mdtldr summarize -f <file> [--level brief|summary|full]
                 [-t <tokens>] [--json] [--pretty]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-f, --file` | Path to markdown file (required) |
| `--level` | Compression level: brief, summary, full |
| `-t, --tokens` | Override token budget |
| `--json` | Output as JSON |
| `--pretty` | Pretty-print JSON |

**Compression Levels:**
| Level | Target | Description |
|-------|--------|-------------|
| `brief` | ~100 tokens | Key points only |
| `summary` | ~500 tokens | Main content |
| `full` | No limit | Complete content |

**Example:**
```bash
mdtldr summarize -f docs/architecture.md --level summary
```

---

### assemble

Assemble context from multiple files with a token budget.

```bash
mdtldr assemble -s <sources> [-r <root>] [-b <budget>]
                [--level brief|summary|full] [--json] [--pretty]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-s, --sources` | Comma-separated list of files |
| `-r, --root` | Root directory for index |
| `-b, --budget` | Total token budget (default: 2000) |
| `--level` | Compression level for each file |
| `--json` | Output as JSON |
| `--pretty` | Pretty-print JSON |

**Example:**
```bash
# Assemble context from 3 files within 1500 tokens
mdtldr assemble -s "README.md,docs/api.md,docs/setup.md" -b 1500
```

**Output:**
- Combined context from all files
- Token budget respected across all files
- Metadata about what was included/truncated

---

### embed

Build embedding index for semantic search.

```bash
mdtldr embed [-r <root>] [--force] [--json] [--pretty]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-r, --root` | Root directory for index |
| `--force` | Force rebuild all embeddings |
| `--json` | Output as JSON |
| `--pretty` | Pretty-print JSON |

**Requirements:**
- `OPENAI_API_KEY` environment variable

**Example:**
```bash
export OPENAI_API_KEY=sk-...
mdtldr embed ./docs
```

**Output:**
```
Embedding 45 sections...
  ✓ docs/README.md (5 sections)
  ✓ docs/api/endpoints.md (12 sections)
  ...
Done. 45 sections embedded.
Cost: ~$0.002
```

---

### semantic

Search by natural language query.

```bash
mdtldr semantic -q <query> [-r <root>] [-l <limit>]
                [--threshold <float>] [-p <path>] [--json] [--pretty]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-q, --query` | Natural language query (required) |
| `-r, --root` | Root directory for index |
| `-l, --limit` | Maximum results (default: 5) |
| `--threshold` | Minimum similarity score (0-1) |
| `-p, --path` | Filter by file path pattern |
| `--json` | Output as JSON |
| `--pretty` | Pretty-print JSON |

**Requirements:**
- Embedding index built with `mdtldr embed`
- `OPENAI_API_KEY` environment variable

**Example:**
```bash
mdtldr semantic -q "how to handle authentication errors" -l 3
```

**Output:**
```
Results for "how to handle authentication errors":

1. docs/api/errors.md > Error Handling (0.89)
   Describes how to handle API errors including auth failures...

2. docs/guides/auth.md > Troubleshooting (0.82)
   Common authentication issues and solutions...

3. docs/api/authentication.md > Error Codes (0.78)
   List of authentication error codes...
```

---

### stats

Show index statistics.

```bash
mdtldr stats [-r <root>] [--json] [--pretty]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-r, --root` | Root directory for index |
| `--json` | Output as JSON |
| `--pretty` | Pretty-print JSON |

**Example:**
```bash
mdtldr stats
```

**Output:**
```
Index Statistics:
  Documents: 23
  Sections: 156
  Total tokens: 45,230
  Links: 89 (67 internal, 22 external)
  Code blocks: 34
  Embeddings: 156 (100%)
  Last updated: 2024-01-15 10:30:00
```

---

## MCP Server

md-tldr includes an MCP server for integration with AI assistants.

### Starting the Server

```bash
mdtldr-mcp
```

### Available Tools

| Tool | Description |
|------|-------------|
| `md_search` | Semantic search across indexed documents |
| `md_context` | Get LLM-ready context for a file |
| `md_structure` | Get document structure/outline |

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### Claude Code Configuration

Add to `.claude/settings.json`:

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

---

## Workflows

### Adding Documentation to LLM Context

```bash
# 1. Get overview of available docs
mdtldr tree ./docs

# 2. Find relevant sections
mdtldr search --heading "setup|install" --has-code

# 3. Get context for specific file
mdtldr context -f docs/setup.md -t 500

# 4. Or assemble from multiple files
mdtldr assemble -s "README.md,docs/setup.md,docs/api.md" -b 2000
```

### Finding Related Documentation

```bash
# 1. See what a file links to
mdtldr links -f docs/README.md

# 2. See what links to a file
mdtldr backlinks -f docs/api/authentication.md

# 3. Use semantic search to find related content
mdtldr semantic -q "user authentication and session management"
```

### Keeping Index Updated

```bash
# One-time index
mdtldr index ./docs

# Watch mode during development
mdtldr index ./docs --watch

# Force full rebuild after major changes
mdtldr index ./docs --force
```

### Optimizing for Token Budget

```bash
# Check token counts
mdtldr structure -f large-doc.md

# Get brief summary
mdtldr context -f large-doc.md --level brief

# Or set explicit budget
mdtldr context -f large-doc.md -t 200

# For multiple files with shared budget
mdtldr assemble -s "a.md,b.md,c.md" -b 1000
```

---

## Configuration

### Index Directory

By default, indexes are stored in `.md-tldr/` in your project root:

```
.md-tldr/
├── config.json           # Configuration
├── indexes/
│   ├── documents.json    # Document metadata
│   ├── sections.json     # Section index
│   ├── links.json        # Link graph
│   └── vectors.bin       # Embeddings
└── cache/
    └── parsed/           # Cached parsed documents
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | For semantic search | OpenAI API key |

### Supported File Types

- `.md` - Markdown
- `.mdx` - MDX (treated as markdown)

### GFM Features Supported

- Tables
- Task lists (`- [ ]`, `- [x]`)
- Strikethrough
- Autolinks
- YAML frontmatter

---

## Troubleshooting

### "No index found"

Run `mdtldr index .` to build the index first.

### "Semantic search not available"

1. Set `OPENAI_API_KEY` environment variable
2. Run `mdtldr embed .` to build embedding index

### "File not found in index"

1. Check file is in indexed directory
2. Run `mdtldr index --force` to rebuild

### High token counts

- Use `--level brief` for compressed output
- Use `-t <tokens>` to set explicit budget
- Use `assemble` for multi-file with shared budget
