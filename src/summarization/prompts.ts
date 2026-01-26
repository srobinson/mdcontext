/**
 * Prompt Templates for Search Result Summarization
 *
 * These prompts are designed to transform raw search results
 * into actionable insights for developers.
 */

/**
 * Available prompt templates for different summarization styles.
 */
export type PromptTemplate =
  | 'default'
  | 'concise'
  | 'detailed'
  | 'actionable'
  | 'technical'

/**
 * Context about the search that generated these results.
 */
export interface SearchContext {
  /** The original search query */
  readonly query: string
  /** Number of results found */
  readonly resultCount: number
  /** Search mode used */
  readonly searchMode: 'hybrid' | 'semantic' | 'keyword'
}

/**
 * Default prompt for summarizing search results.
 *
 * Designed to produce actionable, developer-focused insights.
 */
export const DEFAULT_PROMPT = `You are summarizing search results from a markdown documentation search tool.

Your task: Synthesize these results into actionable insights that help the developer understand the relevant content.

Guidelines:
- Focus on answering the user's implicit question
- Highlight the most relevant sections and their key points
- Note any patterns or connections between results
- Be concise but comprehensive
- Use bullet points for clarity
- If results seem incomplete, suggest what else the user might search for

Format your response as:
1. A brief summary (2-3 sentences)
2. Key findings (bullet points)
3. Recommended next steps (if applicable)`

/**
 * Concise prompt for quick summaries.
 */
export const CONCISE_PROMPT = `Summarize these search results in 2-3 sentences. Focus only on the most important findings that directly answer the query.`

/**
 * Detailed prompt for comprehensive analysis.
 */
export const DETAILED_PROMPT = `Provide a comprehensive analysis of these search results.

Include:
1. Executive summary (3-4 sentences)
2. Detailed findings organized by topic
3. Key code patterns or examples mentioned
4. Relationships between different sections
5. Gaps or areas that need more exploration
6. Specific file references for follow-up`

/**
 * Actionable prompt focused on next steps.
 */
export const ACTIONABLE_PROMPT = `Analyze these search results and provide:

1. What the developer is likely trying to accomplish
2. The specific steps they should take based on these results
3. Any code snippets or patterns they should use
4. Potential pitfalls to avoid
5. Related areas they might want to explore

Be direct and practical.`

/**
 * Technical prompt for code-focused analysis.
 */
export const TECHNICAL_PROMPT = `Analyze these search results from a technical perspective.

Focus on:
- Code patterns and implementations mentioned
- API signatures and usage
- Configuration options
- Dependencies and requirements
- Best practices and anti-patterns

Provide concrete technical guidance.`

/**
 * Get a prompt template by name.
 */
export const getPromptTemplate = (template: PromptTemplate): string => {
  switch (template) {
    case 'concise':
      return CONCISE_PROMPT
    case 'detailed':
      return DETAILED_PROMPT
    case 'actionable':
      return ACTIONABLE_PROMPT
    case 'technical':
      return TECHNICAL_PROMPT
    default:
      return DEFAULT_PROMPT
  }
}

/**
 * Build a complete prompt with search context.
 */
export const buildPrompt = (
  context: SearchContext,
  template: PromptTemplate = 'default',
): string => {
  const basePrompt = getPromptTemplate(template)

  return `${basePrompt}

---
Query: "${context.query}"
Results found: ${context.resultCount}
Search mode: ${context.searchMode}
---

Search Results:`
}
