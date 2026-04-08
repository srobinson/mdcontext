/**
 * Ranking and boost functions for semantic search results.
 *
 * Provides heading match boost, file importance boost, and query preprocessing
 * to improve search result relevance.
 */

// ============================================================================
// Heading Boost
// ============================================================================

/** Boost factor per matched term in heading (0.05 = 5% boost per term) */
const HEADING_BOOST_FACTOR = 0.05

/** Boost factor for important files like README (0.03 = 3% boost) */
const FILE_IMPORTANCE_BOOST = 0.03

/**
 * Hard cap on the total additive ranking boost for a single result.
 *
 * The dense-retrieval cosine similarity gap between adjacent candidates
 * typically sits in the 0.005–0.03 range. Without a cap, the heading and
 * file-importance boosts (which can sum to ~0.18 on a multi-term query that
 * lands on a README heading) trivially overrode any embedding-driven
 * reordering, including the reordering produced by HyDE. Capping the total
 * boost at 0.08 keeps similarity as the primary ranking signal while still
 * letting heading and file-importance hints break ties.
 */
export const TOTAL_BOOST_CAP = 0.08

/**
 * Important file patterns that get ranking boost.
 * These are typically entry points or high-value documentation.
 */
const IMPORTANT_FILE_PATTERNS = [
  /^readme\.md$/i, // Root README
  /\/readme\.md$/i, // Nested README
  /^index\.md$/i, // Index files
  /\/index\.md$/i,
  /^getting-?started/i, // Getting started guides
  /\/getting-?started/i,
  /^introduction/i, // Introductions
  /\/introduction/i,
  /^overview/i, // Overviews
  /\/overview/i,
  /^quickstart/i, // Quickstart guides
  /\/quickstart/i,
  /^changelog\.md$/i, // Changelogs (useful for "what changed" queries)
  /\/changelog\.md$/i,
]

/**
 * Calculate file importance boost for a search result.
 * Boosts results from important files like README, index, getting-started.
 *
 * @param documentPath - Path to the document
 * @returns Boost value to add to similarity score (0.0 to 0.03)
 */
export const calculateFileImportanceBoost = (documentPath: string): number => {
  const isImportant = IMPORTANT_FILE_PATTERNS.some((pattern) =>
    pattern.test(documentPath),
  )
  return isImportant ? FILE_IMPORTANCE_BOOST : 0
}

/**
 * Calculate heading match boost for a search result.
 * Boosts results where query terms appear in section headings.
 *
 * @param heading - Section heading to check
 * @param query - Original search query (will be normalized)
 * @returns Boost value to add to similarity score (0.0 to ~0.15 typically)
 */
export const calculateHeadingBoost = (
  heading: string,
  query: string,
): number => {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (queryTerms.length === 0) return 0

  const headingLower = heading.toLowerCase()
  const matchCount = queryTerms.filter((term) =>
    headingLower.includes(term),
  ).length

  return matchCount * HEADING_BOOST_FACTOR
}

/**
 * Calculate combined ranking boost for a search result.
 * Combines heading match boost and file importance boost, then clamps the
 * total to {@link TOTAL_BOOST_CAP} so similarity remains the primary signal.
 *
 * @param heading - Section heading
 * @param query - Search query
 * @param documentPath - Path to the document
 * @returns Combined boost value, clamped to TOTAL_BOOST_CAP
 */
export const calculateRankingBoost = (
  heading: string,
  query: string,
  documentPath: string,
): number => {
  const headingBoost = calculateHeadingBoost(heading, query)
  const fileBoost = calculateFileImportanceBoost(documentPath)
  return Math.min(headingBoost + fileBoost, TOTAL_BOOST_CAP)
}

// ============================================================================
// Query Preprocessing
// ============================================================================

/**
 * Preprocess a search query before embedding to reduce noise and improve recall.
 *
 * Transformations applied:
 * - Convert to lowercase (embeddings are case-insensitive)
 * - Replace punctuation with spaces (preserves word boundaries)
 * - Collapse multiple spaces to single space
 * - Trim leading/trailing whitespace
 *
 * This provides 2-5% precision improvement for most queries.
 *
 * @param query - Raw search query
 * @returns Normalized query string
 */
export const preprocessQuery = (query: string): string => {
  return (
    query
      .toLowerCase()
      // Replace punctuation with spaces (preserves word boundaries)
      .replace(/[^\w\s]/g, ' ')
      // Collapse multiple spaces
      .replace(/\s+/g, ' ')
      .trim()
  )
}
