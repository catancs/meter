import { watch } from 'fs'
import { readFile as readFileAsync } from 'fs/promises'

export interface ClaudeCredentials {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  [key: string]: unknown
}

export async function readCredentials(path: string): Promise<ClaudeCredentials | null> {
  async function tryRead(): Promise<ClaudeCredentials | null> {
    try {
      const raw = await readFileAsync(path, 'utf-8')
      return JSON.parse(raw) as ClaudeCredentials
    } catch {
      return null
    }
  }

  const first = await tryRead()
  if (first) return first

  // retry once after 200ms (handles partial writes on macOS kqueue)
  await new Promise(r => setTimeout(r, 200))
  return tryRead()
}

export function watchCredentials(
  path: string,
  onChange: (creds: ClaudeCredentials | null) => void
): () => void {
  let debounceTimer: NodeJS.Timeout | null = null

  const watcher = watch(path, () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      const creds = await readCredentials(path)
      onChange(creds)
    }, 100) // 100ms debounce to avoid partial-write reads
  })

  return () => watcher.close()
}
