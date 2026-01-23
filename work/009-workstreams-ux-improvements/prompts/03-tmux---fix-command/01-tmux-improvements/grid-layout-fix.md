Hello Agent!

You are working on the "Tmux Improvements" batch at the "Tmux & Fix Command" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Grid Layout Fix" (1)

## Thread Summary
Debug and fix the 2x2 grid layout that currently creates an incorrect pane arrangement.

## Thread Details
- Working packages: `./packages/workstreams`
- Investigate `src/lib/tmux.ts` `createGridLayout()` function (lines 309-371)
- Current issue: Creates 1 panel on right, 3 stacked on left instead of 2x2
- Debug the split sequence:
1. Start with single pane
2. Split horizontally (-h) to get [Left, Right]
3. Split left vertically (-v) to get [TL, BL, Right]
4. Split right vertically (-v) to get [TL, BL, TR, BR]
- Verify split percentages and target pane selection
- Fix the layout algorithm to produce correct 2x2 grid
- Add `tests/tmux-grid.test.ts` with layout verification tests
- Test with 1, 2, 3, 4 pane configurations

Your tasks are:
- [ ] 03.01.01.01 Debug createGridLayout in tmux.ts - trace split sequence and identify why layout is 1+3 instead of 2x2
- [ ] 03.01.01.02 Fix split percentages and target pane selection to produce correct 2x2 grid
- [ ] 03.01.01.03 Test grid with 1, 2, 3, 4 pane configurations to ensure all work correctly
- [ ] 03.01.01.04 Add tmux-grid.test.ts with layout verification tests

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
