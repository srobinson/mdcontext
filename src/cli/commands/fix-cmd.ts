/**
 * FIX Command
 *
 * Repair malformed YAML frontmatter in markdown files.
 *
 * Default is dry-run: prints what would change. Pass --write to apply.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { Args, Command, Options } from '@effect/cli'
import { Console, Effect } from 'effect'
import { fixFrontmatter } from '../../parser/frontmatter-fix.js'
import { jsonOption, prettyOption } from '../options.js'
import { formatJson, isMarkdownFile, walkDir } from '../utils.js'

interface FileReport {
  readonly path: string
  readonly changed: boolean
  readonly resolved: boolean
  readonly remainingErrors: ReadonlyArray<{ line: number; message: string }>
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
  },
  ({ path: target, write, json, pretty }) =>
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
      if (write) {
        for (const report of reports) {
          if (!report.changed) continue
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

      yield* Console.log(
        `Scanned ${files.length} file${files.length === 1 ? '' : 's'} under ${path.relative(process.cwd(), resolved) || '.'}`,
      )

      if (reports.length === 0) {
        yield* Console.log('No frontmatter issues found.')
        return
      }

      const verb = write ? 'Fixed' : 'Would fix'
      if (changed.length > 0) {
        yield* Console.log('')
        yield* Console.log(`${verb} ${changed.length}:`)
        for (const r of changed) {
          const rel = path.relative(process.cwd(), r.path)
          const suffix = r.resolved ? '' : '  (errors remain)'
          yield* Console.log(`  ${rel}${suffix}`)
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
  Command.withDescription('Repair malformed YAML frontmatter in markdown files'),
)
