import ansiEscapes from 'ansi-escapes'
import type { Complexity, UserMode } from '../types.js'

export interface StatusBarState {
  model: string
  estimatedCost: number | null
  complexity: Complexity | null
  mode: UserMode
  elapsedCost: number | null
  budgetUsd: number | null
  windowPct: number | null
  windowResetIn: string | null
}

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const CYAN = '\x1b[36m'

function progressBar(pct: number, width = 12): string {
  const filled = Math.round((pct / 100) * width)
  const empty = width - filled
  const color = pct >= 80 ? RED : pct >= 60 ? YELLOW : GREEN
  return `${color}${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET}`
}

export function renderStatusBar(state: StatusBarState): string {
  const parts: string[] = [`${CYAN}◆ meter${RESET}`, `${BOLD}${state.model}${RESET}`]

  if (state.estimatedCost !== null) {
    parts.push(`${DIM}~$${state.estimatedCost.toFixed(2)}${RESET}`)
  }
  if (state.complexity) {
    parts.push(`${DIM}${state.complexity}${RESET}`)
  }

  parts.push('│')

  if (state.mode === 'api' && state.elapsedCost !== null && state.budgetUsd !== null) {
    const pct = (state.elapsedCost / state.budgetUsd) * 100
    parts.push(progressBar(pct))
    parts.push(`$${state.elapsedCost.toFixed(2)} / $${state.budgetUsd.toFixed(2)}`)
  } else if (state.mode === 'plan' && state.windowPct !== null) {
    parts.push(progressBar(state.windowPct))
    parts.push(`${state.windowPct}% 5hr window`)
    if (state.windowResetIn) parts.push(`${DIM}reset in ${state.windowResetIn}${RESET}`)
  } else {
    parts.push(`${DIM}usage unavailable${RESET}`)
  }

  return parts.join('  ')
}

export function injectStatusBar(content: string, linesAbove: number): void {
  process.stdout.write(
    ansiEscapes.cursorSavePosition +
    ansiEscapes.cursorUp(linesAbove) +
    ansiEscapes.eraseLine +
    content +
    ansiEscapes.cursorRestorePosition
  )
}

export function clearStatusBar(linesAbove: number): void {
  process.stdout.write(
    ansiEscapes.cursorSavePosition +
    ansiEscapes.cursorUp(linesAbove) +
    ansiEscapes.eraseLine +
    ansiEscapes.cursorRestorePosition
  )
}
