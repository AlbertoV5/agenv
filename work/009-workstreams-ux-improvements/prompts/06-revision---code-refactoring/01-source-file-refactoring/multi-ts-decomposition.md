Hello Agent!

You are working on the "Source File Refactoring" batch at the "Revision - Code Refactoring" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Multi.ts Decomposition" (1)

## Thread Summary
Extract concerns from multi.ts (1028 lines) into focused modules, targeting ~400 lines remaining.

## Thread Details
- Working packages: `./packages/workstreams`
- Run tests first: `bun run test` in packages/workstreams
- Create `src/lib/cli-utils.ts`:
- Extract `parseCliArgs()` pattern as reusable utility
- Extract help text formatting helpers
- Move common CLI types (could be used by fix.ts, execute.ts, etc.)
- Create `src/lib/multi-orchestrator.ts`:
- Extract `collectThreadInfoFromTasks()` function
- Extract tmux session setup logic (createSession, createGridLayout calls)
- Extract pane command building and spawning
- Extract session cleanup functions
- Create `src/lib/marker-polling.ts`:
- Extract `pollMarkerFiles()` async logic
- Extract `cleanupCompletionMarkers()` and `cleanupSessionFiles()`
- Handle marker file paths consistently
- Move `ThreadInfo` type to `src/lib/types.ts`
- Update multi.ts to import and use extracted modules
- Run tests last: `bun run test` to verify no regressions

Your tasks are:
- [ ] 06.01.01.01 Run tests first - execute `bun run test` in packages/workstreams to establish baseline
- [ ] 06.01.01.02 Create src/lib/cli-utils.ts with reusable parseCliArgs pattern and help text formatting helpers
- [ ] 06.01.01.03 Create src/lib/multi-orchestrator.ts - extract collectThreadInfoFromTasks(), tmux session setup, pane spawning logic
- [ ] 06.01.01.04 Create src/lib/marker-polling.ts - extract pollMarkerFiles(), cleanupCompletionMarkers(), cleanupSessionFiles()
- [ ] 06.01.01.05 Move ThreadInfo type to src/lib/types.ts
- [ ] 06.01.01.06 Update multi.ts to import and use extracted modules, target ~400 lines from 1028
- [ ] 06.01.01.07 Run tests last - execute `bun run test` to verify no regressions

When listing tasks, use `work list --tasks --batch "06.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
