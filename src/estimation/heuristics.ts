import { KEYWORD_WEIGHTS, COMPLEXITY_THRESHOLDS } from '../constants.js'
import type { Complexity, EstimationResult } from '../types.js'

interface HeuristicInput {
  prompt: string
  repoFileCount: number
}

export function scoreHeuristics(input: HeuristicInput): Pick<EstimationResult, 'complexity' | 'confidence'> {
  const lower = input.prompt.toLowerCase()

  // Use the most-specific (longest) matching keyword to avoid over-counting
  let keywordScore = 0.35
  let bestMatchLen = 0
  for (const [keyword, weight] of Object.entries(KEYWORD_WEIGHTS)) {
    if (lower.includes(keyword) && keyword.length > bestMatchLen) {
      bestMatchLen = keyword.length
      keywordScore = weight
    }
  }

  const sizeModifier = Math.min(input.repoFileCount / 500, 0.2)
  const lengthModifier = lower.length > 60 ? 0.05 : 0
  const rawScore = Math.min(keywordScore + sizeModifier + lengthModifier, 1.0)

  // critical uses strict > so it is unreachable via capped rawScore;
  // heavy is the practical maximum from heuristics alone
  let complexity: Complexity = 'low'
  if (rawScore > COMPLEXITY_THRESHOLDS.critical) complexity = 'critical'
  else if (rawScore >= COMPLEXITY_THRESHOLDS.heavy) complexity = 'heavy'
  else if (rawScore >= COMPLEXITY_THRESHOLDS.medium) complexity = 'medium'

  const confidence = keywordScore >= 0.8 || keywordScore <= 0.1 ? 0.9 : 0.65

  return { complexity, confidence }
}
