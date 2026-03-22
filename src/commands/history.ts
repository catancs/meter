import { openDb, getRecentTasks } from '../storage/db.js'
import { HISTORY_DB_PATH } from '../constants.js'

export async function runHistory(args: string[]): Promise<void> {
  const limit = parseInt(args[0] ?? '30', 10)
  const db = await openDb(HISTORY_DB_PATH)
  const tasks = getRecentTasks(db, limit)
  db.close()
  if (tasks.length === 0) { console.log('No tasks recorded yet.'); return }
  console.log(`\n◆ meter  history  (last ${limit})\n`)
  for (const t of tasks) {
    const date = new Date(t.created_at).toLocaleString()
    const cost = t.actual_cost != null ? `$${t.actual_cost.toFixed(3)}` : t.window_pct_end != null ? `${t.window_pct_end.toFixed(0)}% window` : '—'
    console.log(`  ${date}  ${t.complexity.padEnd(8)}  ${cost.padStart(10)}  ${t.prompt_text.slice(0, 50)}`)
  }
}
