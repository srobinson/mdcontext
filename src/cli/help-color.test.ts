/**
 * Tests for color suppression in help output.
 */

import { describe, expect, it, vi } from 'vitest'
import { showMainHelp } from './help.js'

// ESC character used in ANSI escape sequences
const ESC = '\x1b'

describe('showMainHelp color suppression', () => {
  it('produces no ANSI escape sequences when color is false', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      showMainHelp(false)
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n')
      // Verify no ANSI escape sequences
      expect(output).not.toContain(ESC)
      // Verify content is still present
      expect(output).toContain('mdm')
      expect(output).toContain('COMMANDS')
      expect(output).toContain('fix [path]')
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it('produces ANSI escape sequences when color is true', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      showMainHelp(true)
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n')
      // Verify ANSI escape sequences are present
      expect(output).toContain(ESC)
    } finally {
      consoleSpy.mockRestore()
    }
  })
})
