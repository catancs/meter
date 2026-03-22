import { homedir } from 'os'
import { join } from 'path'

export const METER_DIR = join(homedir(), '.meter')
export const METER_BIN_DIR = join(METER_DIR, 'bin')
export const CONFIG_PATH = join(METER_DIR, 'config.json')
export const HISTORY_DB_PATH = join(METER_DIR, 'history.db')
export const PRICING_PATH = join(METER_DIR, 'pricing.json')
export const USAGE_CACHE_PATH = join(METER_DIR, 'cache', 'usage.json')
export const SESSION_CACHE_PATH = join(METER_DIR, 'cache', 'session.json')
export const ERRORS_LOG_PATH = join(METER_DIR, 'cache', 'errors.log')
export const REPORTS_DIR = join(METER_DIR, 'reports')

export const DEFAULT_CONFIG_VALUES = {
  budget_per_task_usd: 0.50,
  threshold_pct: 80,
  window_threshold_pct: 80,
  poll_interval_seconds: 60,
  min_confidence_to_skip_llm: 0.85,
  claude_chain: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-haiku-4-20250307'],
  llm_precheck_model: 'claude-haiku-4-20250307',
}

export const CLAUDE_USAGE_API = 'https://claude.ai/api/organizations'
export const CLAUDE_BOOTSTRAP_API = 'https://claude.ai/api/bootstrap'
export const CLAUDE_CREDENTIALS_PATH = join(homedir(), '.claude', '.credentials.json')
export const CLAUDE_SETTINGS_PATH = join(homedir(), '.claude', 'settings.json')

export const KEYWORD_WEIGHTS: Record<string, number> = {
  'refactor entire': 0.9,
  'rewrite': 0.85,
  'migrate': 0.8,
  'refactor': 0.7,
  'implement': 0.6,
  'add feature': 0.55,
  'add tests': 0.5,
  'add': 0.4,
  'update': 0.35,
  'fix': 0.3,
  'debug': 0.3,
  'change': 0.25,
  'rename': 0.2,
  'fix typo': 0.05,
  'typo': 0.05,
}

export const COMPLEXITY_THRESHOLDS = {
  low: 0.3,
  medium: 0.55,
  heavy: 0.75,
  critical: 1.0,
}
