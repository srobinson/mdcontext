/**
 * CLI Provider Detection
 *
 * Detects installed CLI tools that can be used for AI summarization.
 * Uses spawn() with argument arrays for security - NEVER exec() with string interpolation.
 */

import { spawn } from 'node:child_process'
import type { CLIInfo, CLIProviderName } from '../types.js'

/**
 * Known CLI tools with their configuration.
 *
 * SECURITY: All CLI invocations use spawn() with argument arrays.
 * The args array is used directly, never interpolated into strings.
 */
export const KNOWN_CLIS: readonly CLIInfo[] = [
  {
    name: 'claude',
    command: 'claude',
    displayName: 'Claude Code',
    args: ['-p', '--output-format', 'text'],
    useStdin: false, // Uses -p flag for prompt, not stdin
  },
  {
    name: 'opencode',
    command: 'opencode',
    displayName: 'OpenCode',
    args: ['run', '--format', 'text'],
    useStdin: true,
  },
  {
    name: 'copilot',
    command: 'gh',
    displayName: 'GitHub Copilot CLI',
    args: ['copilot', 'explain'],
    useStdin: true,
  },
  {
    name: 'aider',
    command: 'aider',
    displayName: 'Aider',
    args: ['--message'],
    useStdin: false,
  },
  {
    name: 'cline',
    command: 'cline',
    displayName: 'Cline',
    args: ['--prompt'],
    useStdin: false,
  },
  {
    name: 'amp',
    command: 'amp',
    displayName: 'Amp',
    args: ['--prompt'],
    useStdin: false,
  },
] as const

/**
 * Check if a command exists on the system.
 *
 * SECURITY: Uses spawn() with argument array, not exec() with string interpolation.
 */
const commandExists = (command: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Use 'which' on Unix, 'where' on Windows
    const checkCommand = process.platform === 'win32' ? 'where' : 'which'

    const proc = spawn(checkCommand, [command], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })

    proc.on('close', (code) => {
      resolve(code === 0)
    })

    proc.on('error', () => {
      resolve(false)
    })
  })
}

/**
 * Detect all installed CLI tools that can be used for summarization.
 *
 * @returns Array of CLIInfo for installed tools
 */
export const detectInstalledCLIs = async (): Promise<CLIInfo[]> => {
  const results = await Promise.all(
    KNOWN_CLIS.map(async (cli) => {
      const exists = await commandExists(cli.command)
      return exists ? cli : null
    }),
  )

  return results.filter((cli): cli is CLIInfo => cli !== null)
}

/**
 * Get CLI info by name.
 */
export const getCLIInfo = (name: CLIProviderName): CLIInfo | undefined => {
  return KNOWN_CLIS.find((cli) => cli.name === name)
}

/**
 * Check if a specific CLI is installed.
 */
export const isCLIInstalled = async (
  name: CLIProviderName,
): Promise<boolean> => {
  const cli = getCLIInfo(name)
  if (!cli) return false
  return commandExists(cli.command)
}
