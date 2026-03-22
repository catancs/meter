#!/usr/bin/env node
import { runInit } from './commands/init.js'
import { runStatus } from './commands/status.js'
import { runReport } from './commands/report.js'
import { runHistory } from './commands/history.js'
import { runConfig } from './commands/config.js'
import { runUninstall } from './commands/uninstall.js'
import { runWrap } from './commands/wrap.js'
import { METER_DIR } from './constants.js'

const [,, command, ...args] = process.argv

const commands: Record<string, () => Promise<void>> = {
  init: () => runInit({ meterDir: METER_DIR }),
  status: runStatus,
  report: runReport,
  history: () => runHistory(args),
  config: () => runConfig(args),
  uninstall: runUninstall,
  wrap: () => runWrap(args),
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    console.log(`
◆ meter — intelligent wrapper for Claude Code

  meter init        Set up PATH shim and config
  meter status      Show current mode, usage, and config
  meter report      Weekly digest of usage and costs
  meter history     Browse past task records
  meter config      View and set configuration values
  meter uninstall   Remove meter completely
`)
    return
  }

  const handler = commands[command]
  if (!handler) {
    console.error(`Unknown command: ${command}`)
    process.exit(1)
  }

  await handler()
}

main().catch(err => {
  console.error('[meter error]', err.message)
  process.exit(1)
})
