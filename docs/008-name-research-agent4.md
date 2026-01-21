# Market Research: md-tldr Naming Analysis

**Research Date:** January 21, 2026
**Researcher:** Claude Opus 4.5 (Market Research Agent)

---

## Executive Summary

The CLI tool landscape for LLM context preparation is **crowded but fragmented**. Over 37 tools exist for converting codebases and documents to LLM-friendly formats, yet **no dominant player** focuses specifically on markdown documentation indexing with semantic search and token optimization.

**Key findings:**
- The name "md-tldr" has **significant naming conflicts** with the highly popular `tldr` CLI tool (47K+ GitHub stars)
- The "tldr" connotation may **undersell the tool's capabilities**—it implies summarization, not intelligent structure extraction
- The "md-" prefix is **underutilized** in the ecosystem, making it distinctive
- A name emphasizing **context**, **docs**, or **index** would better communicate the value proposition

**Recommendation:** Consider renaming to better capture the tool's unique value: semantic search over markdown documentation structure with massive token reduction.

---

## Competitor Landscape

### Direct Competitors (Markdown + LLM Focus)

| Tool | Description | Focus | Stars/Users |
|------|-------------|-------|-------------|
| [**semtools**](https://github.com/run-llama/semtools) | Rust CLI for semantic search over documents | Parsing + semantic search | New |
| [**markdown-file-query**](https://github.com/madeyexz/markdown-file-query) | Semantic QA with markdown using Pinecone + GPT | Vector search | Niche |
| [**mcp-markdown-ragdocs**](https://glama.ai/mcp/servers/@andnp/ragdocs-mcp) | MCP server for semantic search over local markdown | RAG + MCP | Growing |
| [**rag-agent**](https://github.com/kevwan/rag-agent) | Markdown knowledge RAG with Milvus | Vector storage | Active |

### Adjacent Competitors (Codebase/Document to LLM)

| Tool | Description | Token Claims | Stars |
|------|-------------|--------------|-------|
| [**Repomix**](https://repomix.com/) | Pack entire repo into AI-friendly file | ~70% reduction with Tree-sitter | 15K+ |
| [**code2prompt**](https://github.com/mufeedvh/code2prompt) | Convert codebase to single LLM prompt | Token counting | 10K+ |
| [**Gitingest**](https://gitingest.com/) | GitHub URL to LLM-ready text | N/A | Popular |
| [**Dir2md**](https://github.com/flamehaven01/Dir2md) | Codebase to LLM-optimized markdown | 30-50% token reduction | New |
| [**ai-context**](https://github.com/Tanq16/ai-context) | Context files from GitHub/local/YouTube | Multi-source | Active |
| [**llm-context**](https://www.npmjs.com/package/llm-context) | Build context files from projects | N/A | npm package |
| [**CTX**](https://github.com/context-hub/generator) | Organize codebase context for LLMs | N/A | Growing |
| [**gptree**](https://github.com/travisvn/gptree) | Project files + directory tree for LLM | N/A | Active |
| [**Combicode**](https://github.com/aaurelions/combicode) | Combine source into LLM-friendly file | Zero dependencies | New |

### Document Conversion Tools (PDF/HTML to Markdown)

| Tool | Owner | Focus |
|------|-------|-------|
| [**MarkItDown**](https://github.com/microsoft/markitdown) | Microsoft | Any doc to markdown, MCP server |
| [**Monkt**](https://monkt.com/) | Commercial | PDF/Office/HTML to markdown |
| [**AnythingMD**](https://anythingmd.com/) | Commercial | Complex docs to structured markdown |
| [**PyMuPDF4LLM**](https://artifex.com/blog/rag-llm-and-pdf-conversion-to-markdown-text-with-pymupdf) | Artifex | PDF to markdown with minimal tokens |
| [**dom-to-semantic-markdown**](https://github.com/romansky/dom-to-semantic-markdown) | Open Source | HTML DOM to semantic markdown |
| [**Firecrawl**](https://firecrawl.dev/) | Commercial | URL to clean markdown |

### Semantic Search Frameworks

| Tool | Description |
|------|-------------|
| [**Semantra**](https://github.com/freedmand/semantra) | Multi-tool for semantic search, no generative models |
| [**txtai**](https://github.com/neuml/txtai) | All-in-one AI framework: embeddings, semantic search, LLM orchestration |
| [**DocSummarizer**](https://www.mostlylucid.net/blog/docsummarizer-rag-pipeline) | ONNX embeddings, local, offline-capable |

### Standards & Specifications

- [**llms.txt**](https://llmstxt.org/) - Proposed standard for LLM-friendly website content
- [**llms_txt2ctx**](https://github.com/AnswerDotAI/llms-txt) - CLI for parsing llms.txt and generating context

---

## What Makes md-tldr Different

Based on the competitor analysis, **md-tldr occupies a unique niche**:

| Feature | md-tldr | Competitors |
|---------|---------|-------------|
| **Structure extraction** (not raw text) | Yes | Rare |
| **Semantic search** with embeddings | Yes | Some (semtools, txtai) |
| **80%+ token reduction** | Yes | 30-70% typical |
| **Markdown-specific** indexing | Yes | Most are generic |
| **Commands**: index, search, context, tree, links, backlinks, stats | Comprehensive | Usually simpler |

The combination of **structural indexing + semantic search + extreme token optimization** is genuinely differentiated.

---

## Name Analysis: "md-tldr"

### Strengths

1. **"md-" prefix is available** - Few tools use this prefix, making it distinctive
2. **Short and typeable** - 7 characters, easy to type
3. **Memorable** - The "tldr" portion has strong recognition
4. **Domain available** - No established tool called "md-tldr"

### Weaknesses

1. **Major naming conflict with tldr-pages**
   - [tldr](https://tldr.sh/) is an extremely popular CLI tool (47K+ GitHub stars)
   - Users searching for "tldr" will find the wrong tool
   - Risk of confusion: "Is this related to tldr-pages?"

2. **"TLDR" connotation is limiting**
   - TLDR means "too long; didn't read" - implies simple summarization
   - Your tool does **structural extraction**, **semantic search**, **relationship mapping**
   - The name undersells sophisticated features like embeddings and backlinks

3. **Doesn't communicate key differentiators**
   - No hint of "context preparation for LLMs"
   - No indication of "semantic search"
   - No suggestion of "token optimization"

4. **Potential trademark concerns**
   - [TLDRLegal](https://www.tldrlegal.com/) holds TLDRLegal trademark
   - While "TLDR" itself is generic internet slang, compounds using it may cause confusion

### SEO/Discoverability Analysis

**Google search "md-tldr":**
- Currently returns tldr-pages documentation and unrelated content
- Would need significant SEO effort to rank

**NPM search "md-tldr":**
- No existing package with this exact name
- But proximity to popular `tldr` package may cause confusion

### Verdict

The name "md-tldr" is **serviceable but suboptimal**. It:
- Works as a memorable shorthand
- Has no direct conflicts in package registries
- But creates confusion with the dominant tldr brand
- Undersells the tool's sophisticated capabilities

---

## 5 Alternative Name Suggestions

### 1. **mdex** (Markdown + Index/Extract)
**Rationale:**
- Short (4 characters), easy to type
- "md" clearly signals markdown focus
- "-ex" suggests extraction/indexing
- Similar to successful names: `pnpm`, `deno`, `bun`
- No significant conflicts found

**Concerns:**
- May be confused with MDX (React markdown format)
- Needs to be checked for npm availability

**Tagline:** "Index markdown. Extract context. Feed LLMs."

---

### 2. **markdex** (Markdown + Index)
**Rationale:**
- More explicit than "mdex"
- "Mark" from markdown, "dex" from index
- Clear pronunciation
- Suggests its core function: indexing markdown
- 7 characters like "md-tldr" but more descriptive

**Concerns:**
- Check for existing trademarks
- Slightly longer to type

**Tagline:** "The markdown indexer for LLM context."

---

### 3. **docgist** (Documentation + Gist)
**Rationale:**
- Communicates "essence extraction" from docs
- "Gist" is developer-familiar (GitHub Gists)
- Suggests condensed, essential information
- Domain-friendly name

**Concerns:**
- May suggest GitHub Gist integration
- Doesn't explicitly convey markdown focus

**Tagline:** "The gist of your docs, for LLMs."

---

### 4. **contextmd** (Context + Markdown)
**Rationale:**
- Explicitly communicates the value proposition
- "Context" is the key outcome for LLM users
- Clear markdown focus
- Follows naming pattern of `llm-context`, `ai-context`
- 9 characters, still reasonable to type

**Concerns:**
- Longer than ideal
- "md" suffix less common than prefix

**Tagline:** "Markdown context, ready for LLMs."

---

### 5. **mdsieve** (Markdown + Sieve)
**Rationale:**
- Evokes filtering/extraction metaphor
- Suggests removing the noise, keeping the signal
- Short (7 characters)
- Unique and memorable
- Implies the 80%+ token reduction

**Concerns:**
- "Sieve" may not be universally understood
- Metaphor may not resonate with all users

**Tagline:** "Sift your markdown. Surface what matters."

---

## Name Comparison Matrix

| Name | Length | Clarity | Memorability | Conflicts | Fit with Features |
|------|--------|---------|--------------|-----------|-------------------|
| md-tldr | 7 | Medium | High | **High** (tldr-pages) | Medium |
| mdex | 4 | Medium | High | Medium (MDX?) | High |
| markdex | 7 | High | High | Low | High |
| docgist | 7 | Medium | High | Low | Medium |
| contextmd | 9 | Very High | Medium | Low | Very High |
| mdsieve | 7 | High | Medium | Low | High |

---

## Recommendation

### Primary Recommendation: **markdex**

**Why markdex wins:**
1. **Clarity without length** - Immediately suggests "markdown indexer"
2. **No naming conflicts** - Distinct from tldr, MDX, and existing tools
3. **Typeable** - 7 characters, all lowercase, no special characters
4. **Expandable** - Can naturally evolve (markdex search, markdex context)
5. **Professional** - Suitable for adoption by teams and enterprises

### Secondary Recommendation: **contextmd**

If you want to **explicitly communicate the LLM use case**, contextmd is more descriptive but slightly longer.

### Keep md-tldr If:
- You prioritize memorability over clarity
- Your primary audience already knows what TLDR means in context
- You're comfortable competing for mindshare with tldr-pages
- The tool will primarily spread through word-of-mouth (not search)

---

## Sources

### Competitor Tools
- [Repomix](https://repomix.com/) - Codebase packing tool
- [code2prompt](https://github.com/mufeedvh/code2prompt) - CLI codebase to LLM prompt
- [semtools](https://github.com/run-llama/semtools) - Semantic search CLI
- [MarkItDown](https://github.com/microsoft/markitdown) - Microsoft's document converter
- [txtai](https://github.com/neuml/txtai) - AI framework for semantic search
- [llms.txt](https://llmstxt.org/) - LLM-friendly content standard
- [ai-context](https://github.com/Tanq16/ai-context) - Multi-source context generator
- [llm-context](https://www.npmjs.com/package/llm-context) - npm package for context files
- [CTX](https://github.com/context-hub/generator) - Context management tool
- [Semantra](https://github.com/freedmand/semantra) - Semantic search multi-tool

### Naming & Branding
- [The Poetics of CLI Command Names](https://smallstep.com/blog/the-poetics-of-cli-command-names/) - Best practices for CLI naming
- [Command Line Interface Guidelines](https://clig.dev/) - Comprehensive CLI design guide
- [tldr-pages](https://github.com/tldr-pages/tldr) - The competing tldr project
- [Programmers and software developers lost the plot on naming their tools](https://larr.net/p/namings.html) - Critique of naming conventions

### Token Optimization
- [Chunking Strategies for LLM Applications](https://www.pinecone.io/learn/chunking-strategies/) - Pinecone guide
- [5 AI Context Window Optimization Techniques](https://airbyte.com/agentic-data/ai-context-window-optimization-techniques) - Airbyte analysis
- [36 Alternatives to LLM Context](https://www.cyberchitta.cc/articles/lc-alternatives.html) - Comprehensive tool comparison
- [Context is king: tools for feeding your code and website to LLMs](https://workos.com/blog/context-is-king-tools-for-feeding-your-code-and-website-to-llms) - WorkOS analysis

### Document Processing
- [Why Markdown is the best format for LLMs](https://medium.com/@wetrocloud/why-markdown-is-the-best-format-for-llms-aa0514a409a7) - Wetrocloud analysis
- [Why Your LLM Needs Clean Markdown](https://anythingmd.com/blog/why-llms-need-clean-markdown) - AnythingMD guide
- [RAG/LLM and PDF: Conversion to Markdown](https://artifex.com/blog/rag-llm-and-pdf-conversion-to-markdown-text-with-pymupdf) - PyMuPDF guide

---

*Research conducted using web search as of January 2026. Tool availability and features may have changed.*
