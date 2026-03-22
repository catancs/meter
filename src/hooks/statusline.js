#!/usr/bin/env node
/**
 * meter — Statusline command for Claude Code
 *
 * Shows two things:
 * 1. The latest estimation (from on-prompt.js) — what the current prompt is expected to cost
 * 2. Session actuals (from on-stop.js) — what you've actually spent this session
 *
 * Output format: meter ~$0.09 medium | session $0.47 (5) | last $0.12
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const CACHE_DIR = path.join(os.homedir(), '.meter', 'cache');
const ESTIMATE_FILE = path.join(CACHE_DIR, 'latest-estimate.json');
const SESSION_FILE = path.join(CACHE_DIR, 'session-costs.json');

try {
  const parts = [];

  // Part 1: Latest estimation
  try {
    const est = JSON.parse(fs.readFileSync(ESTIMATE_FILE, 'utf-8'));
    const age = Date.now() - (est.timestamp || 0);
    if (age < 600_000) {
      parts.push(`~$${est.cost.toFixed(2)} ${est.complexity}`);
    }
  } catch {}

  // Part 2: Session actuals
  try {
    const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    const age = Date.now() - (session.last_activity || 0);
    if (age < 1_800_000 && session.prompts > 0) {
      parts.push(`session $${session.total_cost.toFixed(2)} (${session.prompts})`);
      if (session.last_cost > 0) {
        parts.push(`last $${session.last_cost.toFixed(2)}`);
      }
    }
  } catch {}

  if (parts.length === 0) {
    process.stdout.write('meter: ready');
  } else {
    process.stdout.write('meter ' + parts.join(' | '));
  }
} catch {
  process.stdout.write('meter: ready');
}
