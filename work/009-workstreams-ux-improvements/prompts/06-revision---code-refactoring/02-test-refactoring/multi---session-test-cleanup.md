Hello Agent!

You are working on the "Test Refactoring" batch at the "Revision - Code Refactoring" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Multi & Session Test Cleanup" (4)

## Thread Summary
Refactor multi.test.ts and session-tracking.test.ts to use shared helpers and improve organization.

## Thread Details
- Working packages: `./packages/workstreams`
- Run tests first: `bun run test` in packages/workstreams
- Refactor multi.test.ts:
- Use shared mock factories from helpers
- Review simulation tests - convert valuable ones to integration tests
- Remove redundant tests that don't test actual code
- Refactor session-tracking.test.ts:
- Use `createTestWorkstream()` from helpers
- Mark legacy migration tests with `describe.skip` or `// LEGACY:` comments
- Share setup with threads.test.ts where possible
- Target: Reduce combined lines by ~200
- Run tests last: `bun run test` to verify no regressions

Your tasks are:
- [ ] 06.02.04.01 Run tests first - execute `bun run test` in packages/workstreams to establish baseline
- [ ] 06.02.04.02 Refactor multi.test.ts to use shared mock factories from helpers
- [ ] 06.02.04.03 Review simulation tests in multi.test.ts - convert valuable ones to integration tests, remove redundant ones
- [ ] 06.02.04.04 Refactor session-tracking.test.ts to use createTestWorkstream() from helpers
- [ ] 06.02.04.05 Mark legacy migration tests in session-tracking.test.ts with describe.skip or // LEGACY: comments
- [ ] 06.02.04.06 Share setup between session-tracking.test.ts and threads.test.ts where possible
- [ ] 06.02.04.07 Run tests last - execute `bun run test` to verify no regressions

When listing tasks, use `work list --tasks --batch "06.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
