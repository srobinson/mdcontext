# Market Research Report: md-tldr Naming Analysis

**Date:** January 21, 2026
**Research Conducted By:** Claude Opus 4.5 (Market Research Agent)

---

## Executive Summary

The md-tldr CLI tool occupies a distinct niche in the rapidly growing "context engineering" space for LLMs. While numerous tools exist for converting code and documents to LLM-friendly formats, **very few focus specifically on markdown documentation with semantic search capabilities and structure-preserving token reduction**.

The name "md-tldr" has both strengths and significant challenges. The primary concern is potential confusion with the extremely popular [tldr-pages project](https://github.com/tldr-pages/tldr) (60,000+ GitHub stars), which provides simplified command-line help pages. The "tldr" component may set incorrect expectations, as that project is about command cheatsheets, not document summarization.

**Recommendation:** Consider renaming to better communicate the unique value proposition of semantic search + structure extraction + token optimization for markdown documentation. The current name undersells the tool's sophistication.

---

## Competitor Landscape

### Direct Competitors (Markdown/Documentation for LLMs)

| Tool | Description | Differentiation from md-tldr |
|------|-------------|------------------------------|
| **[llm-docs](https://github.com/Dicklesworthstone/llm-docs)** | Uses LLMs to rewrite documentation into compressed, LLM-friendly format | Requires API calls to compress; md-tldr is deterministic |
| **[llm-min.txt](https://github.com/marv1nnnnn/llm-min.txt)** | AI-distilled documentation in min.js style compression | Output-focused, not search-focused |
| **[llm-context](https://github.com/colthreepv/llm-context)** | Builds context files from project directories | General-purpose; lacks markdown structure awareness |
| **[ai-context](https://github.com/Tanq16/ai-context)** | Generates markdown from GitHub repos, YouTube, webpages | Multi-source; not specialized for markdown docs |
| **[Markdown RAG](https://mcpmarket.com/server/markdown-rag)** | Local semantic search for markdown with embeddings | Similar capabilities; MCP-focused server approach |

### Codebase-to-LLM Tools (Adjacent Market)

| Tool | Stars | Key Features |
|------|-------|--------------|
| **[Repomix](https://github.com/yamadashy/repomix)** | High | ~70% token reduction via Tree-sitter compression; multiple output formats |
| **[code2prompt](https://github.com/mufeedvh/code2prompt)** | High | Rust-based; TUI; git integration; token tracking |
| **[GitIngest](https://github.com/coderamp-labs/gitingest)** | Growing | URL-based access; "replace hub with ingest" pattern |
| **[Codefetch](https://github.com/regenrek/codefetch)** | Moderate | Token counting for multiple models; smart filtering |

### Markdown Structure Tools

| Tool | Purpose |
|------|---------|
| **[submark](https://hackage.haskell.org/package/submark)** | Extract specific sections from CommonMark documents |
| **[treemd](https://github.com/Epistates/treemd)** | TUI markdown navigator with jq-like query language |
| **[markdown-extract](https://github.com/sean0x42/markdown-extract)** | Extract sections by heading; used by HashiCorp |
| **[mq (markdown query)](https://dev.to/harehare/extracting-markdown-headers-and-links-for-llms-with-mq-22cf)** | CLI tool for extracting headers and links for LLMs |
| **[QMD](https://github.com/tobi/qmd)** | Mini CLI search engine with BM25 + vector search + LLM re-ranking |
| **[semtools](https://github.com/run-llama/semtools)** | Rust-based semantic search using multilingual embeddings |

### Semantic Search/RAG Documentation Tools

| Tool | Embedding Provider | Notes |
|------|-------------------|-------|
| **[QMD](https://github.com/tobi/qmd)** | Local (GGUF) | Combines BM25 + vector + LLM re-ranking |
| **[markdown_query (mdq)](https://github.com/ssosik/markdown_query)** | Xapian | Natural language queries for local markdown |
| **[Markdown RAG MCP](https://mcpmarket.com/server/markdown-rag)** | Google Gemini/Ollama | PostgreSQL with pgvector |
| **[Embeddings Searcher](https://glama.ai/mcp/servers/@thypon/kb)** | sentence-transformers | Markdown-optimized chunking |

### Key Market Insights

1. **Context Engineering is the new paradigm**: According to [GitHub's blog](https://github.blog/ai-and-ml/generative-ai/want-better-ai-outputs-try-context-engineering/), context engineering has replaced prompt engineering as the key determinant of AI coding agent success.

2. **Token efficiency matters**: [Repomix](https://repomix.com/) achieves ~70% token reduction. Clean markdown can [improve RAG retrieval accuracy by up to 35%](https://anythingmd.com/blog/why-llms-need-clean-markdown) and reduce token usage by 20-30%.

3. **Structure preservation is valuable**: Tools like [Microsoft's MarkItDown](https://github.com/microsoft/markitdown) focus on preserving document structure (headings, lists, tables) as markdown, recognizing that structure carries semantic meaning.

4. **Local-first is trending**: Several newer tools (QMD, semtools) emphasize local processing without API dependencies for privacy and cost reasons.

---

## Name Analysis: "md-tldr"

### Strengths

1. **Brevity**: Short, easy to type (follows CLI best practices from [clig.dev](https://clig.dev/))
2. **Lowercase with dash**: Follows npm and CLI conventions
3. **"md" prefix**: Clearly signals markdown focus
4. **Memorability**: Catchy combination

### Weaknesses

1. **tldr-pages Confusion** (Critical): The [tldr-pages project](https://github.com/tldr-pages/tldr) has 60,000+ stars and owns "tldr" mindshare in the CLI space. Users searching for "tldr CLI" will find that project, not yours.

2. **Wrong Connotation**: "TL;DR" implies a brief summary of something long. But md-tldr doesn't summarize content - it extracts structure and enables semantic search. The name suggests output (a summary) rather than capability (intelligent context extraction).

3. **Undersells Sophistication**: The tool does:
   - Semantic search with embeddings
   - Structure extraction (not raw text)
   - Section-level context precision
   - Link/backlink analysis
   - Token optimization

   "tldr" sounds like a simple summarizer, not a sophisticated context engineering tool.

4. **npm Conflict Check**: While no exact "md-tldr" exists, the [mdindex](https://www.npmjs.com/package/mdindex) package exists (though inactive). More importantly, "tldr" on npm is already taken by the tldr-pages node client.

5. **SEO/Discoverability**: Searching for "md-tldr" will surface tldr-pages results. Hard to differentiate in search.

### Verdict

The name **does not adequately communicate** the tool's value proposition. The "tldr" suffix:
- Creates confusion with a dominant existing project
- Implies summarization rather than intelligent extraction
- Undersells the semantic search and structure preservation capabilities

---

## 5 Alternative Name Suggestions

### 1. **mdcontext**

**Why it could be better:**
- "Context" directly references the core use case: providing context to LLMs
- Aligns with the industry term "context engineering"
- Clear, professional, descriptive
- Available on npm (checked: no package with this exact name)
- Easy to type, all lowercase

**Potential tagline:** "Intelligent markdown context for LLMs"

**Concerns:**
- Somewhat generic
- [llm-context](https://github.com/colthreepv/llm-context) exists (different focus, but similar territory)

---

### 2. **docsem** (documentation + semantic)

**Why it could be better:**
- Unique, not taken
- Highlights semantic search capability (key differentiator)
- Short and memorable
- "sem" can also evoke "seminal" or "essential"
- Easy to type

**Potential tagline:** "Semantic documentation context for LLMs"

**Concerns:**
- Requires explanation of the portmanteau
- Could be misread as "doc-sem" (document semester?)

---

### 3. **mdscope**

**Why it could be better:**
- "Scope" implies focused, precise extraction (not everything, just what you need)
- Evokes examining/searching capabilities
- Professional sound
- Unique in the space
- Plays well with commands: `mdscope search`, `mdscope context`

**Potential tagline:** "Precisely scoped markdown for LLMs"

**Concerns:**
- Could be confused with Periscope, Telescope, etc.
- Doesn't directly communicate LLM use case

---

### 4. **docslice**

**Why it could be better:**
- "Slice" perfectly describes the core value: extracting just the relevant sections
- Implies precision and efficiency
- Action-oriented (feels like a tool)
- Memorable and unique
- Works as a verb: "Let me docslice that documentation"

**Potential tagline:** "Slice out exactly the docs your LLM needs"

**Concerns:**
- Doesn't communicate markdown specificity
- Could sound like a document splitting tool

---

### 5. **precis** (pronounced "pray-SEE")

**Why it could be better:**
- A precis is "a summary or abstract of a text" - but specifically one that preserves the essential structure and meaning
- Sophisticated, memorable, unique
- Single word, no prefix
- Literary/professional connotation
- Differentiates from simple "summarization"

**Potential tagline:** "The precise precis of your documentation"

**Concerns:**
- Pronunciation may be unclear
- Doesn't indicate markdown or LLM focus
- Possibly too clever/obscure

---

## Recommendation

Based on this research, my **top recommendation** is:

### **mdscope**

**Rationale:**
1. Unique in the market (no existing tools with this name)
2. Professional and memorable
3. "Scope" captures both:
   - The search/examine functionality
   - The precision/focus aspect ("scoped to what you need")
4. The "md" prefix clearly indicates markdown
5. Works well with subcommands: `mdscope index`, `mdscope search`, `mdscope context`
6. Avoids any confusion with tldr-pages
7. Easy to type and remember

**Alternative recommendation:** If you want to emphasize the semantic search capability more strongly, **docsem** would be my second choice.

---

## Sources

### Tools and Projects
- [tldr-pages/tldr](https://github.com/tldr-pages/tldr) - Collaborative cheatsheets for console commands
- [Repomix](https://github.com/yamadashy/repomix) - Pack codebase into AI-friendly formats
- [code2prompt](https://github.com/mufeedvh/code2prompt) - Convert codebase into LLM prompt
- [GitIngest](https://github.com/coderamp-labs/gitingest) - Turn Git repos into prompt-friendly text
- [llm-docs](https://github.com/Dicklesworthstone/llm-docs) - LLM-optimized documentation
- [llm-context](https://github.com/colthreepv/llm-context) - Context file generator for LLMs
- [ai-context](https://github.com/Tanq16/ai-context) - AI-friendly markdown from multiple sources
- [QMD](https://github.com/tobi/qmd) - Mini CLI search engine for docs
- [semtools](https://github.com/run-llama/semtools) - Semantic search CLI tools by LlamaIndex
- [Markdown RAG](https://mcpmarket.com/server/markdown-rag) - Local semantic search for markdown
- [Microsoft MarkItDown](https://github.com/microsoft/markitdown) - Convert files to markdown for LLMs
- [treemd](https://github.com/Epistates/treemd) - Markdown navigator with jq-like queries
- [markdown-extract](https://github.com/sean0x42/markdown-extract) - Extract sections from markdown
- [mq (markdown query)](https://dev.to/harehare/extracting-markdown-headers-and-links-for-llms-with-mq-22cf) - Extract headers and links for LLMs
- [Codefetch](https://github.com/regenrek/codefetch) - Turn code into markdown for LLMs

### Industry Context
- [GitHub: Want better AI outputs? Try context engineering](https://github.blog/ai-and-ml/generative-ai/want-better-ai-outputs-try-context-engineering/)
- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [16x Engineer: LLM Context Management Guide](https://eval.16x.engineer/blog/llm-context-management-guide)
- [JetBrains: Cutting Through the Noise - Context Management](https://blog.jetbrains.com/research/2025/12/efficient-context-management/)
- [Why Your LLM Needs Clean Markdown](https://anythingmd.com/blog/why-llms-need-clean-markdown)
- [The Poetics of CLI Command Names](https://smallstep.com/blog/the-poetics-of-cli-command-names/)
- [Command Line Interface Guidelines](https://clig.dev/)

### Package Registries
- [npm: tldr](https://www.npmjs.com/package/tldr)
- [npm: mdindex](https://www.npmjs.com/package/mdindex)
- [npm Package Name Guidelines](https://docs.npmjs.com/package-name-guidelines/)
