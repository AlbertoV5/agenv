Hello Agent!

You are working on the "Tmux Improvements" batch at the "Tmux & Fix Command" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Tmux Unit Tests" (3)

## Thread Summary
Increase unit test coverage for tmux.ts operations.

## Thread Details
- Working packages: `./packages/workstreams`
- Expand `tests/tmux.test.ts` with additional tests:
- `createSession()` - Verify session creation and naming
- `addWindow()` - Verify window creation
- `splitWindow()` - Verify split operations
- `createGridLayout()` - Verify 2x2 layout (mock or integration)
- `getSessionPaneStatuses()` - Verify pane status parsing
- `waitForAllPanesExit()` - Verify polling and completion detection
- `respawnPane()` - Verify pane respawn
- Use tmux `-f /dev/null` to avoid user config interference in tests
- Add cleanup in test teardown to kill test sessions
- Target 80%+ coverage of tmux.ts functions

Your tasks are:
- [ ] 03.01.03.01 Add tests for createSession and addWindow in tmux.test.ts
- [ ] 03.01.03.02 Add tests for splitWindow and createGridLayout operations
- [ ] 03.01.03.03 Add tests for getSessionPaneStatuses and waitForAllPanesExit
- [ ] 03.01.03.04 Add tests for respawnPane and ensure cleanup in test teardown
- [ ] 03.01.03.05 Verify 80%+ coverage of tmux.ts functions

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
