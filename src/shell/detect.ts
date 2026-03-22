import { homedir } from 'os'
import { join } from 'path'

export type ShellType = 'zsh' | 'bash' | 'fish' | 'nushell'

export function detectShell(): ShellType {
  const shell = process.env.SHELL ?? ''
  if (shell.includes('zsh')) return 'zsh'
  if (shell.includes('fish')) return 'fish'
  if (shell.includes('nu')) return 'nushell'
  return 'bash'
}

export function getShellConfigPath(shell: ShellType): string {
  const home = homedir()
  const paths: Record<ShellType, string> = {
    zsh: join(home, '.zshrc'),
    bash: join(home, '.bashrc'),
    fish: join(home, '.config', 'fish', 'config.fish'),
    nushell: join(home, '.config', 'nushell', 'env.nu'),
  }
  return paths[shell]
}

export function getPathInjectLine(shell: ShellType): string {
  const lines: Record<ShellType, string> = {
    zsh: `export PATH="$HOME/.meter/bin:$PATH" # added by meter`,
    bash: `export PATH="$HOME/.meter/bin:$PATH" # added by meter`,
    fish: `fish_add_path ~/.meter/bin # added by meter`,
    nushell: `$env.PATH = ($env.PATH | prepend ($env.HOME + "/.meter/bin")) # added by meter`,
  }
  return lines[shell]
}
