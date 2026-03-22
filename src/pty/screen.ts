const ENTER_ALT_SCREEN = '\x1b[?1049h'
const EXIT_ALT_SCREEN = '\x1b[?1049l'

export class AlternateScreenTracker {
  private _isActive = false

  get isActive(): boolean {
    return this._isActive
  }

  process(chunk: string): void {
    if (chunk.includes(ENTER_ALT_SCREEN)) this._isActive = true
    if (chunk.includes(EXIT_ALT_SCREEN)) this._isActive = false
  }
}
