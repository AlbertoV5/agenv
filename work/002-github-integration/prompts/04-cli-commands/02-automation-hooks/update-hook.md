Hello Agent!

You are working on the "Automation Hooks" batch at the "CLI Commands" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Auto-close issue when thread completes.

## Thread Details
Modify `src/cli/update.ts`:
- After task status changes to "completed":
- Check if all tasks in same thread are completed
- If thread complete and has github_issue, close the issue
- Update github_issue.state to "closed" in tasks.json
Create `src/lib/github/sync.ts`:
- `isThreadComplete(repoRoot, streamId, stageId, batchId, threadId)`
- `checkAndCloseThreadIssue(repoRoot, streamId, taskId)`

Your tasks are:
- [ ] 04.02.02.01 Add isThreadComplete helper to sync.ts
- [ ] 04.02.02.02 Add checkAndCloseThreadIssue function to sync.ts
- [ ] 04.02.02.03 Modify update.ts to call checkAndCloseThreadIssue after status changes to completed
- [ ] 04.02.02.04 Update github_issue.state to 'closed' in tasks.json

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-4/02-automation-hooks/update-hook/`

Use the `implementing-workstreams` skill.
When listing tasks, use `work list --tasks --batch "04.02"` to see tasks for this batch only.
