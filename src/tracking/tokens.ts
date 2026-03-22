export interface TokenCounts { input: number; output: number }

const TOKEN_PATTERN = /tokens?:\s*([\d,]+)\s*input,\s*([\d,]+)\s*output/i

export function parseTokensFromOutput(output: string): TokenCounts | null {
  const match = TOKEN_PATTERN.exec(output)
  if (!match) return null
  return {
    input: parseInt(match[1].replace(/,/g, ''), 10),
    output: parseInt(match[2].replace(/,/g, ''), 10),
  }
}

export function estimateInputTokens(charCount: number): number {
  return Math.ceil(charCount / 4)
}
