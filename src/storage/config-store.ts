import { readFile, writeFile, mkdir } from 'fs/promises'
import { dirname } from 'path'
import { DEFAULT_CONFIG_VALUES } from '../constants.js'
import type { MeterConfig, UserMode } from '../types.js'

export async function readConfig(path: string): Promise<MeterConfig | null> {
  try {
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw) as MeterConfig
  } catch {
    return null
  }
}

export async function writeConfig(path: string, config: MeterConfig): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(config, null, 2), 'utf-8')
}

export function ensureConfigDefaults(
  partial: Partial<MeterConfig> & { mode: UserMode; resolved_binaries: { claude: string } }
): MeterConfig {
  return {
    version: 1,
    org_id: partial.org_id,
    budget: {
      per_task_usd: DEFAULT_CONFIG_VALUES.budget_per_task_usd,
      threshold_pct: DEFAULT_CONFIG_VALUES.threshold_pct,
      action: 'notify',
    },
    plan: {
      window_threshold_pct: DEFAULT_CONFIG_VALUES.window_threshold_pct,
      action: 'notify',
    },
    models: {
      claude_chain: DEFAULT_CONFIG_VALUES.claude_chain,
    },
    estimation: {
      use_llm_precheck: true,
      llm_precheck_model: DEFAULT_CONFIG_VALUES.llm_precheck_model,
      min_confidence_to_skip_llm: DEFAULT_CONFIG_VALUES.min_confidence_to_skip_llm,
    },
    poll_interval_seconds: DEFAULT_CONFIG_VALUES.poll_interval_seconds,
    ...partial,
  }
}
