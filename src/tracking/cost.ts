import type { ModelPricing } from '../types.js'

export function calculateCost(tokens: { input: number; output: number }, pricing: ModelPricing): number {
  const inputCost = (tokens.input / 1_000_000) * pricing.input_per_million
  const outputCost = (tokens.output / 1_000_000) * pricing.output_per_million
  return inputCost + outputCost
}
