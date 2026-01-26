# Prototype Results: AI Summarization

## Status: Ready for Testing

The prototype script has been created at `scripts/prototype-summarization.ts`.

## How to Run

```bash
# Run with default test queries
npx tsx scripts/prototype-summarization.ts

# Run with custom query
npx tsx scripts/prototype-summarization.ts "your query here"
```

## Prerequisites

1. Claude CLI installed and authenticated
2. Project built: `just build`
3. Index created: `mdcontext index .`

## Test Queries

The prototype tests these queries by default:
- "error handling"
- "configuration"
- "search"
- "embeddings"
- "Effect patterns"

## Expected Output

The script will:
1. Run mdcontext search for each query
2. Format results for the LLM
3. Call Claude CLI to generate a summary
4. Display and save results to this file

## Results

*Results will be populated when the prototype is run.*

---

## Validation Criteria

For each query, assess:
- **Accuracy (1-5):** Does summary match actual code?
- **Completeness (1-5):** Does it cover key points?
- **Actionability (1-5):** Can user find what they need?
- **Conciseness (1-5):** Is it digestible?

## Findings

*To be filled in after running prototype.*
