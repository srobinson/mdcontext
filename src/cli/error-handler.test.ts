/**
 * Unit tests for CLI error handler
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { formatEffectCliError } from './error-handler.js'

describe('formatEffectCliError', () => {
  let originalArgv: string[]

  beforeEach(() => {
    originalArgv = process.argv
  })

  afterEach(() => {
    process.argv = originalArgv
  })

  describe('mode validation errors with suggestions', () => {
    it('suggests "semantic" for "semantics"', () => {
      process.argv = ['node', 'cli', 'search', '--mode', 'semantics', 'test']

      const error = {
        _tag: 'ValidationError',
        error: {
          _tag: 'Paragraph',
          value: {
            _tag: 'Text',
            value:
              'Expected one of the following cases: hybrid, semantic, keyword',
          },
        },
      }

      const result = formatEffectCliError(error)
      expect(result).toContain("Did you mean '--mode semantic'?")
    })

    it('suggests "keyword" for "keywords"', () => {
      process.argv = ['node', 'cli', 'search', '--mode', 'keywords', 'test']

      const error = {
        _tag: 'ValidationError',
        error: {
          _tag: 'Paragraph',
          value: {
            _tag: 'Text',
            value:
              'Expected one of the following cases: hybrid, semantic, keyword',
          },
        },
      }

      const result = formatEffectCliError(error)
      expect(result).toContain("Did you mean '--mode keyword'?")
    })

    it('suggests "hybrid" for "hybrit"', () => {
      process.argv = ['node', 'cli', 'search', '--mode', 'hybrit', 'test']

      const error = {
        _tag: 'ValidationError',
        error: {
          _tag: 'Paragraph',
          value: {
            _tag: 'Text',
            value:
              'Expected one of the following cases: hybrid, semantic, keyword',
          },
        },
      }

      const result = formatEffectCliError(error)
      expect(result).toContain("Did you mean '--mode hybrid'?")
    })

    it('suggests "semantic" for "semant"', () => {
      process.argv = ['node', 'cli', 'search', '--mode', 'semant', 'test']

      const error = {
        _tag: 'ValidationError',
        error: {
          _tag: 'Paragraph',
          value: {
            _tag: 'Text',
            value:
              'Expected one of the following cases: hybrid, semantic, keyword',
          },
        },
      }

      const result = formatEffectCliError(error)
      expect(result).toContain("Did you mean '--mode semantic'?")
    })

    it('suggests "keyword" for "keywordd"', () => {
      process.argv = ['node', 'cli', 'search', '--mode', 'keywordd', 'test']

      const error = {
        _tag: 'ValidationError',
        error: {
          _tag: 'Paragraph',
          value: {
            _tag: 'Text',
            value:
              'Expected one of the following cases: hybrid, semantic, keyword',
          },
        },
      }

      const result = formatEffectCliError(error)
      expect(result).toContain("Did you mean '--mode keyword'?")
    })

    it('does not suggest for typos too far off', () => {
      process.argv = ['node', 'cli', 'search', '--mode', 'xyz', 'test']

      const error = {
        _tag: 'ValidationError',
        error: {
          _tag: 'Paragraph',
          value: {
            _tag: 'Text',
            value:
              'Expected one of the following cases: hybrid, semantic, keyword',
          },
        },
      }

      const result = formatEffectCliError(error)
      expect(result).not.toContain('Did you mean')
    })

    it('handles --mode=value syntax', () => {
      process.argv = ['node', 'cli', 'search', '--mode=semantics', 'test']

      const error = {
        _tag: 'ValidationError',
        error: {
          _tag: 'Paragraph',
          value: {
            _tag: 'Text',
            value:
              'Expected one of the following cases: hybrid, semantic, keyword',
          },
        },
      }

      const result = formatEffectCliError(error)
      expect(result).toContain("Did you mean '--mode semantic'?")
    })

    it('handles -m short flag', () => {
      process.argv = ['node', 'cli', 'search', '-m', 'semantics', 'test']

      const error = {
        _tag: 'ValidationError',
        error: {
          _tag: 'Paragraph',
          value: {
            _tag: 'Text',
            value:
              'Expected one of the following cases: hybrid, semantic, keyword',
          },
        },
      }

      const result = formatEffectCliError(error)
      expect(result).toContain("Did you mean '--mode semantic'?")
    })

    it('does not suggest for non-mode validation errors', () => {
      process.argv = ['node', 'cli', 'search', 'test']

      const error = {
        _tag: 'ValidationError',
        error: {
          _tag: 'Paragraph',
          value: {
            _tag: 'Text',
            value: 'Some other validation error',
          },
        },
      }

      const result = formatEffectCliError(error)
      expect(result).toBe('Some other validation error')
      expect(result).not.toContain('Did you mean')
    })
  })

  describe('other error types', () => {
    it('handles MissingValue errors', () => {
      process.argv = ['node', 'cli', 'search']

      const error = {
        _tag: 'MissingValue',
        error: {
          _tag: 'Paragraph',
          value: {
            _tag: 'Text',
            value: 'Missing required argument',
          },
        },
      }

      const result = formatEffectCliError(error)
      expect(result).toBe('Missing required argument')
    })

    it('handles InvalidValue errors', () => {
      process.argv = ['node', 'cli', 'search']

      const error = {
        _tag: 'InvalidValue',
        error: {
          _tag: 'Paragraph',
          value: {
            _tag: 'Text',
            value: 'Invalid value provided',
          },
        },
      }

      const result = formatEffectCliError(error)
      expect(result).toBe('Invalid value provided')
    })

    it('handles unknown error types', () => {
      const error = { message: 'Unknown error' }
      const result = formatEffectCliError(error)
      expect(result).toBe('[object Object]')
    })
  })
})
