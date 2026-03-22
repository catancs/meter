#!/usr/bin/env node
/**
 * meter — Statusline command for Claude Code
 *
 * Reads the latest estimation from ~/.meter/cache/latest-estimate.json
 * and outputs a formatted status string for Claude Code's bottom bar.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ESTIMATE_FILE = path.join(os.homedir(), '.meter', 'cache', 'latest-estimate.json');

try {
  if (!fs.existsSync(ESTIMATE_FILE)) {
    process.stdout.write('meter: ready');
    process.exit(0);
  }

  const data = JSON.parse(fs.readFileSync(ESTIMATE_FILE, 'utf-8'));
  const age = Date.now() - (data.timestamp || 0);

  // If estimate is older than 10 minutes, show stale indicator
  if (age > 600_000) {
    process.stdout.write('meter: idle');
    process.exit(0);
  }

  const cost = data.cost != null ? `~$${data.cost.toFixed(2)}` : '?';
  const complexity = data.complexity || '?';
  const prompt = (data.prompt || '').slice(0, 30);

  process.stdout.write(`meter ${cost} ${complexity} │ ${prompt}`);
} catch {
  process.stdout.write('meter: ready');
}
