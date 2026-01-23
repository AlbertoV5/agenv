Hello Agent!

You are working on the "Source File Refactoring" batch at the "Revision - Code Refactoring" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Tasks.ts Simplification" (4)

## Thread Summary
Simplify tasks.ts (1300 lines) by removing thin session wrappers and consolidating grouping utilities.

## Thread Details
- Working packages: `./packages/workstreams`
- Run tests first: `bun run test` in packages/workstreams
- Remove thin session delegation functions that just extract threadId:
- Evaluate if `startTaskSession()`, `completeTaskSession()` wrappers are still needed
- If CLI code can call threads.ts directly, remove these wrappers
- Keep only functions that add value beyond delegation
- Consolidate task grouping utilities:
- Merge `groupTasksByStageAndThread()` and `groupTasksByStageAndBatchAndThread()`
- Create single `groupTasks(tasks, { byStage, byBatch, byThread })` with options
- Extract discovery logic:
- Consider moving `discoverThreadsInBatch()` to `src/lib/task-discovery.ts`
- This makes tasks.ts focused on CRUD operations
- Update all callers of removed/changed functions
- Run tests last: `bun run test` to verify no regressions

Your tasks are:
- [ ] 06.01.04.01 Run tests first - execute `bun run test` in packages/workstreams to establish baseline
- [ ] 06.01.04.02 Evaluate thin session delegation functions - identify which wrappers can be removed if CLI calls threads.ts directly
- [ ] 06.01.04.03 Remove unnecessary session wrapper functions, update callers to use threads.ts directly
- [ ] 06.01.04.04 Consolidate groupTasksByStageAndThread() and groupTasksByStageAndBatchAndThread() into single groupTasks() with options
- [ ] 06.01.04.05 Consider extracting discoverThreadsInBatch() to src/lib/task-discovery.ts if it improves clarity
- [ ] 06.01.04.06 Update all callers of removed/changed functions throughout codebase
- [ ] 06.01.04.07 Run tests last - execute `bun run test` to verify no regressions

When listing tasks, use `work list --tasks --batch "06.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
