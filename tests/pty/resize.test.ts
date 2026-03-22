import { describe, it, expect } from 'vitest'
import { calculateStatusBarLines } from '../../src/pty/resize.js'

describe('calculateStatusBarLines', () => {
  it('returns 1 for short status bar', () => {
    expect(calculateStatusBarLines(80, 80)).toBe(1)
  })

  it('returns 3 when status bar is 200 chars on 80 col terminal', () => {
    expect(calculateStatusBarLines(200, 80)).toBe(3)
  })

  it('rounds up', () => {
    expect(calculateStatusBarLines(81, 80)).toBe(2)
  })
})
