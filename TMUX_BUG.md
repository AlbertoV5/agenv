# Bug Report: Tmux Layout Collapse on Thread Switch

## Symptoms
When running `work multi` with multiple threads/batches:
1.  The initial dashboard loads correctly (Navigator + Content).
2.  When switching to another thread using `j`/`k` + `Enter`:
    *   The "Content" pane disappears or the new thread takes over the **entire** window.
    *   The Navigator sidebar is lost.
    *   The user cannot return to the navigator easily.

## Evidence
Debug logs from `multi-navigator.ts` show the following error during `activateThread`:

```
[2026-01-21T00:59:13.534Z] Switching from 02.02.01 to 02.02.02 (Window: 02.02.02)
[2026-01-21T00:59:13.534Z] Breaking pane %0 to window 02.02.01
[2026-01-21T00:59:13.538Z] Joining window 02.02.02 to %3
[2026-01-21T00:59:13.541Z] join-pane failed: can't find pane: 02.02
```

## Root Cause
The window names are generated directly from the thread ID (e.g., `01.01.01` or `02.02`).
When `tmux join-pane -s 02.02` is executed:
*   Tmux interprets `02.02` (or portions of it) as a **pane index** or numeric target rather than a literal string window name.
*   Because no pane with that numeric index exists in the expected context, the command fails.
*   The `break-pane` succeeded (moving the old content away), but `join-pane` failed, leaving the window in a broken state (often just the navigator pane remaining, or if logic erroneously continued, the layout hierarchy is destroyed).

## Proposed Fix
**Prefix window names with a string** to force tmux to treat them as names.

### 1. Update `packages/workstreams/src/cli/multi.ts`
Change window creation to use a prefix:
```typescript
// OLD
const windowName = thread.threadId // "01.01.01"

// NEW
const windowName = `thread-${thread.threadId}` // "thread-01.01.01"
addWindow(sessionName, windowName, cmd)
```

### 2. Update `packages/workstreams/src/cli/multi-navigator.ts`
Update how the navigator references windows when swapping:
```typescript
// OLD
const windowName = t.id

// NEW
const windowName = `thread-${t.id}`
```

This change ensures `join-pane -s thread-01.01.01` is unambiguously treated as a window target by tmux.
