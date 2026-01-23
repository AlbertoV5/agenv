Hello Agent!

You are working on the "Test Refactoring" batch at the "Revision - Code Refactoring" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Approval Flow Test Refactoring" (2)

## Thread Summary
Refactor approval_flow.test.ts (788 lines) to use shared helpers and fixtures.

## Thread Details
- Working packages: `./packages/workstreams`
- Run tests first: `bun run test` in packages/workstreams
- Create `tests/fixtures/plans/` directory:
- `basic-plan.md` - Simple 2-stage plan for tests
- `multi-batch-plan.md` - Complex plan with multiple batches
- `revision-plan.md` - Plan with revision stage
- Refactor approval_flow.test.ts:
- Replace inline PLAN.md strings with fixture imports
- Use `createTestWorkstream()` from helpers
- Use `captureCliOutput()` for console capture
- Consolidate three `beforeEach` blocks into shared setup
- Target: Reduce from 788 to ~500 lines
- Run tests last: `bun run test` to verify no regressions

Your tasks are:
- [ ] 06.02.02.01 Run tests first - execute `bun run test` in packages/workstreams to establish baseline
- [ ] 06.02.02.02 Create tests/fixtures/plans/ directory with basic-plan.md, multi-batch-plan.md, revision-plan.md
- [ ] 06.02.02.03 Refactor approval_flow.test.ts to import PLAN.md fixtures instead of inline strings
- [ ] 06.02.02.04 Refactor approval_flow.test.ts to use createTestWorkstream() from helpers
- [ ] 06.02.02.05 Refactor approval_flow.test.ts to use captureCliOutput() for console capture
- [ ] 06.02.02.06 Consolidate three separate beforeEach blocks into shared setup, target 788→500 lines
- [ ] 06.02.02.07 Run tests last - execute `bun run test` to verify no regressions

When listing tasks, use `work list --tasks --batch "06.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
