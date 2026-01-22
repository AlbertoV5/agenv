Hello Agent!

You are working on the "Hybrid Generation" batch at the "Core Library" stage of the "Revision Workflow" workstream.

This is your thread:

"New Stage Detection" (2)

## Thread Summary
Create utility to detect which stages in PLAN.md are new (have no tasks yet).

## Thread Details
- Working packages: `./packages/workstreams`
- Add to `src/lib/tasks-md.ts` or create `src/lib/revision.ts`
- Add function `detectNewStages(doc, existingTasks): number[]`
- Logic:
1. Get all stage IDs from PLAN.md (doc.stages)
2. Get all stage IDs that have tasks in tasks.json
3. Return stage IDs that are in PLAN.md but not in tasks.json
- This is used by both `work approve revision` and validation

Your tasks are:
- [ ] 01.01.02.01 Add `detectNewStages(doc, existingTasks)` function to `src/lib/tasks-md.ts`
- [ ] 01.01.02.02 Extract unique stage IDs from existingTasks using parseTaskId
- [ ] 01.01.02.03 Compare against doc.stages to find stages with no tasks
- [ ] 01.01.02.04 Return array of new stage numbers sorted ascending

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
