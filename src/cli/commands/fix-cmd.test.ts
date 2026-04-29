import { describe, expect, it } from 'vitest'
import { formatFrontmatterDiff } from './fix-cmd.js'

describe('formatFrontmatterDiff', () => {
  it('returns only changed frontmatter lines with dry-run indentation', () => {
    const original = [
      '---',
      'title: Bad: Title',
      'status: ok',
      '---',
      '# Body',
      '',
    ].join('\n')
    const fixed = [
      '---',
      "title: 'Bad: Title'",
      'status: ok',
      '---',
      '# Body',
      '',
    ].join('\n')

    expect(formatFrontmatterDiff(original, fixed)).toEqual([
      '    - title: Bad: Title',
      "    + title: 'Bad: Title'",
    ])
  })
})
