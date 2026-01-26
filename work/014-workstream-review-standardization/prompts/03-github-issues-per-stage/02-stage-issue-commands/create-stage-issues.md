Hello Agent!

You are working on the "Stage Issue Commands" batch at the "GitHub Issues Per Stage" stage of the "Workstream Review Standardization" workstream.

This is your thread:

"Create Stage Issues" (1)

## Thread Summary
Update `work github create-issues` to create one issue per stage.

## Thread Details
- Working packages: `packages/workstreams/src/cli`, `packages/workstreams/src/lib/github`
- Modify `createIssuesForWorkstream()` in `sync.ts`
- Create issue per stage instead of per thread
- Issue title: `[{stream-id}] Stage {N}: {Stage Name}`
- Issue body: List of batches/threads/tasks
- Store in github.json instead of tasks.json

Your tasks are:
- [ ] 03.02.01.01 Create `createStageIssue()` function in `packages/workstreams/src/lib/github/issues.ts` for creating stage-level issues
- [ ] 03.02.01.02 Issue title format: `[{stream-id}] Stage {N}: {Stage Name}`
- [ ] 03.02.01.03 Issue body should list all batches/threads/tasks in the stage
- [ ] 03.02.01.04 Update `work github create-issues` to create stage issues instead of thread issues
- [ ] 03.02.01.05 Store created issue in github.json using `setStageIssue()`
- [ ] 03.02.01.06 Run `bun run typecheck` and test issue creation

When listing tasks, use `work list --tasks --batch "03.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
