# Work Multi: SST-style Tmux View

This document details the implementation of the `work multi` command's TUI, which mimics the SST console experience using `tmux` pane management.

## Architecture

The `work multi` command orchestrates a tmux session designed to look like a unified dashboard.

### Session Layout

```
Session: work-{stream-id}
Window 0: "Dashboard"
┌──────────────────┬──────────────────────────────────────────┐
│ Sidebar (25%)    │ Main Content (75%)                       │
│                  │                                          │
│ [work navigator] │ [active thread output]                   │
│                  │                                          │
│ > Thread 1       │ > Installing dependencies...             │
│   Thread 2       │ > Running tests...                       │
│   Thread 3       │                                          │
│                  │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` | Move selection down |
| `k` / `↑` | Move selection up |
| `Enter` | Switch to selected thread's window |
| `i` | Enter interactive mode (focus content pane) |
| `q` | Quit navigator |
| `x` | Kill session (only when all threads done) |
| `Ctrl-b 0` | Return to navigator window (tmux shortcut) |
| `Ctrl-b n` | Next window |
| `Ctrl-b p` | Previous window |

> **Note**: When you switch to a thread window with Enter, use `Ctrl-b 0` to return to the navigator sidebar.

- **Sidebar**: Runs `work multi-navigator`. It is a TUI that lists threads and listens for key events (`j`/`k`/`Enter`).
- **Main Content**: Displays the output of the currently selected thread.
- **Background Threads**: All other threads run in detached windows (indexes 1..N).

### Mechanism

1. **Initialization**:
   - `work multi` creates the session.
   - It starts Thread 1 in Window 0 ("Dashboard").
   - It starts Threads 2..N in new windows (detached).
   - It splits Window 0 to the left to spawn the `work multi-navigator`.

2. **Navigation (Pane Swapping)**:
   - When the user selects a thread in the navigator:
     1. The navigator identifies the current content pane.
     2. It "breaks" that pane out to a background window (hiding it).
     3. It "joins" the selected thread's window pane into the current window (showing it).
   - This preserves the scrollback/state of every thread since they are just real tmux terminal panes being moved around.

## Current Status

- **Implemented**: pane splitting logic, basic TUI, `tasks.json` status polling, navigator robustness (restart loop), dead pane prevention (read wait), interactive mode.
- **Pending/Issues**:
  - **Logs**: A dedicated "logs" thread or view?

## What's Next

1. [x] **Auto-close on Completion**: Session offers to close ('x' key) when all threads are done.
2. [x] **Interactive Threads**: 'i' key allows taking over input in the content pane.
3. [x] **Error Handling**: Navigator auto-restarts if it crashes.
4. [ ] **Logs**: A dedicated "logs" thread or view?
