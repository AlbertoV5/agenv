# AgEnv Hooks

Hooks for Claude Code that add `~/.agenv/bin` to PATH.

## Claude Code

Uses `hooks.json` with a SessionStart hook that runs `setup-env.sh`.

### Installation

```bash
ag install hooks --claude
```

## Files

- `hooks.json` - Claude Code hooks configuration
- `setup-env.sh` - Script that outputs PATH export

## OpenCode Environment Setup

For OpenCode agent runs that need GitHub tokens, use the plugin:

```bash
ag install plugins --opencode
```

The plugin sources `bin/source_env.sh` from the project directory and falls back to `gh auth token`.
