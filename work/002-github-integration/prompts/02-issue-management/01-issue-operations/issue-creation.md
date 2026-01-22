Hello Agent!

You are working on the "Issue Operations" batch at the "Issue Management" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Create GitHub issues for workstream threads.

## Thread Details
Create `src/lib/github/issues.ts` with:
- `formatIssueTitle(stageId, batchId, threadId, threadName, streamName)`
- Format: `[01.01.02] Thread Name - workstream-name`
- `formatIssueBody(input: CreateThreadIssueInput)`
- Include summary, details, links to related threads
- `createThreadIssue(repoRoot, input)` - create issue via client
- `closeThreadIssue(repoRoot, streamId, issueNumber)` - close issue
- `storeThreadIssueMeta(repoRoot, streamId, taskId, meta)` - save to tasks.json

Your tasks are:
- [ ] 02.01.01.01 Create src/lib/github/issues.ts with formatIssueTitle function
- [ ] 02.01.01.02 Implement formatIssueBody with thread summary, details, and workstream context
- [ ] 02.01.01.03 Implement createThreadIssue that creates issue and returns ThreadGitHubMeta
- [ ] 02.01.01.04 Implement closeThreadIssue to close an issue by number
- [ ] 02.01.01.05 Implement storeThreadIssueMeta to save issue metadata to tasks.json

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-2/01-issue-operations/issue-creation/`

Use the `implementing-workstreams` skill.
When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.
