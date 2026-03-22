export type UserMode = 'api' | 'plan'
export type Complexity = 'low' | 'medium' | 'heavy' | 'critical'
export type EstimationLayer = 1 | 2 | 3

export interface MeterConfig {
  version: number
  mode: UserMode
  resolved_binaries: { claude: string }
  org_id?: string
  budget: {
    per_task_usd: number
    threshold_pct: number
    action: 'notify'
  }
  plan: {
    window_threshold_pct: number
    action: 'notify'
  }
  models: {
    claude_chain: string[]
  }
  estimation: {
    use_llm_precheck: boolean
    llm_precheck_model: string
    min_confidence_to_skip_llm: number
  }
  poll_interval_seconds: number
}

export interface TaskRecord {
  id?: number
  created_at: number
  repo: string | null
  prompt_hash: string
  prompt_text: string
  model: string
  complexity: Complexity
  est_layer: EstimationLayer
  est_cost: number | null
  actual_tokens_in: number | null
  actual_tokens_out: number | null
  actual_cost: number | null
  window_pct_start: number | null
  window_pct_end: number | null
  model_switched: number
  exit_code: number | null
}

export interface EstimationResult {
  complexity: Complexity
  confidence: number
  estimated_cost: number | null
  layer_used: EstimationLayer
}

export interface PlanUsage {
  five_hour_pct: number
  five_hour_reset_at: string
  seven_day_pct: number
  fetched_at: number
}

export interface ModelPricing {
  model: string
  input_per_million: number
  output_per_million: number
  updated_at: number
}

export interface TokenCounts {
  input: number
  output: number
}
