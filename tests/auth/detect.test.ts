import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectMode } from '../../src/auth/detect.js'

describe('detectMode', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    delete process.env.ANTHROPIC_API_KEY
  })

  it('returns api when API key set and credentials absent', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    const result = await detectMode({ credentialsPath: '/nonexistent/path' })
    expect(result).toBe('api')
  })

  it('returns plan when credentials file exists', async () => {
    const result = await detectMode({ credentialsPath: '/dev/null' })
    expect(result).toBe('plan')
  })

  it('returns plan when both API key and credentials exist', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    const result = await detectMode({ credentialsPath: '/dev/null' })
    expect(result).toBe('plan')
  })

  it('returns null when neither exists', async () => {
    const result = await detectMode({ credentialsPath: '/nonexistent/path' })
    expect(result).toBeNull()
  })
})
