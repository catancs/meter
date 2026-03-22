import type { UserMode } from '../types.js'

export interface NotificationState {
  mode: UserMode
  thresholdPct: number
  elapsedCost: number | null
  budgetUsd: number | null
  windowPct: number | null
  nextModel: string | null
}

const YELLOW = '\x1b[33m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'
const DIM = '\x1b[2m'

export function renderNotification(state: NotificationState): string {
  let message: string

  if (state.mode === 'api' && state.elapsedCost !== null && state.budgetUsd !== null) {
    message = `${YELLOW}⚠  ${state.thresholdPct}% budget hit${RESET}  ($${state.elapsedCost.toFixed(2)} / $${state.budgetUsd.toFixed(2)})`
  } else {
    message = `${YELLOW}⚠  ${state.windowPct}% window used${RESET}`
  }

  const actions = state.nextModel
    ? `  ${BOLD}[s]${RESET}${DIM}witch to ${state.nextModel}${RESET}  ${BOLD}[d]${RESET}${DIM}ismiss${RESET}  ${BOLD}[c]${RESET}${DIM}ancel${RESET}`
    : `  ${BOLD}[d]${RESET}${DIM}ismiss${RESET}  ${BOLD}[c]${RESET}${DIM}ancel${RESET}`

  return message + actions
}
