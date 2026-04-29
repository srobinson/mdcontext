/**
 * FIX Command
 *
 * Repair malformed YAML frontmatter in markdown files.
 *
 * Default is dry-run: prints what would change. Pass --write to apply.
 */

import { execFile } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { promisify } from 'node:util'
import { Args, Command, Options } from '@effect/cli'
import { Console, Effect } from 'effect'
import { fixFrontmatter } from '../../parser/frontmatter-fix.js'
import { jsonOption, prettyOption } from '../options.js'
import { formatJson, isMarkdownFile, walkDir } from '../utils.js'

const execFileAsync = promisify(execFile)

interface FileReport {
  readonly path: string
  readonly changed: boolean
  readonly resolved: boolean
  readonly remainingErrors: ReadonlyArray<{ line: number; message: string }>
  readonly diffLines: readonly string[]
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/

const extractFrontmatterLines = (content: string): readonly string[] => {
  const match = FRONTMATTER_RE.exec(content)
  return (match?.[1] ?? '').split(/\r?\n/)
}

export const formatFrontmatterDiff = (
  original: string,
  fixed: string,
): readonly string[] => {
  const before = extractFrontmatterLines(original)
  const after = extractFrontmatterLines(fixed)
  const max = Math.max(before.length, after.length)
  const lines: string[] = []

  for (let i = 0; i < max; i++) {
    if (before[i] === after[i]) continue
    if (before[i] !== undefined) lines.push(`    - ${before[i]}`)
    if (after[i] !== undefined) lines.push(`    + ${after[i]}`)
  }

  return lines
}

export const parseGitDirtyStatus = (status: string): boolean =>
  status
    .split('\n')
    .filter(Boolean)
    .some((line) => !line.startsWith('??') && line.slice(0, 2).includes('M'))

const isDirtyTrackedFile = async (filePath: string): Promise<boolean> => {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['status', '--porcelain', '--', path.basename(filePath)],
      { cwd: path.dirname(filePath) },
    )
    return parseGitDirtyStatus(stdout)
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e.code === 'ENOENT' || e.code === 128)
    ) {
      return false
    }
    return false
  }
}

const collectFiles = async (target: string): Promise<readonly string[]> => {
  const stat = await fs.stat(target)
  if (stat.isFile()) {
    return isMarkdownFile(target) ? [target] : []
  }
  return walkDir(target)
}

const processFile = async (filePath: string): Promise<FileReport | null> => {
  const content = await fs.readFile(filePath, 'utf8')
  const result = fixFrontmatter(content)

  if (!result.hadFrontmatter) return null
  if (result.resolved && !result.changed) return null

  return {
    path: filePath,
    changed: result.changed,
    resolved: result.resolved,
    remainingErrors: result.remainingErrors,
    diffLines: result.changed
      ? formatFrontmatterDiff(content, result.fixedContent)
      : [],
  }
}

const writeIfChanged = async (filePath: string): Promise<boolean> => {
  const content = await fs.readFile(filePath, 'utf8')
  const result = fixFrontmatter(content)
  if (!result.changed) return false
  await fs.writeFile(filePath, result.fixedContent, 'utf8')
  return true
}

export const fixCommand = Command.make(
  'fix',
  {
    path: Args.text({ name: 'path' }).pipe(
      Args.withDescription('File or directory to fix'),
      Args.withDefault('.'),
    ),
    write: Options.boolean('write').pipe(
      Options.withAlias('w'),
      Options.withDescription('Apply changes (default: dry-run)'),
      Options.withDefault(false),
    ),
    json: jsonOption,
    pretty: prettyOption,
    force: Options.boolean('force').pipe(
      Options.withAlias('f'),
      Options.withDescription('Write even when tracked files are modified'),
      Options.withDefault(false),
    ),
  },
  ({ path: target, write, json, pretty, force }) =>
    Effect.gen(function* () {
      const resolved = path.resolve(target)

      const files = yield* Effect.tryPromise({
        try: () => collectFiles(resolved),
        catch: (e) =>
          new Error(
            `Cannot read ${resolved}: ${e instanceof Error ? e.message : String(e)}`,
          ),
      })

      const reports: FileReport[] = []
      for (const file of files) {
        const report = yield* Effect.tryPromise({
          try: () => processFile(file),
          catch: (e) =>
            new Error(
              `Failed reading ${file}: ${e instanceof Error ? e.message : String(e)}`,
            ),
        })
        if (report) reports.push(report)
      }

      let written = 0
      const skippedDirty = new Set<string>()
      if (write) {
        for (const report of reports) {
          if (!report.changed) continue
          if (!force) {
            const dirty = yield* Effect.tryPromise({
              try: () => isDirtyTrackedFile(report.path),
              catch: () => false,
            })
            if (dirty) {
              skippedDirty.add(report.path)
              continue
            }
          }
          const ok = yield* Effect.tryPromise({
            try: () => writeIfChanged(report.path),
            catch: (e) =>
              new Error(
                `Failed writing ${report.path}: ${e instanceof Error ? e.message : String(e)}`,
              ),
          })
          if (ok) written++
        }
      }

      if (json) {
        const output = {
          scanned: files.length,
          changed: reports.filter((r) => r.changed).length,
          unresolved: reports.filter((r) => !r.resolved).length,
          written: write ? written : 0,
          mode: write ? 'write' : 'dry-run',
          reports: reports.map((r) => ({
            path: path.relative(process.cwd(), r.path),
            changed: r.changed,
            resolved: r.resolved,
            remainingErrors: r.remainingErrors,
          })),
        }
        yield* Console.log(formatJson(output, pretty))
        return
      }

      const changed = reports.filter((r) => r.changed)
      const unresolved = reports.filter((r) => !r.resolved)
      const writtenReports = write
        ? changed.filter((r) => !skippedDirty.has(r.path))
        : changed

      yield* Console.log(
        `Scanned ${files.length} file${files.length === 1 ? '' : 's'} under ${path.relative(process.cwd(), resolved) || '.'}`,
      )

      if (reports.length === 0) {
        yield* Console.log('No frontmatter issues found.')
        return
      }

      const verb = write ? 'Fixed' : 'Would fix'
      if (writtenReports.length > 0) {
        yield* Console.log('')
        yield* Console.log(`${verb} ${writtenReports.length}:`)
        for (const r of writtenReports) {
          const rel = path.relative(process.cwd(), r.path)
          const suffix = r.resolved ? '' : '  (errors remain)'
          yield* Console.log(`  ${rel}${suffix}`)
          if (!write) {
            for (const line of r.diffLines) {
              yield* Console.log(line)
            }
          }
        }
      }

      if (skippedDirty.size > 0) {
        yield* Console.log('')
        for (const skipped of skippedDirty) {
          const rel = path.relative(process.cwd(), skipped)
          yield* Console.log(`skipped (uncommitted changes): ${rel}`)
        }
      }

      if (unresolved.length > 0) {
        yield* Console.log('')
        yield* Console.log(`Unresolved (${unresolved.length}):`)
        for (const r of unresolved) {
          const rel = path.relative(process.cwd(), r.path)
          yield* Console.log(`  ${rel}`)
          for (const err of r.remainingErrors) {
            yield* Console.log(`    line ${err.line}: ${err.message}`)
          }
        }
      }

      if (!write && changed.length > 0) {
        yield* Console.log('')
        yield* Console.log('Run with --write to apply changes.')
      }
    }),
).pipe(
  Command.withDescription(
    'Repair malformed YAML frontmatter in markdown files',
  ),
)
