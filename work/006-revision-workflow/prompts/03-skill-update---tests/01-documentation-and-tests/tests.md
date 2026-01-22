Hello Agent!

You are working on the "Documentation and Tests" batch at the "Skill Update & Tests" stage of the "Revision Workflow" workstream.

This is your thread:

"Tests" (2)

## Thread Summary
Create tests for revision workflow functions.

## Thread Details
- Working packages: `./packages/workstreams`
- Create `tests/revision.test.ts`
- Test cases:
- `detectNewStages()` correctly identifies stages without tasks
- `generateTasksMdForRevision()` produces correct hybrid output
- `appendRevisionStage()` adds stage with correct format
- CLI argument parsing for `work revision`
- Full integration: revision → approve revision → approve tasks
- Use temp directory pattern from existing tests
*Last updated: 2026-01-22*

Your tasks are:
- [ ] 03.01.02.01 Create `tests/revision.test.ts` with test setup using temp directories
- [ ] 03.01.02.02 Test detectNewStages() with various scenarios (no tasks, partial tasks, all tasks)
- [ ] 03.01.02.03 Test generateTasksMdForRevision() produces correct hybrid output
- [ ] 03.01.02.04 Test appendRevisionStage() creates correct PLAN.md structure
- [ ] 03.01.02.05 Test CLI integration: revision command adds stage, approve revision generates TASKS.md

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
