# Fix Command

The `work fix` command is an interactive tool designed to help you recover from failed or incomplete threads. It provides a menu-driven interface to resume sessions, retry with new agents, or creating fix stages.

## Tmux Integration

By default, `work fix` launches the fix session in a new **tmux** window. This allows:
1.  **Persistence**: The session continues running even if your terminal disconnects.
2.  **Isolation**: The fix environment is isolated from your main shell.
3.  **Context**: You can see the full output of the agent interaction.

### Behavior
- When you select a thread to fix, the CLI creates a tmux session (or attaches to an existing one).
- The agent runs interactively within that tmux window.
- You can detach from the session (`Ctrl-b d`) and re-attach later.

## Flags

### `--no-tmux`

If you prefer to run the fix session directly in your current terminal (foreground mode), use the `--no-tmux` flag.

```bash
work fix --thread "01.01.01" --resume --no-tmux
```

**Use cases for `--no-tmux`:**
- You are in an environment where tmux is not installed.
- You want to run a quick fix without context switching.
- You are debugging the CLI itself.

### `--thread <id>`

Specify the thread ID to fix directly, skipping the interactive selection menu.

```bash
work fix --thread "01.01.01"
```

### `--resume`

Resume the last active session for the thread. This preserves the context and chat history.

```bash
work fix --thread "01.01.01" --resume
```

### `--retry`

Start a fresh session for the thread. This ignores previous history but keeps the same agent configuration.

```bash
work fix --thread "01.01.01" --retry
```

### `--agent <name>`

Retry the thread with a specific agent, overriding the default assignment.

```bash
work fix --thread "01.01.01" --retry --agent "senior-architect"
```

### `--new-stage`

Instead of fixing the current thread in place, create a new "Fix" stage at the end of the workstream. This is useful for complex regressions that require planning.

```bash
work fix --thread "01.01.01" --new-stage
```
