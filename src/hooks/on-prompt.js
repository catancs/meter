#!/usr/bin/env node
/**
 * meter — UserPromptSubmit hook
 *
 * Runs when user submits a prompt in Claude Code.
 * Executes the estimation pipeline and writes result to ~/.meter/cache/latest-estimate.json
 * The statusline command reads this file to display the estimate.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const METER_DIR = path.join(os.homedir(), '.meter');
const CACHE_DIR = path.join(METER_DIR, 'cache');
const ESTIMATE_FILE = path.join(CACHE_DIR, 'latest-estimate.json');
const CONFIG_FILE = path.join(METER_DIR, 'config.json');

// Keyword weights for heuristic scoring
const KEYWORD_WEIGHTS = {
  'refactor entire': 0.9, 'rewrite': 0.85, 'migrate': 0.8,
  'refactor': 0.7, 'implement': 0.6, 'add feature': 0.55,
  'add tests': 0.5, 'add': 0.4, 'update': 0.35,
  'fix': 0.3, 'debug': 0.3, 'change': 0.25,
  'rename': 0.2, 'fix typo': 0.05, 'typo': 0.05,
};

const COST_BY_COMPLEXITY = { low: 0.02, medium: 0.09, heavy: 0.38, critical: 0.80 };

function scorePrompt(prompt) {
  const lower = prompt.toLowerCase();

  let keywordScore = 0.35;
  // Longest match wins
  const sorted = Object.entries(KEYWORD_WEIGHTS).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, weight] of sorted) {
    if (lower.includes(keyword)) {
      keywordScore = Math.max(keywordScore, weight);
      break;
    }
  }

  // Repo file count
  let fileCount = 100;
  try { fileCount = parseInt(execSync('git ls-files 2>/dev/null | wc -l').toString().trim(), 10) || 100; } catch {}

  const sizeModifier = Math.min(fileCount / 500, 0.2);
  const rawScore = Math.min(keywordScore + sizeModifier, 1.0);

  let complexity = 'low';
  if (rawScore >= 0.75) complexity = 'heavy';
  else if (rawScore >= 0.55) complexity = 'medium';

  const cost = COST_BY_COMPLEXITY[complexity];
  return { complexity, cost, prompt: prompt.slice(0, 80) };
}

try {
  // Read prompt from stdin (Claude Code pipes it)
  const input = fs.readFileSync(0, 'utf-8').trim();
  let prompt = '';

  try {
    const parsed = JSON.parse(input);
    prompt = parsed.prompt || parsed.message || input;
  } catch {
    prompt = input;
  }

  if (!prompt) process.exit(0);

  const estimate = scorePrompt(prompt);
  estimate.timestamp = Date.now();

  // Read config for mode
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    estimate.mode = config.mode;
    estimate.model = config.models?.claude_chain?.[0] || 'unknown';
    estimate.budget = config.budget?.per_task_usd || 0.50;
  } catch {
    estimate.mode = 'api';
    estimate.model = 'unknown';
    estimate.budget = 0.50;
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(ESTIMATE_FILE, JSON.stringify(estimate));
} catch (e) {
  // Never block Claude Code — fail silently
  process.exit(0);
}
