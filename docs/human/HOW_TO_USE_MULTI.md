# How to Use: Work Multi

The `work multi` command allows you to execute multiple threads in parallel using a managed `tmux` session. It provides a "SST-style" dashboard to monitor and interact with your agents.

## Usage

```bash
# Execute a specific batch
work multi --batch "01.01"

# Continue from the next incomplete batch
work multi --continue

# Preview commands without running (Dry Run)
work multi --batch "01.01" --dry-run
```

## The Dashboard

When you run the command, a `tmux` session is created with the following layout:

- **Left Pane (Sidebar)**: The Navigator. Lists all threads in the batch and their status.
- **Right Pane (Content)**: The active thread's terminal output.

### Navigation

- **k / Up**: Move selection up.
- **j / Down**: Move selection down.
- **Enter**: Switch the Content Pane to the selected thread.

### Interaction

- **i**: Enter **Interactive Mode**.
    - Switches focus to the right pane (Content).
    - Allows you to type commands or interact with the running agent.
    - **To return to Navigator**: Use standard tmux navigation (e.g., `Ctrl+b` then `Left Arrow`).

- **x**: **Kill Session**.
    - Only available when all threads are `completed` or `failed`.
    - Cleanly closes the tmux session and exits.

### Thread Status

- **Running** (Cyan ◐): Thread is actively working.
- **Completed** (Green ●): Thread finished successfully.
- **Failed** (Red x): Thread encountered an error.

> **Note**: When a thread finishes, its pane remains open (showing "Thread finished. Press Enter to close.") so you can inspect the logs. The "Completed" status in the sidebar reflects the task state.
