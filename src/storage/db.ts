import { mkdirSync } from 'fs'
import { dirname } from 'path'
import type { TaskRecord } from '../types.js'
import Database from 'better-sqlite3'

export type DB = import('better-sqlite3').Database

export function initDb(path: string): DB {
  mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at        INTEGER NOT NULL,
      repo              TEXT,
      prompt_hash       TEXT NOT NULL,
      prompt_text       TEXT NOT NULL,
      model             TEXT NOT NULL,
      complexity        TEXT NOT NULL,
      est_layer         INTEGER NOT NULL,
      est_cost          REAL,
      actual_tokens_in  INTEGER,
      actual_tokens_out INTEGER,
      actual_cost       REAL,
      window_pct_start  REAL,
      window_pct_end    REAL,
      model_switched    INTEGER DEFAULT 0,
      exit_code         INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_repo ON tasks(repo);
    CREATE INDEX IF NOT EXISTS idx_tasks_prompt_hash ON tasks(prompt_hash);
  `)

  return db
}

export function insertTask(db: DB, task: Omit<TaskRecord, 'id'>): number {
  const stmt = db.prepare(`
    INSERT INTO tasks (
      created_at, repo, prompt_hash, prompt_text, model, complexity,
      est_layer, est_cost, actual_tokens_in, actual_tokens_out, actual_cost,
      window_pct_start, window_pct_end, model_switched, exit_code
    ) VALUES (
      @created_at, @repo, @prompt_hash, @prompt_text, @model, @complexity,
      @est_layer, @est_cost, @actual_tokens_in, @actual_tokens_out, @actual_cost,
      @window_pct_start, @window_pct_end, @model_switched, @exit_code
    )
  `)
  const result = stmt.run(task)
  return result.lastInsertRowid as number
}

export function getRecentTasks(db: DB, limit: number): TaskRecord[] {
  return db.prepare(
    'SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as TaskRecord[]
}

export async function openDb(path: string): Promise<DB> {
  return initDb(path)
}
