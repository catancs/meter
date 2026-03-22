import { appendFile, mkdir } from 'fs/promises'
import { dirname } from 'path'
import { ERRORS_LOG_PATH, CLAUDE_BOOTSTRAP_API, CLAUDE_USAGE_API } from '../constants.js'
import type { PlanUsage } from '../types.js'
import type { ClaudeCredentials } from '../auth/credentials.js'

async function logError(message: string): Promise<void> {
  await mkdir(dirname(ERRORS_LOG_PATH), { recursive: true })
  await appendFile(ERRORS_LOG_PATH, `[${new Date().toISOString()}] ${message}\n`)
}

export async function resolveOrgId(creds: ClaudeCredentials): Promise<string | null> {
  try {
    const res = await fetch(CLAUDE_BOOTSTRAP_API, {
      headers: { Authorization: `Bearer ${creds.accessToken}` }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json() as { account?: { memberships?: Array<{ organization?: { id: string } }> } }
    return data?.account?.memberships?.[0]?.organization?.id ?? null
  } catch (err) {
    await logError(`bootstrap failed: ${err}`)
    return null
  }
}

export async function fetchPlanUsage(orgId: string, creds: ClaudeCredentials): Promise<PlanUsage | null> {
  try {
    const res = await fetch(`${CLAUDE_USAGE_API}/${orgId}/usage`, {
      headers: { Authorization: `Bearer ${creds.accessToken}` }
    })
    if (!res.ok) {
      await logError(`usage API returned ${res.status}`)
      return null
    }
    const data = await res.json() as {
      five_hour?: { utilization_pct: number; reset_at: string }
      seven_day?: { utilization_pct: number }
    }
    return {
      five_hour_pct: data.five_hour?.utilization_pct ?? 0,
      five_hour_reset_at: data.five_hour?.reset_at ?? '',
      seven_day_pct: data.seven_day?.utilization_pct ?? 0,
      fetched_at: Date.now(),
    }
  } catch (err) {
    await logError(`fetchPlanUsage failed: ${err}`)
    return null
  }
}

export function formatResetCountdown(resetAt: string): string {
  const ms = new Date(resetAt).getTime() - Date.now()
  if (ms <= 0) return 'resetting...'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
