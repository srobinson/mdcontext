/**
 * Frontmatter repair for malformed YAML.
 *
 * Attempts a small set of targeted single-quote repairs on lines flagged by
 * eemeli/yaml's tolerant parser. Handles the two dominant footguns:
 *
 *   1. Unquoted scalars containing `: ` (colon-space) — YAML reads the colon
 *      as a nested mapping indicator.
 *   2. Unquoted scalars that start with a `"..."` quoted phrase but continue
 *      in plain text — YAML closes the string at the second quote and chokes.
 */

import { parseDocument } from 'yaml'

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/

const KEY_VALUE_RE = /^(\s*[A-Za-z_][\w-]*\s*:\s)(.*)$/

const MAX_PASSES = 3

export interface FrontmatterError {
  readonly line: number
  readonly message: string
}

export interface FixResult {
  readonly hadFrontmatter: boolean
  readonly changed: boolean
  readonly resolved: boolean
  readonly attempts: number
  readonly fixedContent: string
  readonly remainingErrors: ReadonlyArray<FrontmatterError>
}

export const fixFrontmatter = (content: string): FixResult => {
  const match = FRONTMATTER_RE.exec(content)
  if (!match) {
    return {
      hadFrontmatter: false,
      changed: false,
      resolved: true,
      attempts: 0,
      fixedContent: content,
      remainingErrors: [],
    }
  }

  const original = match[1] ?? ''
  const fenceLen = match[0].length
  const rest = content.slice(fenceLen)

  let yaml = original
  let attempts = 0
  let lastErrors: FrontmatterError[] = []

  for (; attempts < MAX_PASSES; attempts++) {
    const doc = parseDocument(yaml, { logLevel: 'silent' })
    if (doc.errors.length === 0) {
      lastErrors = []
      break
    }

    const lines = yaml.split('\n')
    const errorLines = new Set<number>()
    lastErrors = doc.errors.map((e) => {
      const line = e.linePos?.[0]?.line ?? 1
      errorLines.add(line - 1)
      return { line, message: e.message.split('\n')[0] ?? e.message }
    })

    let progress = false
    for (const idx of errorLines) {
      const line = lines[idx]
      if (line === undefined) continue
      const repaired = repairLine(line)
      if (repaired !== null && repaired !== line) {
        lines[idx] = repaired
        progress = true
      }
    }
    if (!progress) break
    yaml = lines.join('\n')
  }

  const changed = yaml !== original
  const fixedContent = changed ? `---\n${yaml}\n---${rest}` : content

  return {
    hadFrontmatter: true,
    changed,
    resolved: lastErrors.length === 0,
    attempts,
    fixedContent,
    remainingErrors: lastErrors,
  }
}

const repairLine = (line: string): string | null => {
  const m = KEY_VALUE_RE.exec(line)
  if (!m) return null
  const prefix = m[1] ?? ''
  const value = (m[2] ?? '').trimEnd()
  if (value === '') return null

  if (isAlreadyQuoted(value)) return null

  const stripped = stripBrokenWrappingQuotes(value)
  return prefix + singleQuote(stripped)
}

const isAlreadyQuoted = (v: string): boolean => {
  if (v.length < 2) return false
  if (v.startsWith("'") && v.endsWith("'") && balancedSingleQuoted(v))
    return true
  if (v.startsWith('"') && v.endsWith('"') && balancedDoubleQuoted(v))
    return true
  return false
}

const balancedSingleQuoted = (v: string): boolean => {
  const inner = v.slice(1, -1)
  return !inner.replace(/''/g, '').includes("'")
}

const balancedDoubleQuoted = (v: string): boolean => {
  const inner = v.slice(1, -1)
  let escaped = false
  for (const ch of inner) {
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') return false
  }
  return true
}

// If the value is something like `"foo" then more text`, the leading `"foo"`
// was the user's emphasis, not a YAML quote. Leave the chars in place — the
// outer single-quote wrap will handle escaping.
const stripBrokenWrappingQuotes = (v: string): string => v

const singleQuote = (value: string): string => `'${value.replace(/'/g, "''")}'`
