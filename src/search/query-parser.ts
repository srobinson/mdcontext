/**
 * Query Parser for md-tldr search
 *
 * Supports:
 * - Boolean operators: AND, OR, NOT (case-insensitive)
 * - Quoted phrases: "exact phrase"
 * - Grouping: (term1 OR term2) AND term3
 * - Precedence: NOT > AND > OR
 */

// ============================================================================
// Types
// ============================================================================

export type QueryNode =
  | { type: 'term'; value: string }
  | { type: 'phrase'; value: string }
  | { type: 'and'; left: QueryNode; right: QueryNode }
  | { type: 'or'; left: QueryNode; right: QueryNode }
  | { type: 'not'; operand: QueryNode }

export interface ParsedQuery {
  readonly ast: QueryNode
  readonly terms: readonly string[]
  readonly phrases: readonly string[]
}

// ============================================================================
// Tokenizer
// ============================================================================

type TokenType = 'AND' | 'OR' | 'NOT' | 'LPAREN' | 'RPAREN' | 'PHRASE' | 'TERM'

interface Token {
  type: TokenType
  value: string
}

/**
 * Tokenize query string into tokens
 */
const tokenize = (query: string): Token[] => {
  const tokens: Token[] = []
  let i = 0

  while (i < query.length) {
    // Skip whitespace
    if (/\s/.test(query[i]!)) {
      i++
      continue
    }

    // Quoted phrase
    if (query[i] === '"') {
      const start = i + 1
      i++
      while (i < query.length && query[i] !== '"') {
        i++
      }
      const value = query.slice(start, i)
      tokens.push({ type: 'PHRASE', value })
      i++ // Skip closing quote
      continue
    }

    // Parentheses
    if (query[i] === '(') {
      tokens.push({ type: 'LPAREN', value: '(' })
      i++
      continue
    }
    if (query[i] === ')') {
      tokens.push({ type: 'RPAREN', value: ')' })
      i++
      continue
    }

    // Words (operators or terms)
    const wordMatch = query.slice(i).match(/^[^\s()"]+/)
    if (wordMatch) {
      const word = wordMatch[0]
      const upperWord = word.toUpperCase()

      if (upperWord === 'AND') {
        tokens.push({ type: 'AND', value: 'AND' })
      } else if (upperWord === 'OR') {
        tokens.push({ type: 'OR', value: 'OR' })
      } else if (upperWord === 'NOT') {
        tokens.push({ type: 'NOT', value: 'NOT' })
      } else {
        tokens.push({ type: 'TERM', value: word })
      }
      i += word.length
      continue
    }

    // Unknown character, skip
    i++
  }

  return tokens
}

// ============================================================================
// Parser (Recursive Descent)
// ============================================================================

/**
 * Parser for boolean query expressions.
 * Grammar:
 *   expr     -> andExpr (OR andExpr)*
 *   andExpr  -> notExpr (AND notExpr)*
 *   notExpr  -> NOT notExpr | primary
 *   primary  -> TERM | PHRASE | LPAREN expr RPAREN
 */
class Parser {
  private tokens: Token[]
  private pos: number = 0
  readonly terms: string[] = []
  readonly phrases: string[] = []

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private current(): Token | undefined {
    return this.tokens[this.pos]
  }

  private advance(): Token | undefined {
    return this.tokens[this.pos++]
  }

  private match(type: TokenType): boolean {
    if (this.current()?.type === type) {
      this.advance()
      return true
    }
    return false
  }

  parse(): QueryNode | null {
    if (this.tokens.length === 0) {
      return null
    }
    return this.parseExpr()
  }

  private parseExpr(): QueryNode {
    let left = this.parseAndExpr()

    while (this.match('OR')) {
      const right = this.parseAndExpr()
      left = { type: 'or', left, right }
    }

    return left
  }

  private parseAndExpr(): QueryNode {
    let left = this.parseNotExpr()

    // Handle implicit AND (terms without explicit AND between them)
    while (this.match('AND') || this.isImplicitAnd()) {
      const right = this.parseNotExpr()
      left = { type: 'and', left, right }
    }

    return left
  }

  private isImplicitAnd(): boolean {
    const tok = this.current()
    // If next token is a TERM, PHRASE, NOT, or LPAREN, treat as implicit AND
    return (
      tok?.type === 'TERM' ||
      tok?.type === 'PHRASE' ||
      tok?.type === 'NOT' ||
      tok?.type === 'LPAREN'
    )
  }

  private parseNotExpr(): QueryNode {
    if (this.match('NOT')) {
      const operand = this.parseNotExpr()
      return { type: 'not', operand }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): QueryNode {
    const tok = this.current()

    if (this.match('LPAREN')) {
      const expr = this.parseExpr()
      this.match('RPAREN') // Consume closing paren (ignore if missing)
      return expr
    }

    if (tok?.type === 'PHRASE') {
      this.advance()
      this.phrases.push(tok.value)
      return { type: 'phrase', value: tok.value }
    }

    if (tok?.type === 'TERM') {
      this.advance()
      this.terms.push(tok.value)
      return { type: 'term', value: tok.value }
    }

    // Unexpected token, return empty term
    return { type: 'term', value: '' }
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse a search query into an AST
 */
export const parseQuery = (query: string): ParsedQuery | null => {
  const tokens = tokenize(query)
  if (tokens.length === 0) {
    return null
  }

  const parser = new Parser(tokens)
  const ast = parser.parse()

  if (!ast) {
    return null
  }

  return {
    ast,
    terms: parser.terms,
    phrases: parser.phrases,
  }
}

/**
 * Check if a query contains boolean operators or phrases
 */
export const isAdvancedQuery = (query: string): boolean => {
  const tokens = tokenize(query)
  return tokens.some(
    (t) =>
      t.type === 'AND' ||
      t.type === 'OR' ||
      t.type === 'NOT' ||
      t.type === 'PHRASE' ||
      t.type === 'LPAREN',
  )
}

/**
 * Evaluate a parsed query against text content
 * Returns true if the text matches the query
 */
export const evaluateQuery = (ast: QueryNode, text: string): boolean => {
  const lowerText = text.toLowerCase()

  const evaluate = (node: QueryNode): boolean => {
    switch (node.type) {
      case 'term': {
        // Empty term matches anything
        if (!node.value) return true
        return lowerText.includes(node.value.toLowerCase())
      }
      case 'phrase': {
        // Phrase must match exactly (case-insensitive)
        return lowerText.includes(node.value.toLowerCase())
      }
      case 'and': {
        return evaluate(node.left) && evaluate(node.right)
      }
      case 'or': {
        return evaluate(node.left) || evaluate(node.right)
      }
      case 'not': {
        return !evaluate(node.operand)
      }
    }
  }

  return evaluate(ast)
}

/**
 * Build a regex pattern from a parsed query for highlighting matches
 * This creates a pattern that matches any of the terms/phrases
 */
export const buildHighlightPattern = (parsed: ParsedQuery): RegExp => {
  const patterns: string[] = []

  // Escape special regex chars
  const escapeChars = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  for (const term of parsed.terms) {
    if (term) {
      patterns.push(`\\b${escapeChars(term)}\\b`)
    }
  }

  for (const phrase of parsed.phrases) {
    if (phrase) {
      patterns.push(escapeChars(phrase))
    }
  }

  if (patterns.length === 0) {
    return /.^/ // Match nothing
  }

  return new RegExp(patterns.join('|'), 'gi')
}
