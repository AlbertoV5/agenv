Hello Agent!

You are working on the "Core Implementation" batch at the "Auto-Commit on Stage Approval" stage of the "Stage Commit Tracking" workstream.

This is your thread:

"Commit Library" (1)

## Thread Summary
Create the git commit helper functions for stage approval commits.

## Thread Details
- Working package: `./packages/workstreams`
- Create `src/lib/github/commits.ts` with:
- `formatStageCommitMessage(streamId, stageNum, stageName)` - formats message with trailers
- `createStageApprovalCommit(repoRoot, stream, stageNum)` - performs git add, commit, returns SHA
- `hasUncommittedChanges(repoRoot)` - checks if there are changes to commit
- Use `child_process.execSync` for git commands (consistent with complete.ts pattern)
- Handle errors gracefully - commit failure should not block approval

Your tasks are:
- [ ] 01.01.01.01 Create src/lib/github/commits.ts with formatStageCommitMessage function
- [ ] 01.01.01.02 Add createStageApprovalCommit function with git add and commit logic
- [ ] 01.01.01.03 Add hasUncommittedChanges helper function
- [ ] 01.01.01.04 Export functions from src/lib/github/index.ts

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
