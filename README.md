# meter

**Intelligent CLI wrapper for Claude Code** — pre-task cost estimation, live status bar, budget protection.

## Why I Built This

I'm a student. My budget is tight, but my urge to build things is not. I think about projects in my sleep. I wake up and start coding. I use Claude Code every single day to build tools that empower myself and the community around me.

But here's the thing — I had no idea what any of it cost. I'd run a prompt, Claude would do its thing, and at the end of the month I'd stare at a bill wondering which Tuesday afternoon wiped out half my budget. Or worse, I'd hit my 5-hour rate limit wall right in the middle of something important and have to stop dead.

I built meter so I could see what my actions actually cost. Not after the fact — but as I work. Every prompt, every task, every session. Because when you're a student building on a budget, awareness is the difference between building sustainably and burning out your credits in a week.

If you're in the same boat — stretching every dollar, every token, every rate limit window — this is for you.

---

## What It Does

meter sits transparently between you and Claude Code. You keep typing `claude` exactly as before. meter adds:

- **Per-prompt estimation** — see the estimated cost of each prompt in Claude Code's statusline
- **Live status bar** — ambient cost/usage ticker while the agent works
- **Budget protection** — notifications when thresholds are hit, with model switching
- **Session history** — track what you spent, on what, and learn your patterns
- **Works for both API users and plan subscribers**

```
◆ meter  claude-opus  ~$0.38  heavy  │  68% 5hr window  reset in 2h 14m
```

## Install

```bash
npm install -g meter-ai
meter init
# restart your terminal
```

That's it. `meter init` detects your shell, finds the real `claude` binary, sets up a transparent shim, installs estimation hooks into Claude Code, and writes your config. From that point on, every `claude` invocation runs through meter automatically.

## How It Works

meter integrates with Claude Code in two ways:

### 1. Claude Code Hooks (interactive sessions)

When you launch `claude` interactively, meter hooks into Claude Code's native event system:

- **`UserPromptSubmit` hook** — runs the estimation pipeline every time you submit a prompt
- **Statusline integration** — displays the estimate in Claude Code's own bottom bar

This means you see the cost estimation right inside Claude Code's UI, alongside your existing statusline info. No separate window, no terminal conflicts.

### 2. PTY Wrapper (non-interactive / one-shot commands)

When you run `claude "fix the bug"` with a prompt argument, meter wraps the process in a PTY and shows a live status bar with real-time cost tracking.

### For API users (paying per token)

meter tracks actual dollar cost. When your per-task budget threshold is hit:

```
⚠  80% budget hit ($0.40/$0.50)  [s]witch to sonnet  [d]ismiss  [c]ancel
```

### For plan users (Claude Max, Pro)

meter tracks your 5-hour usage window percentage and warns before you hit the rate limit wall mid-task.

## Pre-Prompt Estimation

meter estimates task cost/weight using a three-layer pipeline:

1. **Heuristics** (~50ms, free) — keyword scoring + repo size analysis
2. **Historical baseline** (~10ms, free) — trigram similarity against your past tasks in `~/.meter/history.db`
3. **LLM pre-call** (~1-2s, ~$0.0001) — only fires on ambiguous tasks, asks Haiku for a one-word complexity classification

Simple tasks never hit layer 3. The pipeline gets smarter over time as your history builds up — Layer 2 learns from your real usage patterns and replaces guesswork with data.

### Cost estimates by complexity

| Complexity | Estimated cost |
|---|---|
| low | ~$0.02 |
| medium | ~$0.09 |
| heavy | ~$0.38 |
| critical | ~$0.80 |

## Commands

```bash
meter init        # Set up shim, hooks, and config
meter status      # Show current mode, model, usage, and config
meter report      # Weekly digest of usage and costs
meter history     # Browse past task records
meter config      # View and set budgets, thresholds, model chain
meter uninstall   # Clean removal of all shims, hooks, and data
```

### Configuration

```bash
meter config set budget 1.00      # Set per-task budget to $1.00
meter config set threshold 90     # Notify at 90% instead of 80%
meter config                      # View current config as JSON
```

## Model Switching

When a budget threshold is hit, press `s` to switch to a cheaper model:

```
claude-opus-4  →  claude-sonnet-4  →  claude-haiku-4
```

meter warns you that conversation context will reset, and gives you 5 seconds to cancel before proceeding.

## Data Storage

All data stays local. No telemetry, no cloud, no accounts.

```
~/.meter/
  config.json           # Mode, budgets, thresholds, resolved binary path
  history.db            # SQLite: task history, costs, estimates
  hooks/
    on-prompt.js        # Claude Code UserPromptSubmit hook
    statusline.js       # Claude Code statusline command
  bin/claude            # PATH shim
  cache/
    latest-estimate.json  # Most recent estimation result
  reports/              # Weekly digest snapshots
```

## Known Limitations

**Estimation timing in interactive sessions.** Claude Code's hook system fires the `UserPromptSubmit` event *when* the prompt is submitted, not before. This means the estimation appears in the statusline as Claude is already processing your prompt — you see the cost *during* execution, not before you press Enter. This is a platform limitation of Claude Code's hook architecture, not a meter limitation. If Anthropic adds a pre-submit hook in the future, meter will support it immediately.

**What this means in practice:** You won't get a "this will cost $X, proceed?" gate before each prompt. Instead, meter gives you ambient awareness — you see the estimated cost of each prompt as it runs, learn your patterns over time, and build intuition for what's expensive. The `meter report` and `meter history` commands help you review and learn from your spending.

## Uninstall

```bash
meter uninstall       # Removes shim, hooks, and PATH entry
npm uninstall -g meter-ai
```

## Roadmap

- **v1.1** — Aider support
- **v1.2** — Gemini CLI support
- **v1.3** — Codex CLI support
- **v2.0** — Session cost summary on exit, `meter estimate "prompt"` pre-check command, CSV/JSON export

## Support

I built this as a student, for students and solo devs who care about every dollar. If meter helped you understand your AI spending better, consider [buying me a coffee](https://buymeacoffee.com/catancs).

## License

MIT
