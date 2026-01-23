Hello Agent!

You are working on the "System Integration" batch at the "Integration" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Tasks.ts Refactor" (1)

## Thread Summary
Update tasks.ts to delegate session tracking to threads.ts while maintaining the existing API surface.

## Thread Details
- Working packages: `./packages/workstreams`
- Modify `src/lib/tasks.ts`:
- Import and use `ThreadsStore` from threads.ts
- Update `startTaskSession()` to write to threads.json via ThreadsStore
- Update `completeTaskSession()` to write to threads.json
- Update `getCurrentTaskSession()` to read from threads.json
- Update `getTaskSessions()` to read from threads.json
- Keep Task interface in types.ts but mark session fields as deprecated
- Add migration check on load: if sessions exist in tasks.json, migrate them
- Ensure all locked variants (`*Locked()` functions) use threads.ts internally
- Update `tests/session-tracking.test.ts` to verify data goes to threads.json
- Run existing tests to ensure no regressions

Your tasks are:
- [ ] 02.01.01.01 Update startTaskSession and startTaskSessionLocked to write to threads.json via ThreadsStore
- [ ] 02.01.01.02 Update completeTaskSession and completeTaskSessionLocked to write to threads.json
- [ ] 02.01.01.03 Update getCurrentTaskSession and getTaskSessions to read from threads.json
- [ ] 02.01.01.04 Add auto-migration check on load: if sessions exist in tasks.json, migrate them with backup
- [ ] 02.01.01.05 Mark session fields in Task interface as deprecated, update session-tracking.test.ts

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
