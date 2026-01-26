import { describe, expect, it } from 'vitest'
import {
  ACTIONABLE_PROMPT,
  buildPrompt,
  CONCISE_PROMPT,
  DEFAULT_PROMPT,
  DETAILED_PROMPT,
  getPromptTemplate,
  type PromptTemplate,
  type SearchContext,
  TECHNICAL_PROMPT,
} from './prompts.js'

describe('prompts', () => {
  describe('getPromptTemplate', () => {
    it('returns DEFAULT_PROMPT for "default" template', () => {
      expect(getPromptTemplate('default')).toBe(DEFAULT_PROMPT)
    })

    it('returns CONCISE_PROMPT for "concise" template', () => {
      expect(getPromptTemplate('concise')).toBe(CONCISE_PROMPT)
    })

    it('returns DETAILED_PROMPT for "detailed" template', () => {
      expect(getPromptTemplate('detailed')).toBe(DETAILED_PROMPT)
    })

    it('returns ACTIONABLE_PROMPT for "actionable" template', () => {
      expect(getPromptTemplate('actionable')).toBe(ACTIONABLE_PROMPT)
    })

    it('returns TECHNICAL_PROMPT for "technical" template', () => {
      expect(getPromptTemplate('technical')).toBe(TECHNICAL_PROMPT)
    })

    it('returns DEFAULT_PROMPT as fallback for unknown template', () => {
      const unknownTemplate = 'unknown' as PromptTemplate
      expect(getPromptTemplate(unknownTemplate)).toBe(DEFAULT_PROMPT)
    })
  })

  describe('buildPrompt', () => {
    const baseContext: SearchContext = {
      query: 'test query',
      resultCount: 5,
      searchMode: 'hybrid',
    }

    it('includes the base prompt template in output', () => {
      const result = buildPrompt(baseContext)
      expect(result).toContain(DEFAULT_PROMPT)
    })

    it('includes the query in output', () => {
      const result = buildPrompt(baseContext)
      expect(result).toContain('Query: "test query"')
    })

    it('includes result count in output', () => {
      const result = buildPrompt(baseContext)
      expect(result).toContain('Results found: 5')
    })

    it('includes search mode in output', () => {
      const result = buildPrompt(baseContext)
      expect(result).toContain('Search mode: hybrid')
    })

    it('uses default template when not specified', () => {
      const result = buildPrompt(baseContext)
      expect(result).toContain(DEFAULT_PROMPT)
    })

    it('uses specified template when provided', () => {
      const result = buildPrompt(baseContext, 'concise')
      expect(result).toContain(CONCISE_PROMPT)
      expect(result).not.toContain(DEFAULT_PROMPT)
    })

    it('has proper formatting with separators', () => {
      const result = buildPrompt(baseContext)
      expect(result).toContain('---')
      expect(result).toContain('Search Results:')
    })

    it('handles semantic search mode', () => {
      const context: SearchContext = {
        ...baseContext,
        searchMode: 'semantic',
      }
      const result = buildPrompt(context)
      expect(result).toContain('Search mode: semantic')
    })

    it('handles keyword search mode', () => {
      const context: SearchContext = {
        ...baseContext,
        searchMode: 'keyword',
      }
      const result = buildPrompt(context)
      expect(result).toContain('Search mode: keyword')
    })

    it('handles zero result count', () => {
      const context: SearchContext = {
        ...baseContext,
        resultCount: 0,
      }
      const result = buildPrompt(context)
      expect(result).toContain('Results found: 0')
    })

    it('handles large result count', () => {
      const context: SearchContext = {
        ...baseContext,
        resultCount: 1000,
      }
      const result = buildPrompt(context)
      expect(result).toContain('Results found: 1000')
    })

    it('handles special characters in query', () => {
      const context: SearchContext = {
        ...baseContext,
        query: 'how do I use "quotes" and <brackets>?',
      }
      const result = buildPrompt(context)
      expect(result).toContain('Query: "how do I use "quotes" and <brackets>?"')
    })

    it('works with all template types', () => {
      const templates: PromptTemplate[] = [
        'default',
        'concise',
        'detailed',
        'actionable',
        'technical',
      ]
      for (const template of templates) {
        const result = buildPrompt(baseContext, template)
        expect(result).toContain('Query: "test query"')
        expect(result).toContain('Results found: 5')
        expect(result).toContain('Search mode: hybrid')
      }
    })
  })

  describe('prompt content verification', () => {
    describe('DEFAULT_PROMPT', () => {
      it('contains guidelines section', () => {
        expect(DEFAULT_PROMPT).toContain('Guidelines:')
      })

      it('mentions synthesizing results', () => {
        expect(DEFAULT_PROMPT).toContain('Synthesize')
      })

      it('includes formatting instructions', () => {
        expect(DEFAULT_PROMPT).toContain('Format your response')
      })

      it('mentions actionable insights', () => {
        expect(DEFAULT_PROMPT).toContain('actionable insights')
      })
    })

    describe('CONCISE_PROMPT', () => {
      it('is relatively short', () => {
        expect(CONCISE_PROMPT.length).toBeLessThan(200)
      })

      it('mentions 2-3 sentences', () => {
        expect(CONCISE_PROMPT).toContain('2-3 sentences')
      })

      it('focuses on most important findings', () => {
        expect(CONCISE_PROMPT).toContain('most important')
      })
    })

    describe('DETAILED_PROMPT', () => {
      it('is comprehensive (longer than default)', () => {
        expect(DETAILED_PROMPT.length).toBeGreaterThan(CONCISE_PROMPT.length)
      })

      it('mentions executive summary', () => {
        expect(DETAILED_PROMPT).toContain('Executive summary')
      })

      it('mentions code patterns', () => {
        expect(DETAILED_PROMPT).toContain('code patterns')
      })

      it('mentions file references', () => {
        expect(DETAILED_PROMPT).toContain('file references')
      })

      it('includes multiple numbered sections', () => {
        expect(DETAILED_PROMPT).toContain('1.')
        expect(DETAILED_PROMPT).toContain('2.')
        expect(DETAILED_PROMPT).toContain('3.')
      })
    })

    describe('ACTIONABLE_PROMPT', () => {
      it('focuses on developer goals', () => {
        expect(ACTIONABLE_PROMPT).toContain(
          'developer is likely trying to accomplish',
        )
      })

      it('mentions specific steps', () => {
        expect(ACTIONABLE_PROMPT).toContain('specific steps')
      })

      it('mentions code snippets', () => {
        expect(ACTIONABLE_PROMPT).toContain('code snippets')
      })

      it('mentions pitfalls', () => {
        expect(ACTIONABLE_PROMPT).toContain('pitfalls')
      })

      it('emphasizes being direct and practical', () => {
        expect(ACTIONABLE_PROMPT).toContain('direct and practical')
      })
    })

    describe('TECHNICAL_PROMPT', () => {
      it('focuses on technical perspective', () => {
        expect(TECHNICAL_PROMPT).toContain('technical perspective')
      })

      it('mentions code patterns', () => {
        expect(TECHNICAL_PROMPT).toContain('Code patterns')
      })

      it('mentions API signatures', () => {
        expect(TECHNICAL_PROMPT).toContain('API signatures')
      })

      it('mentions configuration options', () => {
        expect(TECHNICAL_PROMPT).toContain('Configuration options')
      })

      it('mentions best practices', () => {
        expect(TECHNICAL_PROMPT).toContain('Best practices')
      })

      it('emphasizes concrete technical guidance', () => {
        expect(TECHNICAL_PROMPT).toContain('concrete technical guidance')
      })
    })
  })

  describe('prompt uniqueness', () => {
    it('all prompts are distinct', () => {
      const prompts = [
        DEFAULT_PROMPT,
        CONCISE_PROMPT,
        DETAILED_PROMPT,
        ACTIONABLE_PROMPT,
        TECHNICAL_PROMPT,
      ]
      const uniquePrompts = new Set(prompts)
      expect(uniquePrompts.size).toBe(prompts.length)
    })
  })
})
