import { describe, it, expect } from 'vitest'
import { resolveTrueBinary } from '../../src/shell/binary-resolver.js'
import { METER_BIN_DIR } from '../../src/constants.js'

describe('resolveTrueBinary', () => {
  it('skips meter bin dir when resolving', async () => {
    const result = await resolveTrueBinary('node', METER_BIN_DIR)
    expect(result).not.toBeNull()
    expect(result).not.toContain('.meter/bin')
  })
  it('returns null for nonexistent binary', async () => {
    const result = await resolveTrueBinary('definitely-does-not-exist-abc123', METER_BIN_DIR)
    expect(result).toBeNull()
  })
})
