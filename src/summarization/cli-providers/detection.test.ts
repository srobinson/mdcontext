/**
 * Tests for CLI Provider Detection Module
 */

import { type ChildProcess, spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CLIProviderName } from '../types.js'
import {
  detectInstalledCLIs,
  getCLIInfo,
  isCLIInstalled,
  KNOWN_CLIS,
} from './detection.js'

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}))

const mockSpawn = vi.mocked(spawn)

const createMockProcess = (exitCode: number | null, emitError = false) => {
  const proc = new EventEmitter() as ChildProcess
  setTimeout(() => {
    if (emitError) {
      proc.emit('error', new Error('spawn ENOENT'))
    } else {
      proc.emit('close', exitCode)
    }
  }, 0)
  return proc
}

describe('KNOWN_CLIS', () => {
  const expectedProviders: CLIProviderName[] = [
    'claude',
    'opencode',
    'copilot',
    'aider',
    'cline',
    'amp',
  ]

  it('should contain all expected CLI providers', () => {
    const names = KNOWN_CLIS.map((cli) => cli.name)
    for (const provider of expectedProviders) {
      expect(names).toContain(provider)
    }
  })

  it('should have required fields for each CLI', () => {
    for (const cli of KNOWN_CLIS) {
      expect(cli).toHaveProperty('name')
      expect(cli).toHaveProperty('command')
      expect(cli).toHaveProperty('displayName')
      expect(cli).toHaveProperty('args')
      expect(cli).toHaveProperty('useStdin')

      expect(typeof cli.name).toBe('string')
      expect(typeof cli.command).toBe('string')
      expect(typeof cli.displayName).toBe('string')
      expect(Array.isArray(cli.args)).toBe(true)
      expect(typeof cli.useStdin).toBe('boolean')
    }
  })

  describe('individual CLI configurations', () => {
    it('should have correct claude configuration', () => {
      const claude = KNOWN_CLIS.find((cli) => cli.name === 'claude')
      expect(claude).toBeDefined()
      expect(claude!.command).toBe('claude')
      expect(claude!.displayName).toBe('Claude Code')
      expect(claude!.args).toContain('-p')
      expect(claude!.useStdin).toBe(false)
    })

    it('should have correct opencode configuration', () => {
      const opencode = KNOWN_CLIS.find((cli) => cli.name === 'opencode')
      expect(opencode).toBeDefined()
      expect(opencode!.command).toBe('opencode')
      expect(opencode!.displayName).toBe('OpenCode')
      expect(opencode!.useStdin).toBe(true)
    })

    it('should have correct copilot configuration', () => {
      const copilot = KNOWN_CLIS.find((cli) => cli.name === 'copilot')
      expect(copilot).toBeDefined()
      expect(copilot!.command).toBe('gh')
      expect(copilot!.displayName).toBe('GitHub Copilot CLI')
      expect(copilot!.args).toContain('copilot')
      expect(copilot!.useStdin).toBe(true)
    })

    it('should have correct aider configuration', () => {
      const aider = KNOWN_CLIS.find((cli) => cli.name === 'aider')
      expect(aider).toBeDefined()
      expect(aider!.command).toBe('aider')
      expect(aider!.displayName).toBe('Aider')
      expect(aider!.useStdin).toBe(false)
    })

    it('should have correct cline configuration', () => {
      const cline = KNOWN_CLIS.find((cli) => cli.name === 'cline')
      expect(cline).toBeDefined()
      expect(cline!.command).toBe('cline')
      expect(cline!.displayName).toBe('Cline')
      expect(cline!.useStdin).toBe(false)
    })

    it('should have correct amp configuration', () => {
      const amp = KNOWN_CLIS.find((cli) => cli.name === 'amp')
      expect(amp).toBeDefined()
      expect(amp!.command).toBe('amp')
      expect(amp!.displayName).toBe('Amp')
      expect(amp!.useStdin).toBe(false)
    })
  })
})

