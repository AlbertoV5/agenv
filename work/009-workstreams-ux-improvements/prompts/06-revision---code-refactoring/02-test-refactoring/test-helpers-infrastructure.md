Hello Agent!

You are working on the "Test Refactoring" batch at the "Revision - Code Refactoring" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Test Helpers Infrastructure" (1)

## Thread Summary
Create shared test utilities to reduce setup duplication across all test files.

## Thread Details
- Working packages: `./packages/workstreams`
- Run tests first: `bun run test` in packages/workstreams
- Create `tests/helpers/test-workspace.ts`:
- `createTestWorkstream()` - Creates temp directory with PLAN.md, tasks.json
- `cleanupTestWorkstream()` - Removes temp directory
- `withTestWorkstream(callback)` - Wrapper that handles setup/cleanup
- Create `tests/helpers/cli-runner.ts`:
- `captureCliOutput(fn)` - Captures console.log/error during CLI execution
- `runCliCommand(command, args)` - Runs CLI and returns output
- Create `tests/helpers/mocks.ts`:
- `createSpawnMock()` - Factory for child process spawn mocks
- `createChildProcessMock()` - Mock ChildProcess with events
- `mockPlayNotification()` - Notification mock with call tracking
- Run tests last: `bun run test` to verify helpers work

Your tasks are:
- [ ] 06.02.01.01 Run tests first - execute `bun run test` in packages/workstreams to establish baseline
- [ ] 06.02.01.02 Create tests/helpers/test-workspace.ts with createTestWorkstream(), cleanupTestWorkstream(), withTestWorkstream()
- [ ] 06.02.01.03 Create tests/helpers/cli-runner.ts with captureCliOutput(fn) and runCliCommand(command, args)
- [ ] 06.02.01.04 Create tests/helpers/mocks.ts with createSpawnMock(), createChildProcessMock(), mockPlayNotification()
- [ ] 06.02.01.05 Add index.ts to tests/helpers/ that exports all utilities
- [ ] 06.02.01.06 Run tests last - execute `bun run test` to verify helpers work correctly

When listing tasks, use `work list --tasks --batch "06.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
