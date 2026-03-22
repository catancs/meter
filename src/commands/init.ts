import { mkdir } from 'fs/promises'
import { join } from 'path'
import { detectShell, getShellConfigPath } from '../shell/detect.js'
import { resolveTrueBinary } from '../shell/binary-resolver.js'
import { writeShim } from '../shell/shim-writer.js'
import { injectPath, isPathAlreadyInjected } from '../shell/path-inject.js'
import { writeConfig, ensureConfigDefaults } from '../storage/config-store.js'
import { detectMode } from '../auth/detect.js'
import { readCredentials } from '../auth/credentials.js'
import { resolveOrgId } from '../tracking/plan-usage.js'
import { METER_BIN_DIR, CLAUDE_CREDENTIALS_PATH } from '../constants.js'
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

  console.log(`✓ meter initialised (${mode} mode)`)
  console.log(`  Restart your terminal or run: source ~/.zshrc`)
}