describe('getCLIInfo', () => {
  it('should return correct info for known providers', () => {
    const claude = getCLIInfo('claude')
    expect(claude).toBeDefined()
    expect(claude!.name).toBe('claude')
    expect(claude!.command).toBe('claude')

    const copilot = getCLIInfo('copilot')
    expect(copilot).toBeDefined()
    expect(copilot!.name).toBe('copilot')
    expect(copilot!.command).toBe('gh')
  })

  it('should return undefined for unknown provider', () => {
    const unknown = getCLIInfo('unknown' as CLIProviderName)
    expect(unknown).toBeUndefined()
  })

  it('should return all fields for a CLI', () => {
    const cli = getCLIInfo('claude')
    expect(cli).toMatchObject({
      name: 'claude',
      command: 'claude',
      displayName: 'Claude Code',
      args: expect.any(Array),
      useStdin: false,
    })
  })
})

describe('isCLIInstalled', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return true when CLI exists (exit code 0)', async () => {
    mockSpawn.mockReturnValue(createMockProcess(0))

    const result = await isCLIInstalled('claude')

    expect(result).toBe(true)
    expect(mockSpawn).toHaveBeenCalledWith(
      expect.stringMatching(/^(which|where)$/),
      ['claude'],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    )
  })

  it('should return false when CLI does not exist (exit code 1)', async () => {
    mockSpawn.mockReturnValue(createMockProcess(1))

    const result = await isCLIInstalled('claude')

    expect(result).toBe(false)
  })

  it('should return false when spawn emits an error', async () => {
    mockSpawn.mockReturnValue(createMockProcess(null, true))

    const result = await isCLIInstalled('claude')

    expect(result).toBe(false)
  })

  it('should return false for unknown provider', async () => {
    const result = await isCLIInstalled('unknown' as CLIProviderName)

    expect(result).toBe(false)
    expect(mockSpawn).not.toHaveBeenCalled()
  })

  it('should check the correct command for copilot (gh)', async () => {
    mockSpawn.mockReturnValue(createMockProcess(0))

    await isCLIInstalled('copilot')

    expect(mockSpawn).toHaveBeenCalledWith(
      expect.stringMatching(/^(which|where)$/),
      ['gh'],
      expect.any(Object),
    )
  })
})

describe('detectInstalledCLIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return all CLIs when all are installed', async () => {
    mockSpawn.mockReturnValue(createMockProcess(0))

    const result = await detectInstalledCLIs()

    expect(result.length).toBe(KNOWN_CLIS.length)
    expect(result.map((cli) => cli.name)).toEqual(
      expect.arrayContaining([
        'claude',
        'opencode',
        'copilot',
        'aider',
        'cline',
        'amp',
      ]),
    )
  })

  it('should return empty array when no CLIs are installed', async () => {
    mockSpawn.mockReturnValue(createMockProcess(1))

    const result = await detectInstalledCLIs()

    expect(result).toEqual([])
  })

  it('should return only installed CLIs', async () => {
    const installedCommands = new Set(['claude', 'gh'])
    mockSpawn.mockImplementation((_cmd, args) => {
      const command = args[0] as string
      const isInstalled = installedCommands.has(command)
      return createMockProcess(isInstalled ? 0 : 1)
    })

    const result = await detectInstalledCLIs()

    expect(result.length).toBe(2)
    expect(result.map((cli) => cli.name)).toContain('claude')
    expect(result.map((cli) => cli.name)).toContain('copilot')
  })

  it('should handle errors gracefully', async () => {
    mockSpawn.mockReturnValue(createMockProcess(null, true))

    const result = await detectInstalledCLIs()

    expect(result).toEqual([])
  })

  it('should check all known CLIs', async () => {
    mockSpawn.mockReturnValue(createMockProcess(0))

    await detectInstalledCLIs()

    expect(mockSpawn).toHaveBeenCalledTimes(KNOWN_CLIS.length)
  })
})
