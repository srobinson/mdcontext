# Query Processing Analysis

## Executive Summary

Query processing is **minimal and appropriate**. The query text is passed directly to the embedding API without modification. This is correct behavior for OpenAI's text-embedding-3-small model, which handles text normalization internally.

The asymmetry between query format (plain text) and document format (text with metadata) does NOT cause issues - embedding models are designed for this asymmetric retrieval pattern.

## Query Flow

```
User Input
    │
    ▼
CLI Parser (search.ts)
    │ query string unchanged
    ▼
semanticSearch(rootPath, query, options)
    │ query string unchanged
    ▼
provider.embed([query])
    │ passed directly to API
    ▼
OpenAI Embeddings API
    │ returns 512-dimensional vector
    ▼
Vector Store search()
    │ cosine similarity comparison
    ▼
Results filtered by threshold
```

## Code Trace

### Entry Point: CLI

```typescript
// src/cli/commands/search.ts:53-55
query: Args.text({ name: 'query' }).pipe(
  Args.withDescription('Search query (natural language or regex pattern)'),
),
```

The query enters as a raw text string, no preprocessing.

### Search Mode Detection

```typescript
// src/cli/commands/search.ts:201-206
} else if (isAdvancedQuery(query)) {
  effectiveMode = 'keyword'
  modeReason = 'boolean/phrase pattern detected'
} else if (isRegexPattern(query)) {
  effectiveMode = 'keyword'
  modeReason = 'regex pattern detected'
}
```

Queries with boolean operators (AND, OR, NOT) or quoted phrases are routed to keyword search. Plain multi-word queries go to semantic search.

### Semantic Search Function

```typescript
// src/embeddings/semantic-search.ts:558-559
// Embed the query
const queryResult = yield* wrapEmbedding(provider.embed([query]))
```

**No preprocessing** - query is embedded exactly as received.

### Embedding API Call

```typescript
// src/embeddings/openai-provider.ts:175-179
const response = await this.client.embeddings.create({
  model: this.model,
  input: batch,  // query text passed directly
  dimensions: 512,
})
```

Query text goes directly to OpenAI API without modification.

## Query vs Document Format Asymmetry

### Document Embedding Format (from ALP-204)

```
# {heading}
Parent section: {parentHeading}
Document: {documentTitle}

{content}
```

### Query Format

```
{raw query text}
```

### Analysis

This asymmetry is **intentional and correct** for semantic search:

1. **Embedding models handle asymmetry**: OpenAI's text-embedding models are trained on diverse text formats. They produce semantically meaningful vectors regardless of format.

2. **Query expansion is not needed**: The embedding model understands "failure automation" conceptually - it doesn't need to see `# Failure Automation` format.

3. **Document context helps disambiguation**: The heading/document metadata in indexed content helps distinguish between sections with similar content but different contexts.

4. **Industry standard practice**: Most RAG systems use plain queries against enriched documents.

## Query Variation Tests

All variations produce semantically similar results:

| Query | Top Result | Similarity |
|-------|------------|------------|
| "failure automation" | Best Practices | 61.6% |
| "failure-automation" | Overview | 68.8% |
| "Failure Automation" | Best Practices | 65.6% |
| "automation for failures" | Overview | 70.3% |
| "how to automate failure handling" | Best Practices | 66.4% |

**Findings:**
- Casing doesn't significantly affect results
- Hyphenation produces slightly different top result
- Word order matters but doesn't break search
- Natural language queries work well

## Threshold Analysis

### Default Threshold Flow

```
CLI default: 0.45
    │
    ▼ (if CLI uses default)
Config default: 0.5
    │
    ▼
Effective threshold: 0.5
```

When user doesn't specify `--threshold`, the effective value is 0.5 from config.

### Threshold Impact

| Threshold | Single-word "failure" | Multi-word "failure automation" |
|-----------|----------------------|--------------------------------|
| 0.5 | 0 results | 7 results |
| 0.3 | 10 results | 7+ results |
| 0.1 | 10 results | 7+ results |

The 0.5 threshold filters out low-similarity single-word matches while allowing relevant multi-word matches through.

## Potential Query Enhancements (for ALP-207)

While current processing is correct, potential improvements could include:

### 1. Query Expansion for Short Queries

```typescript
// Hypothetical enhancement
const enhancedQuery = query.split(' ').length <= 2
  ? `Find content about: ${query}`
  : query
```

### 2. Adaptive Threshold

```typescript
// Lower threshold for shorter queries
const adaptiveThreshold = query.split(' ').length <= 1
  ? 0.3
  : options.threshold ?? 0.5
```

### 3. Hybrid by Default

Short queries might benefit from hybrid mode being the default, leveraging both keyword and semantic signals.

## Recommendations

### No Changes Needed to Query Processing

The current implementation is correct. The query flow is:
- Clean (no unnecessary transformations)
- Transparent (what you type is what gets embedded)
- Flexible (users can adjust with --threshold)

### Focus Areas for ALP-207

1. **Threshold tuning** - Consider lowering default to 0.4 or making it adaptive
2. **Better feedback** - Show "X results below threshold" when 0 results
3. **Documentation** - Explain threshold behavior in help text
4. **Hybrid default** - Consider hybrid mode as default for better coverage

## Conclusion

Query processing is implemented correctly. The perceived "multi-word query failures" are actually threshold calibration issues, not query processing bugs. The search correctly:

1. Passes queries unchanged to embedding API (correct)
2. Uses asymmetric retrieval (query vs enriched documents) (correct)
3. Handles query variations semantically (working)
4. Applies configurable threshold (working, but may need tuning)
