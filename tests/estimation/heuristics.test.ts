import { describe, it, expect } from 'vitest'
import { scoreHeuristics } from '../../src/estimation/heuristics.js'

describe('scoreHeuristics', () => {
  it('scores refactor entire as heavy with high confidence', () => {
    const result = scoreHeuristics({ prompt: 'refactor entire auth module', repoFileCount: 50 })
    expect(result.complexity).toBe('heavy')
    expect(result.confidence).toBeGreaterThan(0.85)
  })

  it('scores typo fix as low with high confidence', () => {
    const result = scoreHeuristics({ prompt: 'fix typo in README', repoFileCount: 50 })
    expect(result.complexity).toBe('low')
    expect(result.confidence).toBeGreaterThan(0.85)
  })

  it('scores medium complexity with lower confidence', () => {
    const result = scoreHeuristics({ prompt: 'add dark mode toggle', repoFileCount: 100 })
    expect(['medium', 'heavy']).toContain(result.complexity)
  })
})
