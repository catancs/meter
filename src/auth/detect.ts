import { access } from 'fs/promises'
import type { UserMode } from '../types.js'

interface DetectOptions {
  credentialsPath: string
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function detectMode(opts: DetectOptions): Promise<UserMode | null> {
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY)
  const hasCredentials = await fileExists(opts.credentialsPath)

  if (hasCredentials) return 'plan'
  if (hasApiKey) return 'api'
  return null
}
