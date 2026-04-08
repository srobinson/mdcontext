# markdown-matters: TL;DR

Token-efficient markdown analysis and search built for LLM agents.

## What it is

A TypeScript tool that indexes markdown directories into queryable structures, then serves content through a CLI (`mdm`) or MCP server (`mdm-mcp`). Every output path is designed to stay within token budgets, so AI agents get the context they need without blowing through limits.

## Why it exists

LLMs need documentation context to do useful work, but feeding them raw markdown is wasteful. markdown-matters builds structured indexes (documents, sections, links, embeddings) so agents can ask precise questions and get compressed, relevant answers instead of entire files.

## How it works

### Indexing

Point `mdm index` at a directory. It parses every markdown file via remark into an AST, extracts heading-delimited sections with metadata (token counts, line ranges, frontmatter), and writes JSON indexes to `.mdm/`. Optionally, it generates vector embeddings for semantic search.

Unchanged files are skipped on re-index using mtime + SHA256 content hashing.

### Search

Three modes, all available through both CLI and MCP:

- **Keyword (BM25)**: Boolean query parser with AND/OR/NOT, quoted phrases, fuzzy matching
- **Semantic (HNSW)**: Embedding-based similarity search with optional HyDE expansion
- **Hybrid**: Runs both in parallel, merges via Reciprocal Rank Fusion

### Serving context

The `context` command (and `md_context` MCP tool) compresses a file to `brief`, `summary`, or `full` detail levels. Agents request the level they can afford within their token budget.

### MCP integration

The `mdm-mcp` binary exposes 7 tools over stdio transport: `md_search`, `md_context`, `md_structure`, `md_keyword_search`, `md_index`, `md_links`, `md_backlinks`. Any MCP client (Claude Code, Cursor, etc.) can use these directly.

## Key concepts

- **Sections**: The primary unit of content. Each heading in a markdown file creates a section with its own token count, line range, and metadata.
- **Namespaced embeddings**: Vector indexes are isolated per provider+model combination. You can switch between OpenAI, Voyage, Ollama, or LM Studio embeddings without conflicts.
- **Effect runtime**: The codebase uses the Effect library for typed errors, dependency injection, and service composition. All errors follow a domain taxonomy (E1xx through E9xx).
- **Token budgets**: Throughout the system, token counts are tracked and respected. Summaries, search results, and context output all operate within configurable limits.

## Quick start

```bash
pnpm install
pnpm build
mdm index /path/to/docs
mdm search "how does authentication work"
mdm context README.md --level summary
```

## Part of Helioy

One component in a larger ecosystem: attention-matters (geometric memory), context-matters (structured context store), fmm (code intelligence), helioy-bus (agent messaging), helioy-plugins (Claude Code integration).
