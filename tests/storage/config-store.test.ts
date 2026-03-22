import { describe, it, expect, afterEach } from 'vitest'
import { readConfig, writeConfig, ensureConfigDefaults } from '../../src/storage/config-store.js'
import { rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('config-store', () => {
  let configPath: string

  afterEach(async () => { try { await rm(configPath) } catch {} })

  it('returns null for missing config', async () => {
    configPath = join(tmpdir(), `meter-cfg-${Date.now()}.json`)
    const result = await readConfig(configPath)
    expect(result).toBeNull()
  })

  it('writes and reads config roundtrip', async () => {
    configPath = join(tmpdir(), `meter-cfg-${Date.now()}.json`)
    const config = ensureConfigDefaults({ mode: 'api', resolved_binaries: { claude: '/usr/bin/claude' } })
    await writeConfig(configPath, config)
    const read = await readConfig(configPath)
    expect(read?.mode).toBe('api')
    expect(read?.budget.per_task_usd).toBe(0.50)
  })
})
