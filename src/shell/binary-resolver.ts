import { access, constants } from 'fs/promises'
import { join } from 'path'

export async function resolveTrueBinary(
  name: string,
  skipDir: string
): Promise<string | null> {
  const pathEnv = process.env.PATH ?? ''
  const dirs = pathEnv.split(':').filter(d => d !== skipDir && d !== '')

  for (const dir of dirs) {
    const fullPath = join(dir, name)
    try {
      await access(fullPath, constants.X_OK)
      return fullPath
    } catch {
      // not found or not executable, continue
    }
  }
  return null
}
