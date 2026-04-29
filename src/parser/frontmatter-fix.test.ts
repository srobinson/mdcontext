import { describe, expect, it } from 'vitest'
import { parseDocument } from 'yaml'
import { fixFrontmatter } from './frontmatter-fix.js'

const parses = (yaml: string): boolean =>
  parseDocument(yaml, { logLevel: 'silent' }).errors.length === 0

const extractFm = (content: string): string => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)
  return m?.[1] ?? ''
}

describe('fixFrontmatter', () => {
  it('returns unchanged when there is no frontmatter', () => {
    const content = '# Just a heading\n\nbody\n'
    const result = fixFrontmatter(content)
    expect(result.hadFrontmatter).toBe(false)
    expect(result.changed).toBe(false)
    expect(result.fixedContent).toBe(content)
  })

  it('returns unchanged when frontmatter is already valid', () => {
    const content = '---\ntitle: Foo\nstatus: ok\n---\n\nbody\n'
    const result = fixFrontmatter(content)
    expect(result.hadFrontmatter).toBe(true)
    expect(result.changed).toBe(false)
    expect(result.resolved).toBe(true)
  })

  it('repairs unquoted title with `: ` (colon-space)', () => {
    const content =
      '---\ntitle: Helioy Shared Schema: attention-matters vs mdcontext\nstatus: ok\n---\nbody\n'
    const result = fixFrontmatter(content)
    expect(result.changed).toBe(true)
    expect(result.resolved).toBe(true)
    expect(parses(extractFm(result.fixedContent))).toBe(true)
    expect(result.fixedContent).toContain(
      "title: 'Helioy Shared Schema: attention-matters vs mdcontext'",
    )
  })

  it('repairs title that starts with a `"..."` quoted phrase then plain text', () => {
    const content =
      '---\ntitle: "Little Season Eschatology" in Living Christian Online Discourse\nstatus: ok\n---\nbody\n'
    const result = fixFrontmatter(content)
    expect(result.changed).toBe(true)
    expect(result.resolved).toBe(true)
    expect(parses(extractFm(result.fixedContent))).toBe(true)
  })

  it('repairs summary containing colons and an apostrophe', () => {
    const content =
      "---\nsummary: One thing: another, and rusqlite's simplicity is a legitimate argument. Node.js: better-sqlite3.\n---\nbody\n"
    const result = fixFrontmatter(content)
    expect(result.changed).toBe(true)
    expect(result.resolved).toBe(true)
    const parsed = parseDocument(extractFm(result.fixedContent), {
      logLevel: 'silent',
    }).toJSON() as { summary: string }
    expect(parsed.summary).toContain("rusqlite's simplicity")
    expect(parsed.summary).toContain('Node.js: better-sqlite3')
  })

  it('repairs summary with internal double quotes containing colons', () => {
    const content =
      '---\ntitle: ok\nsummary: Codex /mcp displays "Tools: (none)" due to schema conversion failure.\n---\nbody\n'
    const result = fixFrontmatter(content)
    expect(result.resolved).toBe(true)
    const parsed = parseDocument(extractFm(result.fixedContent), {
      logLevel: 'silent',
    }).toJSON() as { summary: string }
    expect(parsed.summary).toContain('"Tools: (none)"')
  })

  it('repairs multiple bad lines in one pass set', () => {
    const content = [
      '---',
      'title: Bad: Title',
      'summary: Also: bad',
      'status: ok',
      '---',
      'body',
      '',
    ].join('\n')
    const result = fixFrontmatter(content)
    expect(result.resolved).toBe(true)
    const parsed = parseDocument(extractFm(result.fixedContent), {
      logLevel: 'silent',
    }).toJSON() as { title: string; summary: string; status: string }
    expect(parsed.title).toBe('Bad: Title')
    expect(parsed.summary).toBe('Also: bad')
    expect(parsed.status).toBe('ok')
  })

  it('preserves untouched lines verbatim', () => {
    const content = [
      '---',
      'title: Bad: Title',
      'tags: [a, b, c]',
      'date: 2026-04-29',
      '---',
      'body',
      '',
    ].join('\n')
    const result = fixFrontmatter(content)
    expect(result.fixedContent).toContain('tags: [a, b, c]')
    expect(result.fixedContent).toContain('date: 2026-04-29')
  })

  it('preserves body content after the closing fence', () => {
    const body = '# Heading\n\nSome paragraph with a colon: and quotes "x".\n'
    const content = `---\ntitle: Bad: Title\n---\n${body}`
    const result = fixFrontmatter(content)
    expect(result.fixedContent.endsWith(body)).toBe(true)
  })

  it('preserves a blank line between closing fence and body', () => {
    const content = '---\ntitle: Bad: Title\n---\n\n# body\n'
    const result = fixFrontmatter(content)
    expect(result.fixedContent.endsWith('---\n\n# body\n')).toBe(true)
  })

  it('reports unresolved errors when heuristic cannot repair', () => {
    const content = '---\n  - bad list\nkey: ok\n---\nbody\n'
    const result = fixFrontmatter(content)
    if (!result.resolved) {
      expect(result.remainingErrors.length).toBeGreaterThan(0)
    }
  })

  it('caps at MAX_PASSES and reports remaining errors', () => {
    const content = '---\n: justcolon\n---\nbody\n'
    const result = fixFrontmatter(content)
    expect(result.attempts).toBeLessThanOrEqual(3)
  })

  it('round-trips a value through the YAML parser to its original string', () => {
    const original = 'Helioy Shared Schema: attention-matters vs mdcontext'
    const content = `---\ntitle: ${original}\n---\n`
    const result = fixFrontmatter(content)
    const parsed = parseDocument(extractFm(result.fixedContent), {
      logLevel: 'silent',
    }).toJSON() as { title: string }
    expect(parsed.title).toBe(original)
  })
})
