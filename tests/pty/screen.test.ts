import { describe, it, expect } from 'vitest'
import { AlternateScreenTracker } from '../../src/pty/screen.js'

describe('AlternateScreenTracker', () => {
  it('starts not in alternate screen', () => {
    const tracker = new AlternateScreenTracker()
    expect(tracker.isActive).toBe(false)
  })

  it('detects enter alternate screen sequence', () => {
    const tracker = new AlternateScreenTracker()
    tracker.process('\x1b[?1049h')
    expect(tracker.isActive).toBe(true)
  })

  it('detects exit alternate screen sequence', () => {
    const tracker = new AlternateScreenTracker()
    tracker.process('\x1b[?1049h')
    tracker.process('\x1b[?1049l')
    expect(tracker.isActive).toBe(false)
  })

  it('handles sequences embedded in regular output', () => {
    const tracker = new AlternateScreenTracker()
    tracker.process('some output \x1b[?1049h more output')
    expect(tracker.isActive).toBe(true)
  })

  it('ignores unrelated escape sequences', () => {
    const tracker = new AlternateScreenTracker()
    tracker.process('\x1b[2J\x1b[H\x1b[0m')
    expect(tracker.isActive).toBe(false)
  })
})
