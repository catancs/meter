import { readConfig, writeConfig } from '../storage/config-store.js'
import { CONFIG_PATH } from '../constants.js'

export async function runConfig(args: string[]): Promise<void> {
  const config = await readConfig(CONFIG_PATH)
  if (!config) { console.log('Run meter init first.'); return }
  if (args.length === 0) { console.log(JSON.stringify(config, null, 2)); return }
  if (args[0] === 'set' && args[1] && args[2]) {
    const field = args[1]
    const val = args[2]
    if (field === 'budget') config.budget.per_task_usd = parseFloat(val)
    else if (field === 'threshold') {
      config.budget.threshold_pct = parseInt(val, 10)
      config.plan.window_threshold_pct = parseInt(val, 10)
    }
    await writeConfig(CONFIG_PATH, config)
    console.log(`✓ ${field} set to ${val}`)
  }
}
