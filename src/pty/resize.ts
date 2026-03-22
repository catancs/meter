export interface TerminalSize {
  cols: number
  rows: number
}

export function getTerminalSize(): TerminalSize {
  return {
    cols: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  }
}

export function calculateStatusBarLines(statusBarCharCount: number, cols: number): number {
  return Math.ceil(statusBarCharCount / cols)
}
