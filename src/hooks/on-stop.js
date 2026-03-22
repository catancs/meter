#!/usr/bin/env node
/**
 * meter — Stop hook
 *
 * Fires after Claude Code finishes responding to a prompt.
 * Reads token usage from the response, calculates actual cost,
 * and updates the session tracker in ~/.meter/cache/session-costs.json
 * The statusline reads this to show actual costs.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const METER_DIR = path.join(os.homedir(), '.meter');
const CACHE_DIR = path.join(METER_DIR, 'cache');
const SESSION_FILE = path.join(CACHE_DIR, 'session-costs.json');
const CONFIG_FILE = path.join(METER_DIR, 'config.json');

// Default pricing (per million tokens)
const PRICING = {
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-haiku-4-20250307': { input: 0.25, output: 1.25 },
  'default': { input: 15, output: 75 },
};

try {
  const input = fs.readFileSync(0, 'utf-8').trim();
  if (!input) process.exit(0);

  let data;
  try { data = JSON.parse(input); } catch { process.exit(0); }

  // Extract token usage from stop event data
  const tokensIn = data.usage?.input_tokens || data.input_tokens || 0;
  const tokensOut = data.usage?.output_tokens || data.output_tokens || 0;
  const totalTokens = tokensIn + tokensOut;

  // If no token data, estimate from response length
  const responseLen = (data.response || data.message || '').length;
  const estimatedTokensOut = tokensOut || Math.ceil(responseLen / 4);

  // Get model and pricing
  let model = 'default';
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    model = config.models?.claude_chain?.[0] || 'default';
  } catch {}

  const pricing = PRICING[model] || PRICING['default'];
  const cost = ((tokensIn || 500) / 1_000_000) * pricing.input +
               ((estimatedTokensOut || 200) / 1_000_000) * pricing.output;

  // Load or create session tracker
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  let session = { prompts: 0, total_cost: 0, last_cost: 0, heaviest_cost: 0, started_at: Date.now() };

  try {
    const existing = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    // If last activity was more than 30 minutes ago, start a new session
    const age = Date.now() - (existing.last_activity || 0);
    if (age < 1_800_000) {
      session = existing;
    }
  } catch {}

  // Update session
  session.prompts += 1;
  session.last_cost = cost;
  session.total_cost += cost;
  session.heaviest_cost = Math.max(session.heaviest_cost, cost);
  session.last_activity = Date.now();

  fs.writeFileSync(SESSION_FILE, JSON.stringify(session));
} catch {
  // Never block Claude Code
  process.exit(0);
}
