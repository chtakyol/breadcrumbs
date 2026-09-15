# agent-shell-breadcrumbs

A persistent, reviewable record of every shell command an AI coding agent (Claude Code, OpenCode) actually executed — with timestamps, exact arguments, working directory, and session id.

It registers into each agent's native hook system (deterministic interception, not a prompt instruction), appends JSONL records to `.breadcrumbs/log.jsonl` per repo, and can produce a human-readable end-of-session report.

## Install & set up

```sh
npm install -D agent-shell-breadcrumbs
npx breadcrumbs init    # wires up Claude Code + OpenCode hooks
# restart your agent
```

Logs land in `.breadcrumbs/log.jsonl` (auto-created and gitignored). Override the location with `BREADCRUMBS_LOG_DIR`.

## Usage

```sh
npx breadcrumbs report                # markdown summary of the whole log
npx breadcrumbs report --session <id> # summary for one session
```

While you work, each Bash call the agent runs is appended as one JSONL record:

```json
{"timestamp":"2026-09-15T10:22:03.912Z","agent":"opencode","tool":"bash","command":"npm run build","cwd":"/Users/dev/project","sessionId":"abc123"}
```

End-of-session reports are written to `.breadcrumbs/reports/` automatically where the host agent supports it (Claude Code `Stop` hook; OpenCode `session.idle`).

## How it works

- **Claude Code**: adds `PreToolUse` (matcher `Bash`) and `Stop` hooks to `.claude/settings.json`.
- **OpenCode**: creates `.opencode/plugin/breadcrumbs.mjs` re-exporting the package's plugin (`tool.execute.before` + `session.idle`).
- Nothing is blocked or altered; failures are reported to stderr only.

`breadcrumbs init` is idempotent — running it twice never duplicates hook entries.

## Requirements

Node 20+ LTS. Zero runtime dependencies (Node builtins only).