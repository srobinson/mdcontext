/**
 * Tests for query parser
 */

import { describe, expect, it } from 'vitest'
import {
  buildHighlightPattern,
  evaluateQuery,
  isAdvancedQuery,
  parseQuery,
  type QueryNode,
} from './query-parser.js'

describe('query-parser', () => {
  describe('parseQuery', () => {
    it('should parse a single term', () => {
      const result = parseQuery('auth')
      expect(result).not.toBeNull()
      expect(result!.ast).toEqual({ type: 'term', value: 'auth' })
      expect(result!.terms).toEqual(['auth'])
    })

    it('should parse a quoted phrase', () => {
      const result = parseQuery('"context resumption"')
      expect(result).not.toBeNull()
      expect(result!.ast).toEqual({
        type: 'phrase',
        value: 'context resumption',
      })
      expect(result!.phrases).toEqual(['context resumption'])
    })

    it('should parse AND operator', () => {
      const result = parseQuery('auth AND criticism')
      expect(result).not.toBeNull()
      expect(result!.ast).toEqual({
        type: 'and',
        left: { type: 'term', value: 'auth' },
        right: { type: 'term', value: 'criticism' },
      })
    })

    it('should parse OR operator', () => {
      const result = parseQuery('checkpoint OR gate')
      expect(result).not.toBeNull()
      expect(result!.ast).toEqual({
        type: 'or',
        left: { type: 'term', value: 'checkpoint' },
        right: { type: 'term', value: 'gate' },
      })
    })

    it('should parse NOT operator', () => {
      const result = parseQuery('implementation NOT example')
      expect(result).not.toBeNull()
      // "implementation NOT example" is parsed as: implementation AND (NOT example)
      expect(result!.ast).toEqual({
        type: 'and',
        left: { type: 'term', value: 'implementation' },
        right: { type: 'not', operand: { type: 'term', value: 'example' } },
      })
    })

    it('should parse grouped expressions', () => {
      const result = parseQuery('auth AND (error OR bug)')
      expect(result).not.toBeNull()
      expect(result!.ast).toEqual({
        type: 'and',
        left: { type: 'term', value: 'auth' },
        right: {
          type: 'or',
          left: { type: 'term', value: 'error' },
          right: { type: 'term', value: 'bug' },
        },
      })
    })

    it('should handle case-insensitive operators', () => {
      const result1 = parseQuery('auth and criticism')
      const result2 = parseQuery('auth And criticism')
      expect(result1!.ast).toEqual(result2!.ast)
    })

    it('should parse phrase combined with boolean', () => {
      const result = parseQuery('"context resumption" AND drift')
      expect(result).not.toBeNull()
      expect(result!.ast).toEqual({
        type: 'and',
        left: { type: 'phrase', value: 'context resumption' },
        right: { type: 'term', value: 'drift' },
      })
    })

    it('should parse implicit AND between terms', () => {
      const result = parseQuery('auth error')
      expect(result).not.toBeNull()
      expect(result!.ast).toEqual({
        type: 'and',
        left: { type: 'term', value: 'auth' },
        right: { type: 'term', value: 'error' },
      })
    })

    it('should respect operator precedence (NOT > AND > OR)', () => {
      // "a OR b AND NOT c" should parse as "a OR (b AND (NOT c))"
      const result = parseQuery('a OR b AND NOT c')
      expect(result).not.toBeNull()
      expect(result!.ast).toEqual({
        type: 'or',
        left: { type: 'term', value: 'a' },
        right: {
          type: 'and',
          left: { type: 'term', value: 'b' },
          right: { type: 'not', operand: { type: 'term', value: 'c' } },
        },
      })
    })

    it('should return null for empty query', () => {
      expect(parseQuery('')).toBeNull()
      expect(parseQuery('   ')).toBeNull()
    })
  })

  describe('isAdvancedQuery', () => {
    it('should return false for simple terms', () => {
      expect(isAdvancedQuery('auth')).toBe(false)
      expect(isAdvancedQuery('some term')).toBe(false)
    })

    it('should return true for boolean operators', () => {
      expect(isAdvancedQuery('auth AND error')).toBe(true)
      expect(isAdvancedQuery('auth OR error')).toBe(true)
      expect(isAdvancedQuery('auth NOT error')).toBe(true)
    })

    it('should return true for phrases', () => {
      expect(isAdvancedQuery('"exact phrase"')).toBe(true)
    })

    it('should return true for grouped expressions', () => {
      expect(isAdvancedQuery('(a OR b)')).toBe(true)
    })
  })

  describe('evaluateQuery', () => {
    const text = 'This is about authentication errors and bug fixes'

    it('should match single term', () => {
      const ast: QueryNode = { type: 'term', value: 'authentication' }
      expect(evaluateQuery(ast, text)).toBe(true)
    })

    it('should not match missing term', () => {
      const ast: QueryNode = { type: 'term', value: 'security' }
      expect(evaluateQuery(ast, text)).toBe(false)
    })

    it('should match phrase', () => {
      const ast: QueryNode = { type: 'phrase', value: 'authentication errors' }
      expect(evaluateQuery(ast, text)).toBe(true)
    })

    it('should not match partial phrase', () => {
      const ast: QueryNode = { type: 'phrase', value: 'authentication bug' }
      expect(evaluateQuery(ast, text)).toBe(false)
    })

    it('should evaluate AND correctly', () => {
      const ast: QueryNode = {
        type: 'and',
        left: { type: 'term', value: 'authentication' },
        right: { type: 'term', value: 'bug' },
      }
      expect(evaluateQuery(ast, text)).toBe(true)

      const ast2: QueryNode = {
        type: 'and',
        left: { type: 'term', value: 'authentication' },
        right: { type: 'term', value: 'security' },
      }
      expect(evaluateQuery(ast2, text)).toBe(false)
    })

    it('should evaluate OR correctly', () => {
      const ast: QueryNode = {
        type: 'or',
        left: { type: 'term', value: 'authentication' },
        right: { type: 'term', value: 'security' },
      }
      expect(evaluateQuery(ast, text)).toBe(true)

      const ast2: QueryNode = {
        type: 'or',
        left: { type: 'term', value: 'crypto' },
        right: { type: 'term', value: 'security' },
      }
      expect(evaluateQuery(ast2, text)).toBe(false)
    })

    it('should evaluate NOT correctly', () => {
      const ast: QueryNode = {
        type: 'not',
        operand: { type: 'term', value: 'security' },
      }
      expect(evaluateQuery(ast, text)).toBe(true)

      const ast2: QueryNode = {
        type: 'not',
        operand: { type: 'term', value: 'authentication' },
      }
      expect(evaluateQuery(ast2, text)).toBe(false)
    })

    it('should be case-insensitive', () => {
      const ast: QueryNode = { type: 'term', value: 'AUTHENTICATION' }
      expect(evaluateQuery(ast, text)).toBe(true)
    })

    it('should handle complex nested expressions', () => {
      // (auth AND bug) OR (error AND NOT fixes)
      const ast: QueryNode = {
        type: 'or',
        left: {
          type: 'and',
          left: { type: 'term', value: 'auth' },
          right: { type: 'term', value: 'bug' },
        },
        right: {
          type: 'and',
          left: { type: 'term', value: 'error' },
          right: { type: 'not', operand: { type: 'term', value: 'fixes' } },
        },
      }
      expect(evaluateQuery(ast, text)).toBe(true)
    })
  })

  describe('buildHighlightPattern', () => {
    it('should create pattern from terms', () => {
      const parsed = parseQuery('auth error')!
      const pattern = buildHighlightPattern(parsed)
      expect(pattern.test('authentication error')).toBe(true)
      expect(pattern.test('no match here')).toBe(false)
    })

    it('should create pattern from phrases', () => {
      const parsed = parseQuery('"exact phrase"')!
      const pattern = buildHighlightPattern(parsed)
      expect(pattern.test('this is the exact phrase here')).toBe(true)
    })

    it('should escape special regex characters', () => {
      const parsed = parseQuery('"test.value"')!
      const pattern = buildHighlightPattern(parsed)
      expect(pattern.test('has test.value inside')).toBe(true)
      expect(pattern.test('has testXvalue inside')).toBe(false) // . should not match any char
    })
  })
})
