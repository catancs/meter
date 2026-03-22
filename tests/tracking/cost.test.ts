import { describe, it, expect } from 'vitest'
import { calculateCost } from '../../src/tracking/cost.js'

describe('calculateCost', () => {
  const pricing = { model: 'test', input_per_million: 15.0, output_per_million: 75.0, updated_at: 0 }

  it('calculates cost from token counts', () => {
    const cost = calculateCost({ input: 1000, output: 500 }, pricing)
    expect(cost).toBeCloseTo(0.015 + 0.0375, 4)
  })

  it('returns 0 for zero tokens', () => {
    expect(calculateCost({ input: 0, output: 0 }, pricing)).toBe(0)
  })
})
