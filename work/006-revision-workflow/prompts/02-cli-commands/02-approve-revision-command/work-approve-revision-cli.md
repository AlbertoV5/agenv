Hello Agent!

You are working on the "Approve Revision Command" batch at the "CLI Commands" stage of the "Revision Workflow" workstream.

This is your thread:

"Work Approve Revision CLI" (1)

## Thread Summary
Extend approve command to handle `work approve revision`.

## Thread Details
- Working packages: `./packages/workstreams`
- Edit `src/cli/approve.ts`
- Add handling for `work approve revision` subcommand
- Behavior:
1. Detect new stages using `detectNewStages()`
2. If no new stages found, error: "No new stages to approve"
3. Validate new stages (check for open questions)
4. Generate TASKS.md using `generateTasksMdForRevision()`
5. Write TASKS.md to stream directory
6. Output: "Generated TASKS.md with N existing tasks and M new task placeholders"
7. Output: "Edit TASKS.md to add task details and assign agents, then run 'work approve tasks'"
- Does NOT modify approval status - that happens when `work approve tasks` runs

Your tasks are:
- [ ] 02.02.01.01 Add "revision" case handling in `src/cli/approve.ts` parseCliArgs and main
- [ ] 02.02.01.02 Load PLAN.md, parse with parseStreamDocument, load existing tasks from tasks.json
- [ ] 02.02.01.03 Call detectNewStages() and error if no new stages found
- [ ] 02.02.01.04 Validate new stages have no open questions (reuse checkOpenQuestions logic filtered to new stages)
- [ ] 02.02.01.05 Call generateTasksMdForRevision() and write TASKS.md
- [ ] 02.02.01.06 Output summary with existing task count, new placeholder count, and next steps

When listing tasks, use `work list --tasks --batch "02.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
