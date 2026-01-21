# Market Research: md-tldr Naming and Competitive Landscape

**Date:** January 21, 2026
**Research Type:** Competitive Analysis and Brand Evaluation

---

## Executive Summary

The markdown-for-LLMs tooling space is rapidly evolving, with over 37 documented CLI tools for preparing code and documentation for LLM consumption. The market is fragmented across several niches: repository-to-prompt tools (Repomix, codefetch), semantic search tools (SemTools, QMD, mdq), prompt compression tools (LLMLingua), and documentation AI integrations (Context7, Markprompt).

**Key Findings:**
- The name "md-tldr" is **available** (no conflicts found on npm, PyPI, or crates.io)
- However, "tldr" carries strong associations with the popular [tldr-pages](https://github.com/tldr-pages/tldr) project (50k+ GitHub stars), which may cause confusion
- The "TL;DR" connotation implies quick summaries, which partially aligns with the tool's purpose but undersells its semantic search and indexing capabilities
- Competitors primarily use descriptive names (Repomix, SemTools, MarkItDown) or query-focused names (mdq, QMD)

**Recommendation:** Consider rebranding to better communicate the dual value proposition of (1) intelligent markdown indexing with semantic search and (2) token-efficient context extraction for LLMs.

---

## Competitor Landscape

### Tier 1: Direct Competitors (Markdown + LLM Context)

#### 1. **Repomix** ([github.com/yamadashy/repomix](https://github.com/yamadashy/repomix))
- **What it does:** Packs entire repositories into a single AI-friendly file
- **Key features:** Token counting, git-aware, security checks, code compression via Tree-sitter
- **Strength:** Mature, well-documented, JSNation 2025 nominee
- **Weakness:** Focuses on code repos, not markdown documentation specifically
- **Differentiation from md-tldr:** Repomix dumps everything; md-tldr extracts structure and enables semantic search

#### 2. **SemTools** ([github.com/run-llama/semtools](https://github.com/run-llama/semtools))
- **What it does:** Document processing and semantic search CLI built in Rust
- **Key features:** Local semantic search using multilingual embeddings, per-line context matching
- **Strength:** Fast (Rust-based), uses model2vec embeddings
- **Weakness:** Less focused on markdown specifically
- **Differentiation from md-tldr:** SemTools is general-purpose; md-tldr is markdown-native with structure extraction

#### 3. **QMD (Query Markdown)** ([github.com/tobi/qmd](https://github.com/tobi/qmd))
- **What it does:** Mini CLI search engine for markdown docs, knowledge bases, meeting notes
- **Key features:** Combines BM25 full-text, vector semantic search, and LLM re-ranking
- **Strength:** Fully local via node-llama-cpp with GGUF models
- **Weakness:** Less focus on LLM context preparation, more on personal search
- **Differentiation from md-tldr:** QMD is about searching your notes; md-tldr is about preparing docs for LLMs

#### 4. **mdq** ([github.com/yshavit/mdq](https://github.com/yshavit/mdq))
- **What it does:** "jq for Markdown" - query specific parts of markdown documents
- **Key features:** Filter syntax mirrors markdown, available as Rust library
- **Strength:** Precise extraction, great for pipelines
- **Weakness:** No semantic search, purely structural
- **Differentiation from md-tldr:** mdq is for precise extraction; md-tldr adds semantic search and indexing

#### 5. **Markdown RAG** ([glama.ai/mcp/servers/@ashrobertsdragon/rag-mcp](https://glama.ai/mcp/servers/@ashrobertsdragon/rag-mcp))
- **What it does:** MCP server for indexing and semantic search over markdown docs
- **Key features:** Integrates with Ollama, uses PostgreSQL + pgvector
- **Strength:** Modern MCP architecture, scalable
- **Weakness:** Requires PostgreSQL setup, not standalone CLI
- **Differentiation from md-tldr:** Markdown RAG is server-oriented; md-tldr is CLI-first with embedded index

### Tier 2: Adjacent Tools (Document Processing for LLMs)

#### 6. **Microsoft MarkItDown** ([github.com/microsoft/markitdown](https://github.com/microsoft/markitdown))
- **What it does:** Converts files and office documents to Markdown
- **Key features:** PDF, DOCX, PPTX to markdown, MCP server available
- **Strength:** Microsoft backing, wide format support
- **Use case overlap:** Both prepare content for LLMs, but MarkItDown focuses on conversion, not search

#### 7. **codefetch** ([github.com/regenrek/codefetch](https://github.com/regenrek/codefetch))
- **What it does:** Turn code into Markdown for LLMs with one command
- **Key features:** Respects ignore patterns, token counting
- **Strength:** Simple and focused
- **Use case overlap:** Similar goal of LLM preparation, but code-focused vs markdown-focused

#### 8. **dom-to-semantic-markdown** ([github.com/romansky/dom-to-semantic-markdown](https://github.com/romansky/dom-to-semantic-markdown))
- **What it does:** Converts HTML DOM to semantic markdown optimized for LLMs
- **Key features:** URL refification, metadata extraction
- **Strength:** Web content to LLM-ready format
- **Use case overlap:** Token optimization for web content

### Tier 3: Prompt Compression Tools

#### 9. **LLMLingua** ([github.com/microsoft/LLMLingua](https://github.com/microsoft/LLMLingua))
- **What it does:** Compress prompts for accelerated LLM inference
- **Key features:** Up to 20x compression, integrated with LangChain/LlamaIndex
- **Strength:** Research-backed (Microsoft), proven results
- **Weakness:** Operates on raw text, not markdown-aware
- **Use case overlap:** Both reduce tokens, but LLMLingua compresses after extraction; md-tldr extracts intelligently

#### 10. **LongLLMLingua** (Extension of LLMLingua)
- **What it does:** Question-aware prompt compression for RAG
- **Key features:** Mitigates "lost in the middle" issue, 21.4% RAG improvement
- **Strength:** Considers user query during compression
- **Differentiation:** Could be used after md-tldr extracts context

### Tier 4: Platform Integrations

#### 11. **Context7** ([context7.com](https://context7.com/docs/overview))
- **What it does:** Fetches version-specific documentation for AI coding assistants
- **Key features:** MCP server, integrates with Cursor/Windsurf/Claude
- **Strength:** Live documentation lookup during coding
- **Differentiation:** Context7 is for library docs; md-tldr is for your own docs

#### 12. **Markprompt** ([npmjs.com/package/@markprompt/docusaurus-theme-search](https://www.npmjs.com/package/@markprompt/docusaurus-theme-search))
- **What it does:** AI-powered docs search for Docusaurus/VitePress
- **Key features:** Integrates with Algolia, ChatGPT-like prompts
- **Differentiation:** Website search vs CLI tool

#### 13. **vitepress-plugin-llms** ([github.com/okineadev/vitepress-plugin-llms](https://github.com/okineadev/vitepress-plugin-llms))
- **What it does:** Generates LLM-friendly documentation following llmstxt.org standard
- **Strength:** Standards-compliant
- **Differentiation:** Build-time generation vs runtime search

### Tier 5: Knowledge Base Search (Obsidian Ecosystem)

#### 14. **Smart Connections** (Obsidian Plugin)
- **What it does:** Local embeddings for semantic note search
- **Key features:** Fully offline, privacy-focused
- **Strength:** Large user base in Obsidian community
- **Differentiation:** Plugin vs standalone CLI

#### 15. **obsidian-semantic-search** ([github.com/bbawj/obsidian-semantic-search](https://github.com/bbawj/obsidian-semantic-search))
- **What it does:** Semantic search using OpenAI/Ollama embeddings
- **Key features:** Hybrid TypeScript-Rust implementation
- **Differentiation:** Obsidian-specific vs general markdown

---

## Name Analysis: "md-tldr"

### Current Name Evaluation

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| **Clarity** | 3/5 | "md" clearly indicates markdown; "tldr" suggests summaries |
| **Memorability** | 4/5 | Short, easy to type, familiar format |
| **Searchability** | 2/5 | Competes with tldr-pages in search results |
| **Value Proposition** | 2/5 | Undersells semantic search and indexing capabilities |
| **Professionalism** | 3/5 | Casual/internet-speak connotation |
| **Uniqueness** | 3/5 | No direct conflicts, but tldr association is strong |

**Overall: 17/30**

### Strengths of "md-tldr"

1. **Brevity:** Easy to type in CLI contexts (`md-tldr search "query"`)
2. **Recognition:** "TL;DR" is universally understood to mean "summary"
3. **Availability:** No naming conflicts found on major package registries
4. **Markdown association:** "md" prefix clearly indicates the domain

### Weaknesses of "md-tldr"

1. **tldr-pages confusion:** The [tldr-pages](https://github.com/tldr-pages/tldr) project has 50,000+ GitHub stars and dominates the "tldr" namespace in CLI tooling. Users searching for "tldr" or "tldr cli" will find that project first.

2. **Connotation mismatch:** "TL;DR" traditionally means "a brief summary for those who don't want to read the full text." This:
   - Implies simplification/dumbing down, when the tool actually does intelligent extraction
   - Doesn't convey semantic search capabilities
   - Doesn't suggest the indexing/structure extraction features

3. **Undersells capabilities:** The name suggests "give me the short version" when the actual value is:
   - Intelligent structure extraction (not just truncation)
   - Semantic search with embeddings
   - Context-aware retrieval for specific queries
   - 80% token reduction while preserving meaning

4. **Casual tone:** For enterprise or professional use, "tldr" may seem too informal

5. **SEO challenges:** Searching "md-tldr markdown tool" will surface tldr-pages results

### Connotation Analysis of "TL;DR"

The phrase "Too Long; Didn't Read" carries these implicit meanings:
- **Impatience:** "I don't have time for the full thing"
- **Brevity over depth:** "Just give me the gist"
- **Information loss:** "Skip the details"

**What md-tldr actually does:**
- **Intelligent extraction:** Preserves structure and meaning
- **Depth with efficiency:** Reduces tokens without losing semantics
- **Precision:** Semantic search finds exactly relevant context

The mismatch between the name's connotation and the tool's sophisticated capabilities is the primary concern.

---

## 5 Alternative Name Suggestions

### 1. **mdcontext**

**Rationale:** Directly communicates the core value proposition of extracting the right context from markdown for LLMs.

| Aspect | Evaluation |
|--------|------------|
| Clarity | "md" = markdown, "context" = LLM context window |
| Memorability | Simple, professional, easy to spell |
| Searchability | Unique enough to rank well |
| CLI ergonomics | `mdcontext search "auth"` feels natural |
| Availability | Not found on npm/PyPI/crates.io |

**Tagline alignment:** "Give LLMs exactly the markdown context they need."

**Why it could be better:** The word "context" directly addresses the LLM context window problem, which is the tool's core use case. It's professional enough for enterprise use while remaining developer-friendly.

---

### 2. **markscope**

**Rationale:** Evokes the idea of scoping/focusing on specific parts of markdown, plus the "scope" metaphor suggests precise targeting.

| Aspect | Evaluation |
|--------|------------|
| Clarity | "mark" suggests markdown, "scope" implies precision |
| Memorability | Distinctive, easy to pronounce |
| Searchability | Unique, no major conflicts |
| CLI ergonomics | `markscope search "api auth"` works well |
| Availability | Domain likely available |

**Tagline potential:** "Focus your markdown for LLMs."

**Why it could be better:** "Scope" conveys precision and targeting, which aligns with semantic search. It avoids the "summary/truncation" connotation of "tldr" and suggests professional-grade tooling.

---

### 3. **mdlens**

**Rationale:** A "lens" lets you focus on what matters - perfect metaphor for semantic search and intelligent extraction.

| Aspect | Evaluation |
|--------|------------|
| Clarity | "md" = markdown, "lens" = focused view |
| Memorability | Short, visual metaphor |
| Searchability | Unique in this space |
| CLI ergonomics | `mdlens context ./docs "deployment"` |
| Availability | Likely available |

**Tagline potential:** "Focus LLMs on what matters in your markdown."

**Why it could be better:** The lens metaphor conveys:
- Precision (focusing on specific areas)
- Intelligence (selecting what to show)
- Professional optics tooling connotation

---

### 4. **docprep**

**Rationale:** Clearly communicates the preparation/preprocessing aspect for documentation.

| Aspect | Evaluation |
|--------|------------|
| Clarity | Obvious meaning - prepare documents |
| Memorability | Straightforward, no learning curve |
| Searchability | Generic but "docprep llm" would rank |
| CLI ergonomics | `docprep index ./docs` |
| Availability | Likely available (searched, no conflicts) |

**Tagline potential:** "Prepare your docs for LLMs. Intelligently."

**Why it could be better:** Explicitly communicates the "preparation" use case. The name is functional and professional, following the pattern of successful tools like "docusaurus", "docsify", etc.

---

### 5. **semmd** (Semantic Markdown)

**Rationale:** Highlights the semantic search capability, which is a key differentiator.

| Aspect | Evaluation |
|--------|------------|
| Clarity | "sem" = semantic, "md" = markdown |
| Memorability | Short, technical but learnable |
| Searchability | Unique, "semantic markdown" is descriptive |
| CLI ergonomics | `semmd search "authentication"` |
| Availability | Likely available |

**Tagline potential:** "Semantic search and extraction for markdown."

**Why it could be better:** Explicitly calls out the semantic/AI-powered nature of the search, differentiating from simple grep-style tools. Appeals to developers familiar with "semantic" in ML/AI contexts.

---

## Recommendation

### Primary Recommendation: **mdcontext**

**Reasoning:**
1. **Direct value proposition:** "Context" is the exact word developers use when discussing LLM context windows
2. **Professional:** Appropriate for enterprise and open-source use
3. **Searchable:** "mdcontext" would rank well and not compete with existing projects
4. **Memorable:** Follows the `md-*` naming pattern that's recognizable in the ecosystem
5. **Extensible:** Works for future features (mdcontext search, mdcontext tree, mdcontext stats)

**Alternative:** If a more distinctive/brandable name is preferred, **markscope** offers strong differentiation while remaining professional.

### Keep "md-tldr" If:
- The target audience is primarily casual/individual developers
- The "tldr" connotation is intentionally playful
- SEO ranking against tldr-pages is not a concern
- The tool will remain focused on summarization (not expanding to semantic search as primary feature)

### Summary Matrix

| Name | Clarity | SEO | Professional | Semantic Search Fit | Overall |
|------|---------|-----|--------------|---------------------|---------|
| md-tldr | 3/5 | 2/5 | 3/5 | 2/5 | 10/20 |
| **mdcontext** | 5/5 | 4/5 | 5/5 | 4/5 | **18/20** |
| markscope | 4/5 | 5/5 | 5/5 | 4/5 | 18/20 |
| mdlens | 4/5 | 4/5 | 4/5 | 5/5 | 17/20 |
| docprep | 4/5 | 3/5 | 5/5 | 3/5 | 15/20 |
| semmd | 3/5 | 4/5 | 4/5 | 5/5 | 16/20 |

---

## Sources

### Competitor Tools
- [Repomix](https://github.com/yamadashy/repomix) - Repository packing for LLMs
- [SemTools by LlamaIndex](https://github.com/run-llama/semtools) - Semantic search CLI
- [QMD](https://github.com/tobi/qmd) - Query Markdown search engine
- [mdq](https://github.com/yshavit/mdq) - jq for Markdown
- [dom-to-semantic-markdown](https://github.com/romansky/dom-to-semantic-markdown) - HTML to semantic markdown
- [codefetch](https://github.com/regenrek/codefetch) - Code to markdown for LLMs
- [Microsoft MarkItDown](https://github.com/microsoft/markitdown) - Document to markdown converter
- [LLMLingua](https://github.com/microsoft/LLMLingua) - Prompt compression

### Documentation AI Tools
- [Context7](https://context7.com/docs/overview) - Documentation fetching for AI assistants
- [Markprompt](https://www.npmjs.com/package/@markprompt/docusaurus-theme-search) - AI docs search
- [vitepress-plugin-llms](https://github.com/okineadev/vitepress-plugin-llms) - LLM-friendly docs generation

### Obsidian Ecosystem
- [Smart Connections](https://effortlessacademic.com/adding-ai-to-your-obsidian-notes-with-smartconnections-and-copilot/) - Obsidian AI plugin
- [obsidian-semantic-search](https://github.com/bbawj/obsidian-semantic-search) - Semantic search plugin

### Naming and CLI Guidelines
- [tldr-pages](https://github.com/tldr-pages/tldr) - The dominant "tldr" CLI project
- [CLI Design Guidelines](https://clig.dev/) - Best practices for CLI naming
- [The Poetics of CLI Command Names](https://smallstep.com/blog/the-poetics-of-cli-command-names/) - Naming philosophy

### LLM Context Management
- [LLM Context Window Management Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) - Context engineering
- [RAG Token Optimization](https://apxml.com/courses/optimizing-rag-for-production/chapter-5-cost-optimization-production-rag/minimize-llm-token-usage-rag) - Cost reduction techniques
- [Greptile Semantic Codebase Search](https://www.greptile.com/blog/semantic-codebase-search) - Semantic search challenges
