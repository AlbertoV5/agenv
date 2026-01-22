Hello Agent!

You are working on the "Issue Lifecycle" batch at the "Issue Lifecycle and Workstream Completion" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

"Update Issue Body on Completion" (1)

## Thread Summary
Update GitHub issue body when thread completes to show checked tasks with reports.

## Thread Details
Modify `src/lib/github/issues.ts`:
- Add `formatCompletedIssueBody(input, tasks[])` function
- Format tasks as `- [x] Task name` (checked)
- Include report as blockquote if present: `> Report: ...`
- Mark cancelled tasks with `*(cancelled)*`
- Add `updateThreadIssueBody(repoRoot, streamId, issueNumber, tasks[])` function
- Use `client.updateIssue()` with new body
Modify `src/lib/github/sync.ts`:
- In `checkAndCloseThreadIssue()`: call `updateThreadIssueBody()` before closing
- In `syncIssueStates()`: call `updateThreadIssueBody()` before closing

Your tasks are:
- [ ] 06.01.01.01 Add formatCompletedIssueBody function to issues.ts that formats tasks with checkmarks
- [ ] 06.01.01.02 Include task report as blockquote when present (e.g.
- [ ] 06.01.01.03 Mark cancelled tasks with *(cancelled)* indicator
- [ ] 06.01.01.04 Add updateThreadIssueBody function using client.updateIssue()
- [ ] 06.01.01.05 Call updateThreadIssueBody in checkAndCloseThreadIssue before closing
- [ ] 06.01.01.06 Call updateThreadIssueBody in syncIssueStates before closing

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-6/01-issue-lifecycle/update-issue-body-on-completion/`

Use the `implementing-workstreams` skill.
When listing tasks, use `work list --tasks --batch "06.01"` to see tasks for this batch only.
