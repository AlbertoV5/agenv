# Bug Report: Tmux Layout Collapse on Thread Switch

## Symptoms
When running `work multi` with multiple threads/batches:
1.  The initial dashboard loads correctly (Navigator + Content).
2.  When switching to another thread using `j`/`k` + `Enter`:
    *   The "Content" pane disappears or the new thread takes over the **entire** window.
    *   The Navigator sidebar is lost.
    *   The user cannot return to the navigator easily.

## Additional Bug: Quit Command Loop
Pressing `q` to quit shows "Navigator crashed. Restarting in 1s..." instead of exiting.
- **Root cause**: The navigator runs in a `while true` shell loop and `process.exit(0)` is treated as a "crash".
- **Fix applied**: Use `process.exit(42)` and check for this code in the loop. ✅ FIXED

---

## Root Cause Analysis

The window names are generated from thread IDs (e.g., `01.01.01`).
When `tmux join-pane -s 02.02` is executed, tmux interprets this as a pane index.

### The Pane Swap Approach is Fundamentally Flawed

The current design tries to:
1. Break the current content pane to a background window
2. Join a new thread's pane into the dashboard window

**Problems:**
- `break-pane` creates a NEW window; it can't move a pane TO an existing window
- The windows already contain running opencode processes
- Naming conflicts when breaking to a window name that already exists
- Complex state management between break/join operations

---

## Fixes Attempted (All Failed for Swap Bug)

### Attempt 1: Prefix Window Names
Changed `01.01.01` → `thread-01.01.01`
- **Result**: Still failed. The fundamental swap logic is broken.

### Attempt 2: Use `session:=windowname` Syntax  
Force tmux exact name matching with `:=` prefix.
- **Result**: Still failed. The break-pane command creates windows, doesn't move to existing ones.

### Attempt 3: Simple Numeric Names (T1, T2, T3)
Use minimal names that can't be parsed as pane indices.
- **Result**: Still failed. Same fundamental issue with break/join logic.

### Attempt 4: Simple `select-window` Approach
Just switch windows entirely instead of swapping panes.
- **Result**: Works but navigator disappears (it's only in window 0).

---

## Proposed Solutions

### Option A: Abandon Pane Swapping (Simplest)
Don't try to keep navigator visible. Just use `select-window` to switch between thread windows.
- Navigator in window 0 just shows status
- User uses tmux shortcuts (`Ctrl-b 0`) to return to navigator
- **Pros**: Simple, reliable
- **Cons**: Not the SST-style UX originally desired

### Option B: Respawn Content Pane
Instead of moving panes, use `respawn-pane` to run different thread commands in the same pane.
- Keep navigator always visible in left pane
- Right pane respawns with new thread's opencode
- **Pros**: Navigator stays visible
- **Cons**: Loses scrollback/state when switching, each thread session is not preserved

### Option C: Navigator Follows User
Move the NAVIGATOR pane between windows instead of content.
- Each thread has its own window (already true)
- When user activates a thread, break navigator from current window and join to target
- **Pros**: Each thread keeps its state
- **Cons**: More complex, navigator may have focus issues

### Option D: Use tmux's `link-window`
Create linked windows that share panes across windows.
- Share the navigator pane across all thread windows using `link-window`
- **Pros**: Single navigator instance visible everywhere
- **Cons**: Complex to set up, may have synchronization issues

---

## Recommended Next Step

**Option A** is the simplest and most reliable. Accept that the navigator is a "home base" and users switch to it with `Ctrl-b 0`. This matches how many tmux-based tools work.

Or investigate **Option B** (respawn-pane) if preserving the always-visible sidebar is critical.
