Hello Agent!

You are working on the "Issue Lifecycle" batch at the "Issue Lifecycle and Workstream Completion" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

"Reopen Issues on Status Change" (3)

## Thread Summary
Reopen GitHub issue when task status changes from completed back to in_progress or blocked.

## Thread Details
Modify `src/lib/github/sync.ts`:
- Add `reopenThreadIssue(repoRoot, streamId, issueNumber)` function
- Add `checkAndReopenThreadIssue(repoRoot, streamId, taskId)` function
- Called when task changes FROM completed TO in_progress/blocked
- Check if thread was complete, now incomplete
- Reopen issue if github_issue.state is "closed"
Modify `src/cli/update.ts`:
- After task status change, if previous status was "completed":
- Call `checkAndReopenThreadIssue()`
- Track previous status before update
Add to `src/lib/github/client.ts`:
- Add `reopenIssue(number)` method (use updateIssue with state: "open")

Your tasks are:
- [ ] 06.01.03.01 Add reopenIssue method to GitHubClient (updateIssue with state: "open")
- [ ] 06.01.03.02 Add reopenThreadIssue function to sync.ts
- [ ] 06.01.03.03 Add checkAndReopenThreadIssue function to sync.ts
- [ ] 06.01.03.04 Track previous task status in update.ts before applying changes
- [ ] 06.01.03.05 Call checkAndReopenThreadIssue when task changes from completed to in_progress/blocked
- [ ] 06.01.03.06 Update github_issue.state to "open" in tasks.json when reopened

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-6/01-issue-lifecycle/reopen-issues-on-status-change/`

Use the `implementing-workstream-plans` skill.
When listing tasks, use `work list --tasks --batch "06.01"` to see tasks for this batch only.
