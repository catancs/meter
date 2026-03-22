import { describe, it, expect, afterEach } from 'vitest'
import { runInit } from '../../src/commands/init.js'
import { readConfig } from '../../src/storage/config-store.js'
import { shimExists } from '../../src/shell/shim-writer.js'
import { rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('runInit', () => {
  let testDir: string

  afterEach(async () => { try { await rm(testDir, { recursive: true }) } catch {} })

  it('creates config.json and shim on first run', async () => {
    testDir = join(tmpdir(), `meter-init-${Date.now()}`)

    await runInit({
      meterDir: testDir,
      trueBinary: '/usr/bin/true',
      mode: 'api',
      skipPathInjection: true,
      orgId: null,
    })

    const config = await readConfig(join(testDir, 'config.json'))
    expect(config?.mode).toBe('api')
    expect(config?.resolved_binaries.claude).toBe('/usr/bin/true')
    expect(await shimExists(join(testDir, 'bin', 'claude'))).toBe(true)
  })

  it('creates subdirectories', async () => {
    testDir = join(tmpdir(), `meter-init2-${Date.now()}`)

    await runInit({
      meterDir: testDir,
      trueBinary: '/usr/bin/true',
      mode: 'plan',
      skipPathInjection: true,
      orgId: 'org_test123',
    })

    const config = await readConfig(join(testDir, 'config.json'))
    expect(config?.mode).toBe('plan')
    expect(config?.org_id).toBe('org_test123')
  })

  it('throws when no claude binary found', async () => {
    testDir = join(tmpdir(), `meter-init3-${Date.now()}`)
    const savedPath = process.env.PATH
    process.env.PATH = ''

    try {
      await expect(
        runInit({ meterDir: testDir, mode: 'api', skipPathInjection: true, orgId: null })
      ).rejects.toThrow('claude not found')
    } finally {
      process.env.PATH = savedPath
    }
  })
})
