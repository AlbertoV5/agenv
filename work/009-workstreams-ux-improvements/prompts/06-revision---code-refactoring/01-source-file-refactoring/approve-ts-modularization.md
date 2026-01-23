Hello Agent!

You are working on the "Source File Refactoring" batch at the "Revision - Code Refactoring" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Approve.ts Modularization" (2)

## Thread Summary
Split approve.ts (1089 lines) into a modular directory structure with separate handlers.

## Thread Details
- Working packages: `./packages/workstreams`
- Run tests first: `bun run test` in packages/workstreams
- Create `src/cli/approve/` directory structure:
- `src/cli/approve/index.ts` - Main entry point, CLI arg parsing, router
- `src/cli/approve/plan.ts` - `handlePlanApproval()` (~200 lines)
- `src/cli/approve/tasks.ts` - `handleTasksApproval()` and `serializeTasksMdToJson()` (~250 lines)
- `src/cli/approve/revision.ts` - `handleRevisionApproval()` (~200 lines)
- `src/cli/approve/utils.ts` - Shared formatting, stage validation, JSON output
- Extract `checkStageCompletion()` to `src/lib/approval.ts` for reuse
- Update imports in any files that reference approve.ts
- Run tests last: `bun run test` to verify no regressions

Your tasks are:
- [ ] 06.01.02.01 Run tests first - execute `bun run test` in packages/workstreams to establish baseline
- [ ] 06.01.02.02 Create src/cli/approve/ directory structure with index.ts as main entry point
- [ ] 06.01.02.03 Create src/cli/approve/plan.ts - extract handlePlanApproval() (~200 lines)
- [ ] 06.01.02.04 Create src/cli/approve/tasks.ts - extract handleTasksApproval() and serializeTasksMdToJson() (~250 lines)
- [ ] 06.01.02.05 Create src/cli/approve/revision.ts - extract handleRevisionApproval() (~200 lines)
- [ ] 06.01.02.06 Create src/cli/approve/utils.ts - shared formatting, stage validation, JSON output helpers
- [ ] 06.01.02.07 Extract checkStageCompletion() to src/lib/approval.ts for reuse by other commands
- [ ] 06.01.02.08 Update any imports referencing old approve.ts path
- [ ] 06.01.02.09 Run tests last - execute `bun run test` to verify no regressions

When listing tasks, use `work list --tasks --batch "06.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
