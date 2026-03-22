# meter

**Intelligent CLI wrapper for Claude Code** — pre-task cost estimation, live status bar, budget protection.

meter sits transparently between you and Claude Code via PATH shimming. You keep typing `claude` exactly as before. meter adds:

- **Pre-task estimation** — know what a task will cost before it runs
- **Live status bar** — ambient cost/usage ticker while the agent works
- **Budget protection** — non-blocking notification when thresholds are hit, with one-keypress model switching
- **Works for both API users and plan subscribers**

```
$ claude "refactor the auth layer"
◆ meter  claude-opus  ~$0.38  heavy  ████████████░░░░  68% 5hr window  |  $0.12 elapsed
```

## Install

```bash
npm install -g meter-ai
meter init
# restart your terminal
```

That's it. `meter init` detects your shell, finds the real `claude` binary, sets up a transparent shim, and writes your config. From now on, every `claude` invocation runs through meter automatically.

## How It Works

meter uses a PTY (pseudo-terminal) wrapper — the same mechanism used by VS Code's integrated terminal, tmux, and asciinema. Claude Code runs inside a PTY slave and believes it owns a real terminal. meter is the PTY master: it passes all I/O through unchanged while injecting a status bar at the bottom of your terminal.

### For API users (paying per token)

```
◆ meter  claude-opus  ~$0.38  heavy  │  ████████████░░░░  $0.21 / $0.50
```

meter tracks actual dollar cost in real time. When your per-task budget threshold is hit, you get a non-blocking notification:

```
⚠  80% budget hit ($0.40/$0.50)  [s]witch to sonnet  [d]ismiss  [c]ancel
```

### For plan users (Claude Max, Pro)

```
◆ meter  claude-opus  ~$0.38  heavy  │  ████████████░░░░  68% 5hr window  reset in 2h 14m
```

meter polls your 5-hour usage window percentage and warns before you hit the rate limit wall mid-task.

## Pre-Task Estimation

meter estimates task cost/weight using a three-layer pipeline:

1. **Heuristics** (~50ms, free) — keyword scoring + repo size analysis
2. **Historical baseline** (~10ms, free) — trigram similarity against your past tasks
3. **LLM pre-call** (~1-2s, ~$0.0001) — only fires on ambiguous tasks

Simple tasks never hit layer 3. The estimate shows instantly and the agent starts immediately — no confirmation gate, no pause.

## Commands

```bash
meter init        # Set up PATH shim and config
meter status      # Show current mode, model, usage, and config
meter report      # Weekly digest of usage and costs
meter history     # Browse past task records
meter config      # View and set budgets, thresholds, model chain
meter uninstall   # Clean removal of all shims and data
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
  config.json       # Mode, budgets, thresholds, resolved binary path
  history.db        # SQLite: task history, costs, estimates
  pricing.json      # Model pricing table (updated weekly)
  bin/claude        # PATH shim
  cache/            # Usage data, session state
  reports/          # Weekly digest snapshots
```

## Uninstall

```bash
meter uninstall       # Removes shim and PATH entry
npm uninstall -g meter-ai
```

## Roadmap

- **v1.1** — Aider support
- **v1.2** — Gemini CLI support
- **v1.3** — Codex CLI support
- **v2.0** — CSV/JSON export, `--dry-run` estimation, team usage sharing

## Support

If meter saved you from a surprise bill or a rate limit wall, consider [buying me a coffee](https://buymeacoffee.com/catancs).

## License

MIT
