import { describe, it, expect } from 'vitest'
import { readCredentials } from '../../src/auth/credentials.js'
import { writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('readCredentials', () => {
  it('returns parsed credentials from valid JSON file', async () => {
    const dir = join(tmpdir(), `meter-test-${Date.now()}`)
    await mkdir(dir, { recursive: true })
    const path = join(dir, 'credentials.json')
    await writeFile(path, JSON.stringify({ accessToken: 'tok_123', organizationId: 'org_abc' }))
    const result = await readCredentials(path)
    expect(result?.accessToken).toBe('tok_123')
    await rm(dir, { recursive: true })
  })

  it('returns null when file does not exist', async () => {
    const result = await readCredentials('/nonexistent/credentials.json')
    expect(result).toBeNull()
  })

  it('returns null on invalid JSON with retry', async () => {
    const dir = join(tmpdir(), `meter-test-${Date.now()}`)
    await mkdir(dir, { recursive: true })
    const path = join(dir, 'credentials.json')
    await writeFile(path, 'not valid json')
    const result = await readCredentials(path)
    expect(result).toBeNull()
    await rm(dir, { recursive: true })
  })
})
