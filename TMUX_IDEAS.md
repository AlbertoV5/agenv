# Tmux Multi-Thread TUI: Future Ideas

## Summary of Current Issues

The original SST-style pane-swapping design didn't work because:
- `break-pane` creates new windows instead of moving to existing ones
- Complex state management between break/join operations fails silently
- Tmux interprets numeric window names as pane indices

**Current workaround**: Simple `select-window` switching. Use `Ctrl-b 0` to return to navigator.

---

## Ideas for V2

### Option A: 2x2 Grid Layout (Recommended)
Display 4 threads simultaneously in a grid, no switching needed.

```
┌─────────────────┬─────────────────┐
│ Thread 1        │ Thread 2        │
│                 │                 │
├─────────────────┼─────────────────┤
│ Thread 3        │ Thread 4        │
│                 │                 │
└─────────────────┴─────────────────┘
```

**Benefits:**
- No pane swapping logic needed
- See all threads at once
- Natural heuristic: limit batch size to 4 threads max
- Simple to implement with `split-window`

**Implementation:**
```bash
# Create 4 panes in a grid
tmux split-window -h    # Split horizontally (2 panes)
tmux split-window -v    # Split top-right vertically
tmux select-pane -t 0   # Go to first pane
tmux split-window -v    # Split top-left vertically
```

### Option B: Respawn Pane
Use `respawn-pane` to switch commands in a fixed content pane.
- Navigator stays visible
- Loses thread scrollback on switch

### Option C: Navigator Follows
Move navigator pane between windows with break/join.
- Each thread preserves state
- More complex implementation

### Option D: Linked Windows
Use `link-window` to share navigator across all thread windows.
- Complex tmux setup

---

## Recommended Approach

**Adopt the 2x2 grid layout** for V2:
1. Limit batch threads to max 4
2. Display all 4 in a grid layout
3. Small status bar or navigator in a thin pane at bottom if needed
4. No pane-swapping complexity

This matches how developers naturally work with multiple terminals and avoids all the tmux pane management issues.
