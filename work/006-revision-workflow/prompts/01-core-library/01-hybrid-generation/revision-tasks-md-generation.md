Hello Agent!

You are working on the "Hybrid Generation" batch at the "Core Library" stage of the "Revision Workflow" workstream.

This is your thread:

"Revision TASKS.md Generation" (1)

## Thread Summary
Create function that generates TASKS.md with existing tasks (preserving status) plus new stage placeholders.

## Thread Details
- Working packages: `./packages/workstreams`
- Edit `src/lib/tasks-md.ts`
- Add function `generateTasksMdForRevision(streamName, existingTasks, doc, newStageNumbers): string`
- Logic:
1. Use `generateTasksMdFromTasks()` output for existing stages
2. For new stages (in `newStageNumbers`), generate empty placeholders like `generateTasksMdFromPlan()` does
3. Merge into single TASKS.md content
- New stages identified by: stages in PLAN.md that have no tasks in tasks.json

Your tasks are:
- [ ] 01.01.01.01 Add `generateTasksMdForRevision(streamName, existingTasks, doc, newStageNumbers)` function to `src/lib/tasks-md.ts`
- [ ] 01.01.01.02 Implement logic to output existing tasks with status markers ([x], [~], etc.) for stages NOT in newStageNumbers
- [ ] 01.01.01.03 Implement logic to output empty placeholders for stages IN newStageNumbers (same format as generateTasksMdFromPlan)
- [ ] 01.01.01.04 Ensure output is sorted by stage/batch/thread and properly formatted

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
