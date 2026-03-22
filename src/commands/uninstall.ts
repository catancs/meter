import { rm } from 'fs/promises'
import { removePath } from '../shell/path-inject.js'
import { detectShell, getShellConfigPath } from '../shell/detect.js'
import { METER_DIR } from '../constants.js'
import * as readline from 'readline/promises'

export async function runUninstall(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question('Remove all meter data (~/.meter/)? [y/N] ')
  rl.close()
  const shell = detectShell()
  const configPath = getShellConfigPath(shell)
  await removePath(configPath)
  console.log(`✓ Removed PATH entry from ${configPath}`)
  if (answer.toLowerCase() === 'y') {
    await rm(METER_DIR, { recursive: true, force: true })
    console.log('✓ Removed ~/.meter/')
  }
  console.log('✓ Uninstall complete. Run: npm uninstall -g meter-ai')
}
