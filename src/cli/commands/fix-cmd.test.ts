import { describe, expect, it } from 'vitest'
import { formatFrontmatterDiff, parseGitDirtyStatus } from './fix-cmd.js'

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

describe('parseGitDirtyStatus', () => {
  it('treats modified tracked files as dirty', () => {
    expect(parseGitDirtyStatus(' M note.md\n')).toBe(true)
    expect(parseGitDirtyStatus('MM note.md\n')).toBe(true)
  })

  it('allows clean files and untracked files', () => {
    expect(parseGitDirtyStatus('')).toBe(false)
    expect(parseGitDirtyStatus('?? note.md\n')).toBe(false)
  })
})
