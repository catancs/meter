import { describe, it, expect, afterEach } from 'vitest'
import { writeShim, shimExists } from '../../src/shell/shim-writer.js'
import { rm, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('writeShim', () => {
  let shimDir: string

  afterEach(async () => { try { await rm(shimDir, { recursive: true }) } catch {} })

  it('writes an executable shim script', async () => {
    shimDir = join(tmpdir(), `meter-shim-${Date.now()}`)
    const shimPath = join(shimDir, 'claude')
    await writeShim(shimPath, '/usr/bin/claude')
    const content = await readFile(shimPath, 'utf-8')
    expect(content).toContain('#!/bin/sh')
    expect(content).toContain('/usr/bin/claude')
  })

  it('shimExists returns true for written shim', async () => {
    shimDir = join(tmpdir(), `meter-shim2-${Date.now()}`)
    const shimPath = join(shimDir, 'claude')
    await writeShim(shimPath, '/usr/bin/claude')
    expect(await shimExists(shimPath)).toBe(true)
  })

  it('shimExists returns false for nonexistent path', async () => {
    shimDir = join(tmpdir(), `meter-shim3-${Date.now()}`)
    expect(await shimExists(join(shimDir, 'nonexistent'))).toBe(false)
  })
})
