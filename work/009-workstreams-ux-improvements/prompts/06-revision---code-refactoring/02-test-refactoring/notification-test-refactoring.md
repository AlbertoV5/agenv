Hello Agent!

You are working on the "Test Refactoring" batch at the "Revision - Code Refactoring" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Notification Test Refactoring" (3)

## Thread Summary
Refactor notifications.test.ts (766 lines) to use shared mock factories.

## Thread Details
- Working packages: `./packages/workstreams`
- Run tests first: `bun run test` in packages/workstreams
- Refactor notifications.test.ts:
- Use `createSpawnMock()` from helpers instead of inline mocks
- Use `createChildProcessMock()` for ChildProcess mocks
- Extract repeated mock setup to `beforeEach` blocks
- Consolidate similar test cases where appropriate
- Target: Reduce from 766 to ~500 lines
- Run tests last: `bun run test` to verify no regressions

Your tasks are:
- [ ] 06.02.03.01 Run tests first - execute `bun run test` in packages/workstreams to establish baseline
- [ ] 06.02.03.02 Refactor notifications.test.ts to use createSpawnMock() from helpers instead of inline mocks
- [ ] 06.02.03.03 Refactor notifications.test.ts to use createChildProcessMock() for ChildProcess mocks
- [ ] 06.02.03.04 Extract repeated mock setup to beforeEach blocks where appropriate
- [ ] 06.02.03.05 Consolidate similar test cases, target 766→500 lines
- [ ] 06.02.03.06 Run tests last - execute `bun run test` to verify no regressions

When listing tasks, use `work list --tasks --batch "06.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
