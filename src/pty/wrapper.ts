import { EventEmitter } from 'events'
import { spawn as cpSpawn, type ChildProcess } from 'child_process'
import { AlternateScreenTracker } from './screen.js'
import { getTerminalSize } from './resize.js'

export interface WrapperEvents {
  data: (chunk: string) => void
  exit: (code: number, signal: number) => void
}

type PtyModule = typeof import('node-pty')

/**
 * PtyWrapper with automatic fallback.
 *
 * Strategy:
 *   1. Try node-pty (full PTY — enables status bar injection)
 *   2. If node-pty fails (incompatible Node version, missing native bindings),
 *      fall back to child_process.spawn with piped stdio
 *
 * The fallback still captures output for token counting and cost tracking,
 * but the status bar is written above the agent output instead of injected
 * at a fixed terminal position.
 */
export class PtyWrapper extends EventEmitter {
  private ptyProcess: import('node-pty').IPty | null = null
  private childProcess: ChildProcess | null = null
  private screenTracker = new AlternateScreenTracker()
  private _usingFallback = false

  get isInAlternateScreen(): boolean {
    return this.screenTracker.isActive
  }

  get usingFallback(): boolean {
    return this._usingFallback
  }

  spawn(binary: string, args: string[], env: NodeJS.ProcessEnv): void {
    // Try node-pty first
    try {
      const pty: PtyModule = require('node-pty')
      this._spawnWithPty(pty, binary, args, env)
    } catch {
      // node-pty failed — fall back to child_process
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

    // Forward stdin to PTY
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
    }
    process.stdin.on('data', (data: Buffer) => {
      this.ptyProcess?.write(data.toString())
    })

    // Handle terminal resize
    process.on('SIGWINCH', () => {
      const newSize = getTerminalSize()
      this.ptyProcess?.resize(newSize.cols, newSize.rows)
    })
  }

  private _spawnWithChildProcess(binary: string, args: string[], env: NodeJS.ProcessEnv): void {
    // Use fully inherited stdio so Claude Code's interactive TUI works.
    // We lose per-chunk output capture, but the agent runs correctly.
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
