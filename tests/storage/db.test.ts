import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { initDb, insertTask, getRecentTasks } from '../../src/storage/db.js'
import { rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('db', () => {
  let dbPath: string

  beforeEach(() => { dbPath = join(tmpdir(), `meter-test-${Date.now()}.db`) })
  afterEach(async () => { try { await rm(dbPath) } catch {} })

  it('initialises schema without error', () => {
    const db = initDb(dbPath)
    expect(db).toBeTruthy()
    db.close()
  })

  it('inserts and retrieves a task record', () => {
    const db = initDb(dbPath)
    const id = insertTask(db, {
      created_at: Date.now(), repo: 'github.com/test/repo', prompt_hash: 'abc123',
      prompt_text: 'fix the auth bug', model: 'claude-opus-4-20250514',
      complexity: 'low', est_layer: 1, est_cost: 0.02,
      actual_tokens_in: 500, actual_tokens_out: 200, actual_cost: 0.018,
      window_pct_start: null, window_pct_end: null, model_switched: 0, exit_code: 0,
    })
    expect(id).toBeGreaterThan(0)
    const tasks = getRecentTasks(db, 10)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].prompt_text).toBe('fix the auth bug')
    db.close()
  })
})
