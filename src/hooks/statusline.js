#!/usr/bin/env node
/**
 * meter — Statusline command for Claude Code
 *
 * Shows:
 * 1. Estimation for the current prompt
 * 2. Session actuals (total spend, prompt count, last cost)
 * 3. Conservative model nudge (only when clearly appropriate)
 *
 * Output: meter ~$0.09 medium | session $0.47 (5) | last $0.12 | sonnet could save ~$0.07
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const CACHE_DIR = path.join(os.homedir(), '.meter', 'cache');
const CONFIG_FILE = path.join(os.homedir(), '.meter', 'config.json');
const ESTIMATE_FILE = path.join(CACHE_DIR, 'latest-estimate.json');
const SESSION_FILE = path.join(CACHE_DIR, 'session-costs.json');

// Pricing per million tokens (output, which dominates cost)
const MODEL_COST_RATIO = {
  'opus': { output: 75 },
  'sonnet': { output: 15 },
  'haiku': { output: 1.25 },
};

/**
 * Conservative model nudge rules:
 * - Only nudge ONE tier down (never skip tiers)
 * - Only for low/medium complexity (never heavy/critical)
 * - Only when heuristic confidence was high
 * - Opus on low task → suggest Sonnet
 * - Opus on medium task → suggest Sonnet
 * - Sonnet on low task → suggest Haiku
 * - Everything else → no nudge
 */
function getModelNudge(complexity, currentModel, lastCost) {
  if (!complexity || !currentModel || !lastCost || lastCost <= 0) return null;

  const model = currentModel.toLowerCase();
  const isOpus = model.includes('opus');
  const isSonnet = model.includes('sonnet');

  if (complexity === 'heavy' || complexity === 'critical') return null;

  if (isOpus && (complexity === 'low' || complexity === 'medium')) {
    // Opus → Sonnet: output cost ratio is 75/15 = 5x
    const sonnetCost = lastCost / 5;
    const savings = lastCost - sonnetCost;
    if (savings >= 0.01) {
      return `sonnet: ~$${sonnetCost.toFixed(2)} (save $${savings.toFixed(2)})`;
    }
  }

  if (isSonnet && complexity === 'low') {
    // Sonnet → Haiku: output cost ratio is 15/1.25 = 12x
    const haikuCost = lastCost / 12;
    const savings = lastCost - haikuCost;
    if (savings >= 0.01) {
      return `haiku: ~$${haikuCost.toFixed(2)} (save $${savings.toFixed(2)})`;
    }
  }

  return null;
}

try {
  const parts = [];
  let complexity = null;
  let currentModel = null;

  // Read config for current model
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    currentModel = config.models?.claude_chain?.[0] || null;
  } catch {}

  // Part 1: Latest estimation
  try {
    const est = JSON.parse(fs.readFileSync(ESTIMATE_FILE, 'utf-8'));
    const age = Date.now() - (est.timestamp || 0);
    if (age < 600_000) {
      parts.push(`~$${est.cost.toFixed(2)} ${est.complexity}`);
      complexity = est.complexity;
    }
  } catch {}

  // Part 2: Session actuals
  let lastCost = 0;
  try {
    const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    const age = Date.now() - (session.last_activity || 0);
    if (age < 1_800_000 && session.prompts > 0) {
      parts.push(`session $${session.total_cost.toFixed(2)} (${session.prompts})`);
      if (session.last_cost > 0) {
        parts.push(`last $${session.last_cost.toFixed(2)}`);
        lastCost = session.last_cost;
      }
    }
  } catch {}

  // Part 3: Model nudge (conservative, only when appropriate)
  if (complexity && currentModel && lastCost > 0) {
    const nudge = getModelNudge(complexity, currentModel, lastCost);
    if (nudge) {
      parts.push(nudge);
    }
  }

  if (parts.length === 0) {
    process.stdout.write('meter: ready');
  } else {
    process.stdout.write('meter ' + parts.join(' | '));
  }
} catch {
  process.stdout.write('meter: ready');
}
