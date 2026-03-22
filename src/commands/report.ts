import { readConfig } from '../storage/config-store.js'
import { openDb, getRecentTasks } from '../storage/db.js'
import { CONFIG_PATH, HISTORY_DB_PATH } from '../constants.js'

export async function runReport(): Promise<void> {
  const config = await readConfig(CONFIG_PATH)
  if (!config) { console.log('Run meter init first.'); return }
  const db = await openDb(HISTORY_DB_PATH)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const allTasks = getRecentTasks(db, 500).filter(t => t.created_at >= weekAgo)
  db.close()
  if (allTasks.length === 0) { console.log('No tasks recorded this week.'); return }
  const totalCost = allTasks.reduce((s, t) => s + (t.actual_cost ?? 0), 0)
  const heaviest = allTasks.sort((a, b) => (b.actual_cost ?? 0) - (a.actual_cost ?? 0))[0]
  const byComplexity: Record<string, number> = { low: 0, medium: 0, heavy: 0, critical: 0 }
  for (const t of allTasks) byComplexity[t.complexity] = (byComplexity[t.complexity] ?? 0) + 1
  console.log(`\n◆ meter  weekly report\n`)
  console.log(`  Mode            ${config.mode}`)
  console.log(`  Tasks run       ${allTasks.length}`)
  if (config.mode === 'api') {
    console.log(`  Total spend     $${totalCost.toFixed(3)}`)
    console.log(`  Avg task cost   $${(totalCost / allTasks.length).toFixed(3)}`)
  }
  if (heaviest) console.log(`  Heaviest task   "${heaviest.prompt_text.slice(0, 40)}"`)
  console.log(`\n  By complexity:`)
  for (const [k, v] of Object.entries(byComplexity)) if (v > 0) console.log(`    ${k.padEnd(10)} ${v} tasks`)
}
