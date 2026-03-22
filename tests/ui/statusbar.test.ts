import { describe, it, expect } from 'vitest'
import { renderStatusBar, StatusBarState } from '../../src/ui/statusbar.js'

describe('renderStatusBar', () => {
  const base: StatusBarState = {
    model: 'claude-opus-4',
    estimatedCost: 0.38,
    complexity: 'heavy',
    mode: 'api',
    elapsedCost: 0.12,
    budgetUsd: 0.50,
    windowPct: null,
    windowResetIn: null,
  }

  it('renders API mode with dollar amounts', () => {
    const result = renderStatusBar(base)
    expect(result).toContain('claude-opus-4')
    expect(result).toContain('$0.12')
    expect(result).toContain('$0.50')
  })

  it('renders Plan mode with percentage', () => {
    const state: StatusBarState = { ...base, mode: 'plan', windowPct: 68, windowResetIn: '2h 14m' }
    const result = renderStatusBar(state)
    expect(result).toContain('68%')
    expect(result).toContain('2h 14m')
  })

  it('includes complexity label', () => {
    const result = renderStatusBar(base)
    expect(result).toContain('heavy')
  })

  it('shows usage unavailable when no data', () => {
    const state: StatusBarState = { ...base, mode: 'plan', windowPct: null }
    const result = renderStatusBar(state)
    expect(result).toContain('usage unavailable')
  })
})
