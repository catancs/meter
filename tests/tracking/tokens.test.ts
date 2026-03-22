import { describe, it, expect } from 'vitest'
import { parseTokensFromOutput, estimateInputTokens } from '../../src/tracking/tokens.js'

describe('parseTokensFromOutput', () => {
  it('extracts token counts from Claude Code output', () => {
    const output = 'Task complete.\n\nTokens: 1,234 input, 567 output\nCost: $0.043'
    const result = parseTokensFromOutput(output)
    expect(result?.input).toBe(1234)
    expect(result?.output).toBe(567)
  })

  it('returns null when no token info present', () => {
    expect(parseTokensFromOutput('just some regular output')).toBeNull()
  })
})

describe('estimateInputTokens', () => {
  it('divides char count by 4 and rounds up', () => {
    expect(estimateInputTokens(100)).toBe(25)
    expect(estimateInputTokens(101)).toBe(26)
  })
})
