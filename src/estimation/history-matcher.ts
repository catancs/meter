import type { DB } from '../storage/db.js'
import type { EstimationResult, TaskRecord } from '../types.js'

function trigramSimilarity(a: string, b: string): number {
  const trigrams = (s: string): Set<string> => {
    const set = new Set<string>()
    const padded = `  ${s.toLowerCase()}  `
    for (let i = 0; i < padded.length - 2; i++) {
      set.add(padded.slice(i, i + 3))
    }
    return set
  }

  const ta = trigrams(a)
  const tb = trigrams(b)
  const intersection = [...ta].filter(t => tb.has(t)).length
  const union = new Set([...ta, ...tb]).size
  return union === 0 ? 0 : intersection / union
}

const MIN_SIMILARITY = 0.25
const MIN_RUNS = 3

export function matchHistory(
  db: DB,
  prompt: string,
  repo: string | null
): Pick<EstimationResult, 'estimated_cost' | 'layer_used'> | null {
  const candidates = db.prepare(
    'SELECT * FROM tasks WHERE repo = ? AND actual_cost IS NOT NULL ORDER BY created_at DESC LIMIT 100'
  ).all(repo) as TaskRecord[]

  const matches = candidates.filter(t =>
    trigramSimilarity(t.prompt_text, prompt) >= MIN_SIMILARITY
  )

  if (matches.length < MIN_RUNS) return null

  const costs = matches.map(t => t.actual_cost!).sort((a, b) => a - b)
  const median = costs[Math.floor(costs.length / 2)]

  return { estimated_cost: median, layer_used: 2 }
}
