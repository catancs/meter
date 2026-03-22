import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { matchHistory } from '../../src/estimation/history-matcher.js'
import { initDb, insertTask } from '../../src/storage/db.js'
import { rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('matchHistory', () => {
  let dbPath: string

  beforeEach(() => { dbPath = join(tmpdir(), `meter-hmatch-${Date.now()}.db`) })
  afterEach(async () => { try { await rm(dbPath) } catch {} })

  it('returns null when no history exists', () => {
    const db = initDb(dbPath)
    const result = matchHistory(db, 'fix the login bug', 'repo-abc')
    expect(result).toBeNull()
    db.close()
  })

  it('returns median cost for similar prompts with 3+ runs', () => {
    const db = initDb(dbPath)
    const base = {
      created_at: Date.now(), repo: 'repo-abc', prompt_hash: 'h1',
      model: 'claude-opus-4-20250514', complexity: 'low' as const,
      est_layer: 1 as const, est_cost: 0.02,
      actual_tokens_in: 400, actual_tokens_out: 150,
      window_pct_start: null, window_pct_end: null,
      model_switched: 0, exit_code: 0,
    }
    insertTask(db, { ...base, prompt_text: 'fix login bug', actual_cost: 0.018 })
    insertTask(db, { ...base, prompt_hash: 'h2', prompt_text: 'fix login issue', actual_cost: 0.022 })
    insertTask(db, { ...base, prompt_hash: 'h3', prompt_text: 'fix login error', actual_cost: 0.020 })

    const result = matchHistory(db, 'fix the login problem', 'repo-abc')
    expect(result).not.toBeNull()
    expect(result!.estimated_cost).toBeCloseTo(0.020, 2)
    db.close()
  })
})
