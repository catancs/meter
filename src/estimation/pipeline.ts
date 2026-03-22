import { scoreHeuristics } from './heuristics.js'
import { matchHistory } from './history-matcher.js'
import { llmClassify } from './llm-precheck.js'
import type { DB } from '../storage/db.js'
import type { EstimationResult } from '../types.js'

const COST_BY_COMPLEXITY = { low: 0.02, medium: 0.09, heavy: 0.38, critical: 0.80 }

interface PipelineInput {
  prompt: string
  repoFileCount: number
  db: DB | null
  repo: string | null
  config: {
    use_llm_precheck: boolean
    llm_precheck_model: string
    min_confidence_to_skip_llm: number
  }
}

export async function runEstimationPipeline(input: PipelineInput): Promise<EstimationResult> {
  // Layer 1: heuristics
  const heuristic = scoreHeuristics({ prompt: input.prompt, repoFileCount: input.repoFileCount })

  if (heuristic.confidence >= input.config.min_confidence_to_skip_llm) {
    return {
      complexity: heuristic.complexity,
      confidence: heuristic.confidence,
      estimated_cost: COST_BY_COMPLEXITY[heuristic.complexity],
      layer_used: 1
    }
  }

  // Layer 2: historical baseline
  if (input.db && input.repo) {
    const historical = matchHistory(input.db, input.prompt, input.repo)
    if (historical?.estimated_cost !== undefined) {
      return {
        complexity: heuristic.complexity,
        confidence: 0.8,
        estimated_cost: historical.estimated_cost,
        layer_used: 2
      }
    }
  }

  // Layer 3: LLM pre-call
  if (input.config.use_llm_precheck) {
    const llmResult = await llmClassify(input.prompt, input.repoFileCount, input.config.llm_precheck_model)
    if (llmResult) {
      return {
        complexity: llmResult,
        confidence: 0.87,
        estimated_cost: COST_BY_COMPLEXITY[llmResult],
        layer_used: 3
      }
    }
  }

  // Fallback: use heuristic
  return {
    complexity: heuristic.complexity,
    confidence: heuristic.confidence,
    estimated_cost: COST_BY_COMPLEXITY[heuristic.complexity],
    layer_used: 1
  }
}
