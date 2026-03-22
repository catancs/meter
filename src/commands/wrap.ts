import { PtyWrapper } from '../pty/wrapper.js'
import { readConfig } from '../storage/config-store.js'
import { openDb, insertTask } from '../storage/db.js'
import { runEstimationPipeline } from '../estimation/pipeline.js'
import { injectStatusBar, renderStatusBar } from '../ui/statusbar.js'
import { renderNotification } from '../ui/notification.js'
import { waitForKeypress } from '../ui/keypress.js'
import { parseTokensFromOutput, estimateInputTokens } from '../tracking/tokens.js'
import { fetchPlanUsage, formatResetCountdown } from '../tracking/plan-usage.js'
import { readCredentials, watchCredentials } from '../auth/credentials.js'
import { calculateStatusBarLines } from '../pty/resize.js'
import {
  CONFIG_PATH, HISTORY_DB_PATH, CLAUDE_CREDENTIALS_PATH
} from '../constants.js'
import { execSync } from 'child_process'
import { createHash } from 'crypto'
import type { StatusBarState } from '../ui/statusbar.js'
import type { Complexity } from '../types.js'

export async function runWrap(args: string[]): Promise<void> {
  const trueBinary = args[0]
  const agentArgs = args.slice(1)
  const prompt = agentArgs.join(' ')

  if (!trueBinary) {
    console.error('[meter] wrap: missing binary argument')
    process.exit(1)
  }

  const config = await readConfig(CONFIG_PATH)
  if (!config) {
    // No config — run agent directly without wrapping
    const w = new PtyWrapper()
    w.spawn(trueBinary, agentArgs, process.env as NodeJS.ProcessEnv)
    await new Promise<void>(resolve => w.on('exit', () => resolve()))
    return
  }

  const db = await openDb(HISTORY_DB_PATH)

  // Get repo identifier
  let repo: string | null = null
  try { repo = execSync('git remote get-url origin 2>/dev/null').toString().trim() } catch {}
  if (!repo) { try { repo = process.cwd() } catch {} }

  // Get repo file count for estimation
  let repoFileCount = 100
  try { repoFileCount = parseInt(execSync('git ls-files 2>/dev/null | wc -l').toString().trim(), 10) || 100 } catch {}

  // Run estimation (non-blocking display)
  const estimation = await runEstimationPipeline({
    prompt,
    repoFileCount,
    db,
    repo,
    config: config.estimation,
  })

  // Fetch initial plan usage if Plan Mode
  let planUsage: Awaited<ReturnType<typeof fetchPlanUsage>> = null
  let creds: Awaited<ReturnType<typeof readCredentials>> = null
  if (config.mode === 'plan' && config.org_id) {
    creds = await readCredentials(CLAUDE_CREDENTIALS_PATH)
    if (creds) planUsage = await fetchPlanUsage(config.org_id, creds)
  }

  // State for status bar
  const state: StatusBarState = {
    model: config.models.claude_chain[0],
    estimatedCost: estimation.estimated_cost,
    complexity: estimation.complexity as Complexity,
    mode: config.mode,
    elapsedCost: 0,
    budgetUsd: config.budget.per_task_usd,
    windowPct: planUsage?.five_hour_pct ?? null,
    windowResetIn: planUsage ? formatResetCountdown(planUsage.five_hour_reset_at) : null,
  }

  // Spawn agent in PTY — declare BEFORE updateBar so closure can reference it safely
  const wrapper = new PtyWrapper()
  let outputBuffer = ''
  let thresholdNotified = false
  let modelSwitched = 0

  // Status bar update function — adapts to PTY vs fallback mode
  let statusBarShown = false
  const updateBar = () => {
    if (wrapper.isInAlternateScreen) return
    const content = renderStatusBar(state)

    if (wrapper.usingFallback) {
      // Fallback mode: only show status bar once as a header, then on threshold
      if (!statusBarShown) {
        process.stdout.write(content + '\n')
        statusBarShown = true
      }
    } else {
      // PTY mode: inject at fixed position via escape codes
      const N = calculateStatusBarLines(content.replace(/\x1b\[[^m]*m/g, '').length, process.stdout.columns ?? 80)
      injectStatusBar(content, N)
    }
  }

  // Watch for credential refresh
  if (config.mode === 'plan') {
    watchCredentials(CLAUDE_CREDENTIALS_PATH, async (newCreds) => {
      if (newCreds) creds = newCreds
    })
  }

  // Plan usage polling (15s during active task)
  let pollInterval: NodeJS.Timeout | null = null
  if (config.mode === 'plan' && config.org_id && creds) {
    pollInterval = setInterval(async () => {
      if (!creds || !config.org_id) return
      const usage = await fetchPlanUsage(config.org_id, creds)
      if (usage) {
        state.windowPct = usage.five_hour_pct
        state.windowResetIn = formatResetCountdown(usage.five_hour_reset_at)
        updateBar()
      }
    }, 15_000)
  }

  // Per-prompt estimation: when user submits a new prompt inside the interactive
  // session, re-run the estimation pipeline and update the status bar
  let lastPrompt = prompt // initial prompt from CLI args
  wrapper.on('input', async (newPrompt: string) => {
    lastPrompt = newPrompt
    const newEstimation = await runEstimationPipeline({
      prompt: newPrompt,
      repoFileCount,
      db,
      repo,
      config: config.estimation,
    })
    state.estimatedCost = newEstimation.estimated_cost
    state.complexity = newEstimation.complexity as Complexity
    // Reset elapsed cost for the new prompt
    state.elapsedCost = 0
    thresholdNotified = false
    statusBarShown = false // allow fallback mode to re-print
    updateBar()
  })

  wrapper.on('data', (chunk: string) => {
    outputBuffer += chunk
    // Rough running cost estimate from output volume
    state.elapsedCost = (state.elapsedCost ?? 0) + (chunk.length / 4 / 1_000_000) * 15
    updateBar()

    // Check threshold
    if (!thresholdNotified) {
      const exceeded = config.mode === 'api'
        ? ((state.elapsedCost ?? 0) / config.budget.per_task_usd) * 100 >= config.budget.threshold_pct
        : (state.windowPct ?? 0) >= config.plan.window_threshold_pct

      if (exceeded) {
        thresholdNotified = true
        handleThreshold()
      }
    }
  })

  async function handleThreshold() {
    // config is guaranteed non-null here (we returned early above if null)
    const cfg = config!
    const nextModel = cfg.models.claude_chain[1] ?? null
    const notification = renderNotification({
      mode: cfg.mode,
      thresholdPct: cfg.mode === 'api' ? cfg.budget.threshold_pct : cfg.plan.window_threshold_pct,
      elapsedCost: state.elapsedCost,
      budgetUsd: cfg.budget.per_task_usd,
      windowPct: state.windowPct,
      nextModel,
    })

    process.stdout.write('\n' + notification + '\n')

    const action = await waitForKeypress(['s', 'd', 'c'], 0)

    if (action === 'c') {
      wrapper.kill()
    } else if (action === 's' && nextModel) {
      process.stdout.write(`\n↻ restarting with ${nextModel}  (context will reset — press c within 5s to cancel)\n`)
      const cancel = await waitForKeypress(['c'], 5_000)
      if (cancel !== 'c') {
        wrapper.kill()
        state.model = nextModel
        modelSwitched = 1
        wrapper.spawn(trueBinary, [`--model`, nextModel, ...agentArgs.slice(1)], process.env as NodeJS.ProcessEnv)
      }
    }
    // 'd' = dismiss, do nothing
  }

  const taskStart = Date.now()

  // Reserve status bar line and spawn
  process.stdout.write('\n')
  updateBar()
  wrapper.spawn(trueBinary, agentArgs, process.env as NodeJS.ProcessEnv)

  const exitCode = await new Promise<number>(resolve => {
    wrapper.on('exit', (code: number) => resolve(code))
  })

  if (pollInterval) clearInterval(pollInterval)

  // Parse final token counts
  const tokens = parseTokensFromOutput(outputBuffer)
  const finalPrompt = lastPrompt || prompt
  const promptHash = createHash('sha256').update(finalPrompt.toLowerCase().trim()).digest('hex').slice(0, 16)

  insertTask(db, {
    created_at: taskStart,
    repo,
    prompt_hash: promptHash,
    prompt_text: finalPrompt,
    model: state.model,
    complexity: estimation.complexity as Complexity,
    est_layer: estimation.layer_used,
    est_cost: estimation.estimated_cost,
    actual_tokens_in: tokens?.input ?? estimateInputTokens(prompt.length),
    actual_tokens_out: tokens?.output ?? null,
    actual_cost: config.mode === 'api' ? (state.elapsedCost ?? null) : null,
    window_pct_start: planUsage?.five_hour_pct ?? null,
    window_pct_end: state.windowPct,
    model_switched: modelSwitched,
    exit_code: exitCode,
  })

  db.close()
  process.exit(exitCode)
}
