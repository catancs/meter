import { describe, it, expect } from 'vitest'
import { runEstimationPipeline } from '../../src/estimation/pipeline.js'

describe('runEstimationPipeline', () => {
  it('short-circuits at layer 1 for high-confidence prompts', async () => {
    const result = await runEstimationPipeline({
      prompt: 'fix typo in README.md',
      repoFileCount: 20,
      db: null,
      repo: null,
      config: { use_llm_precheck: true, llm_precheck_model: 'haiku', min_confidence_to_skip_llm: 0.85 }
    })
    expect(result.layer_used).toBe(1)
    expect(result.complexity).toBe('low')
  })

  it('returns cost estimate for heavy tasks', async () => {
    const result = await runEstimationPipeline({
      prompt: 'refactor entire database layer',
      repoFileCount: 200,
      db: null,
      repo: null,
      config: { use_llm_precheck: false, llm_precheck_model: 'haiku', min_confidence_to_skip_llm: 0.85 }
    })
    expect(result.estimated_cost).toBeGreaterThan(0.1)
  })
})
