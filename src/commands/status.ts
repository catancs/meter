import { readConfig } from '../storage/config-store.js'
import { CONFIG_PATH } from '../constants.js'

export async function runStatus(): Promise<void> {
  const config = await readConfig(CONFIG_PATH)
  if (!config) { console.log('meter not initialised. Run: meter init'); return }
  console.log(`◆ meter status\n`)
  console.log(`  Mode:    ${config.mode}`)
  console.log(`  Model:   ${config.models.claude_chain[0]}`)
  console.log(`  Claude:  ${config.resolved_binaries.claude}`)
  if (config.mode === 'api') {
    console.log(`  Budget:  $${config.budget.per_task_usd} per task  (notify at ${config.budget.threshold_pct}%)`)
  } else {
    console.log(`  Window:  notify at ${config.plan.window_threshold_pct}%`)
  }
}
