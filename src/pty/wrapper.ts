import * as pty from 'node-pty'
import { EventEmitter } from 'events'
import { AlternateScreenTracker } from './screen.js'
import { getTerminalSize } from './resize.js'

export interface WrapperEvents {
  data: (chunk: string) => void
  exit: (code: number, signal: number) => void
}

export class PtyWrapper extends EventEmitter {
  private ptyProcess: pty.IPty | null = null
  private screenTracker = new AlternateScreenTracker()

  get isInAlternateScreen(): boolean {
    return this.screenTracker.isActive
  }

  spawn(binary: string, args: string[], env: NodeJS.ProcessEnv): void {
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
    process.stdin.setRawMode(true)
    process.stdin.on('data', (data: Buffer) => {
      this.ptyProcess?.write(data.toString())
    })

    // Handle terminal resize
    process.on('SIGWINCH', () => {
      const newSize = getTerminalSize()
      this.ptyProcess?.resize(newSize.cols, newSize.rows)
    })
  }

  write(data: string): void {
    this.ptyProcess?.write(data)
  }

  kill(signal = 'SIGTERM'): void {
    this.ptyProcess?.kill(signal)
  }

  resize(cols: number, rows: number): void {
    this.ptyProcess?.resize(cols, rows)
  }
}
