import { EventEmitter } from 'events'
import { spawn as cpSpawn, type ChildProcess } from 'child_process'
import { AlternateScreenTracker } from './screen.js'
import { getTerminalSize } from './resize.js'

export interface WrapperEvents {
  data: (chunk: string) => void
  input: (prompt: string) => void
  exit: (code: number, signal: number) => void
}

type PtyModule = typeof import('node-pty')

/**
 * PtyWrapper with automatic fallback and input capture.
 *
 * In PTY mode:
 *   - Captures all user input keystroke by keystroke
 *   - Buffers input and emits 'input' event on Enter (prompt submission)
 *   - This enables per-prompt estimation during interactive sessions
 *
 * In fallback mode:
 *   - stdio is inherited, no input capture possible
 */
export class PtyWrapper extends EventEmitter {
  private ptyProcess: import('node-pty').IPty | null = null
  private childProcess: ChildProcess | null = null
  private screenTracker = new AlternateScreenTracker()
  private _usingFallback = false
  private inputBuffer = ''

  get isInAlternateScreen(): boolean {
    return this.screenTracker.isActive
  }

  get usingFallback(): boolean {
    return this._usingFallback
  }

  spawn(binary: string, args: string[], env: NodeJS.ProcessEnv): void {
    try {
      const pty: PtyModule = require('node-pty')
      this._spawnWithPty(pty, binary, args, env)
    } catch {
      this._usingFallback = true
      this._spawnWithChildProcess(binary, args, env)
    }
  }

  private _spawnWithPty(pty: PtyModule, binary: string, args: string[], env: NodeJS.ProcessEnv): void {
    const size = getTerminalSize()

    this.ptyProcess = pty.spawn(binary, args, {
      name: process.env.TERM ?? 'xterm-256color',
      cols: size.cols,
      rows: size.rows,
      env: { ...env },
      cwd: process.cwd(),
    })

    this.ptyProcess.onData((data: string) => {
      this.screenTracker.process(data)
      this.emit('data', data)
      process.stdout.write(data)
    })

    this.ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
      this.emit('exit', exitCode, signal ?? 0)
    })

    // Forward stdin to PTY and capture input for per-prompt estimation
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
    }
    process.stdin.on('data', (data: Buffer) => {
      const str = data.toString()
      this.ptyProcess?.write(str)

      // Track user input for prompt detection
      for (const char of str) {
        if (char === '\r' || char === '\n') {
          // Enter pressed — emit the buffered input as a prompt
          const prompt = this.inputBuffer.trim()
          if (prompt.length > 0) {
            this.emit('input', prompt)
          }
          this.inputBuffer = ''
        } else if (char === '\x7f' || char === '\b') {
          // Backspace — remove last char from buffer
          this.inputBuffer = this.inputBuffer.slice(0, -1)
        } else if (char === '\x03') {
          // Ctrl+C — clear buffer
          this.inputBuffer = ''
        } else if (char === '\x15') {
          // Ctrl+U — clear line
          this.inputBuffer = ''
        } else if (char.charCodeAt(0) >= 32) {
          // Printable character — append to buffer
          this.inputBuffer += char
        }
        // Ignore other control characters (arrows, escape sequences, etc.)
      }
    })

    // Handle terminal resize
    process.on('SIGWINCH', () => {
      const newSize = getTerminalSize()
      this.ptyProcess?.resize(newSize.cols, newSize.rows)
    })
  }

  private _spawnWithChildProcess(binary: string, args: string[], env: NodeJS.ProcessEnv): void {
    this.childProcess = cpSpawn(binary, args, {
      env: { ...env },
      cwd: process.cwd(),
      stdio: 'inherit',
    })

    this.childProcess.on('exit', (code, signal) => {
      this.emit('exit', code ?? 1, signal ? 1 : 0)
    })
  }

  write(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data)
    } else if (this.childProcess) {
      this.childProcess.stdin?.write(data)
    }
  }

  kill(signal: NodeJS.Signals = 'SIGTERM'): void {
    if (this.ptyProcess) {
      this.ptyProcess.kill(signal)
    } else if (this.childProcess) {
      this.childProcess.kill(signal)
    }
  }

  resize(cols: number, rows: number): void {
    this.ptyProcess?.resize(cols, rows)
  }
}
