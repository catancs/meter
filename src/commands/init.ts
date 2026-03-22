import { mkdir, readFile, writeFile, copyFile, chmod } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { detectShell, getShellConfigPath } from '../shell/detect.js'
import { resolveTrueBinary } from '../shell/binary-resolver.js'
import { writeShim } from '../shell/shim-writer.js'
import { injectPath, isPathAlreadyInjected } from '../shell/path-inject.js'
import { writeConfig, ensureConfigDefaults } from '../storage/config-store.js'
import { detectMode } from '../auth/detect.js'
import { readCredentials } from '../auth/credentials.js'
import { resolveOrgId } from '../tracking/plan-usage.js'
import { METER_BIN_DIR, CLAUDE_CREDENTIALS_PATH, CLAUDE_SETTINGS_PATH } from '../constants.js'
import type { UserMode } from '../types.js'

export interface InitOptions {
  meterDir: string
  trueBinary?: string
  mode?: UserMode
  skipPathInjection?: boolean
  orgId?: string | null
}

export async function runInit(opts: InitOptions): Promise<void> {
  const meterDir = opts.meterDir
  const binDir = join(meterDir, 'bin')
  await mkdir(binDir, { recursive: true })
  await mkdir(join(meterDir, 'cache'), { recursive: true })
  await mkdir(join(meterDir, 'reports'), { recursive: true })

  // Resolve true claude binary
  const trueBinary = opts.trueBinary ?? await resolveTrueBinary('claude', binDir)
  if (!trueBinary) {
    throw new Error('claude not found in PATH. Install Claude Code first.')
  }

  // Detect mode
  const mode = opts.mode ?? await detectMode({ credentialsPath: CLAUDE_CREDENTIALS_PATH })
  if (!mode) {
    throw new Error('No Claude credentials found. Run `claude` first to authenticate.')
  }

  // Resolve org_id for Plan Mode
  let orgId = opts.orgId ?? null
  if (mode === 'plan' && orgId === null) {
    const creds = await readCredentials(CLAUDE_CREDENTIALS_PATH)
    if (creds) orgId = await resolveOrgId(creds)
  }

  // Write shim
  const shimPath = join(binDir, 'claude')
  await writeShim(shimPath, trueBinary)

  // Inject PATH (skip in tests)
  if (!opts.skipPathInjection) {
    const shell = detectShell()
    const configPath = getShellConfigPath(shell)
    const already = await isPathAlreadyInjected(configPath)
    await injectPath(shell, configPath)
    if (!already) {
      console.log(`✓ Added ~/.meter/bin to PATH in ${configPath}`)
    }
  }

  // Write config
  const config = ensureConfigDefaults({
    mode,
    resolved_binaries: { claude: trueBinary },
    ...(orgId ? { org_id: orgId } : {}),
  })
  await writeConfig(join(meterDir, 'config.json'), config)

  // Install Claude Code hooks (skip in tests)
  if (!opts.skipPathInjection) {
    await installClaudeHooks(meterDir)
  }

  console.log(`✓ meter initialised (${mode} mode)`)
  console.log(`  Restart your terminal or run: source ~/.zshrc`)
}

async function installClaudeHooks(meterDir: string): Promise<void> {
  const hooksDir = join(meterDir, 'hooks')
  await mkdir(hooksDir, { recursive: true })

  // Copy hook scripts to ~/.meter/hooks/
  const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'hooks')
  for (const file of ['on-prompt.js', 'on-stop.js', 'statusline.js']) {
    try {
      await copyFile(join(srcDir, file), join(hooksDir, file))
      await chmod(join(hooksDir, file), 0o755)
    } catch {
      // If source doesn't exist (running from dist), try the dist/hooks path
      const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'hooks')
      try {
        await copyFile(join(distDir, file), join(hooksDir, file))
        await chmod(join(hooksDir, file), 0o755)
      } catch {
        console.warn(`  ⚠ Could not copy ${file} — skipping hook installation`)
      }
    }
  }

  // Update Claude Code settings.json to add meter hooks
  try {
    let settings: Record<string, any> = {}
    try {
      settings = JSON.parse(await readFile(CLAUDE_SETTINGS_PATH, 'utf-8'))
    } catch {
      // settings file doesn't exist yet — we'll create it
    }

    // Add UserPromptSubmit hook if not already present
    const meterHookCommand = `node "${join(hooksDir, 'on-prompt.js')}"`
    if (!settings.hooks) settings.hooks = {}
    if (!settings.hooks.UserPromptSubmit) settings.hooks.UserPromptSubmit = []

    const alreadyHasHook = settings.hooks.UserPromptSubmit.some((h: any) =>
      h.hooks?.some((hh: any) => hh.command?.includes('meter'))
    )

    if (!alreadyHasHook) {
      settings.hooks.UserPromptSubmit.push({
        hooks: [{ type: 'command', command: meterHookCommand }]
      })
      console.log('✓ Added meter estimation hook to Claude Code')
    }

    // Add Stop hook for post-response cost tracking
    const meterStopCommand = `node "${join(hooksDir, 'on-stop.js')}"`
    if (!settings.hooks.Stop) settings.hooks.Stop = []

    const alreadyHasStopHook = settings.hooks.Stop.some((h: any) =>
      h.hooks?.some((hh: any) => hh.command?.includes('meter'))
    )

    if (!alreadyHasStopHook) {
      settings.hooks.Stop.push({
        hooks: [{ type: 'command', command: meterStopCommand }]
      })
      console.log('✓ Added meter cost tracking hook to Claude Code')
    }

    // Add/update statusline command
    const meterStatuslineCommand = `node "${join(hooksDir, 'statusline.js')}"`
    const existingStatusLine = settings.statusLine

    if (!existingStatusLine || existingStatusLine.command?.includes('meter')) {
      // No existing statusline or it's ours — set it
      settings.statusLine = { type: 'command', command: meterStatuslineCommand }
      console.log('✓ Added meter statusline to Claude Code')
    } else {
      // There's an existing statusline from another tool — chain them
      // Create a wrapper that runs both
      const chainCommand = `${existingStatusLine.command} && echo " │ " && ${meterStatuslineCommand}`
      settings.statusLine = { type: 'command', command: chainCommand }
      console.log('✓ Chained meter statusline with existing statusline')
    }

    await mkdir(dirname(CLAUDE_SETTINGS_PATH), { recursive: true })
    await writeFile(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
  } catch (err) {
    console.warn(`  ⚠ Could not update Claude Code settings: ${err}`)
  }
}
