import Anthropic from '@anthropic-ai/sdk'
import type { Complexity } from '../types.js'

const VALID_COMPLEXITIES = new Set<Complexity>(['low', 'medium', 'heavy', 'critical'])

export async function llmClassify(
  prompt: string,
  repoFileCount: number,
  model: string
): Promise<Complexity | null> {
  try {
    const client = new Anthropic()
    const message = await client.messages.create({
      model,
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: `Classify this coding task complexity: low | medium | heavy | critical\nTask: "${prompt}"\nRepo: ${repoFileCount} files\nReply with exactly one word.`
      }]
    })

    const text = (message.content[0] as { type: 'text'; text: string }).text.trim().toLowerCase() as Complexity
    return VALID_COMPLEXITIES.has(text) ? text : null
  } catch {
    return null
  }
}
