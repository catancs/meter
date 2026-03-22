import { readFile, writeFile, appendFile } from 'fs/promises'
import type { ShellType } from './detect.js'
import { getPathInjectLine } from './detect.js'

const METER_MARKER = '# added by meter'

export async function isPathAlreadyInjected(configPath: string): Promise<boolean> {
  try {
    const content = await readFile(configPath, 'utf-8')
    return content.includes(METER_MARKER)
  } catch {
    return false
  }
}

export async function injectPath(shell: ShellType, configPath: string): Promise<void> {
  const already = await isPathAlreadyInjected(configPath)
  if (already) return
  const line = getPathInjectLine(shell)
  await appendFile(configPath, `\n${line}\n`, 'utf-8')
}

export async function removePath(configPath: string): Promise<void> {
  try {
    const content = await readFile(configPath, 'utf-8')
    const cleaned = content.split('\n').filter(line => !line.includes(METER_MARKER)).join('\n')
    await writeFile(configPath, cleaned, 'utf-8')
  } catch {
    // file may not exist, that's fine
  }
}
