import { describe, it, expect, vi } from 'vitest'
import { detectShell, getShellConfigPath } from '../../src/shell/detect.js'

describe('detectShell', () => {
  it('detects zsh from SHELL env', () => {
    vi.stubEnv('SHELL', '/bin/zsh')
    expect(detectShell()).toBe('zsh')
  })
  it('detects bash from SHELL env', () => {
    vi.stubEnv('SHELL', '/bin/bash')
    expect(detectShell()).toBe('bash')
  })
  it('detects fish from SHELL env', () => {
    vi.stubEnv('SHELL', '/usr/bin/fish')
    expect(detectShell()).toBe('fish')
  })
  it('falls back to bash on unknown shell', () => {
    vi.stubEnv('SHELL', '/bin/unknown')
    expect(detectShell()).toBe('bash')
  })
})

describe('getShellConfigPath', () => {
  it('returns .zshrc for zsh', () => {
    expect(getShellConfigPath('zsh')).toContain('.zshrc')
  })
  it('returns .bashrc for bash', () => {
    expect(getShellConfigPath('bash')).toContain('.bashrc')
  })
})
