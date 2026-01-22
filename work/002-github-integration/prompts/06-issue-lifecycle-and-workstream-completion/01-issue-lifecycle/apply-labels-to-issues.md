Hello Agent!

You are working on the "Issue Lifecycle" batch at the "Issue Lifecycle and Workstream Completion" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

"Apply Labels to Issues" (2)

## Thread Summary
Connect label creation to issue creation - labels are created but not attached.

## Thread Details
Review `src/lib/github/issues.ts`:
- Line 76 has `const labels: string[] = []` with TODO
- Call `getThreadLabels()` from labels.ts to get label names
- Pass labels array to `client.createIssue()`
Verify in `src/lib/github/labels.ts`:
- Ensure `getThreadLabels()` returns correct label names
- Labels should already exist via `ensureWorkstreamLabels()`

Your tasks are:
- [ ] 06.01.02.01 Import getThreadLabels from labels.ts in issues.ts
- [ ] 06.01.02.02 Replace empty labels array with getThreadLabels call in createThreadIssue
- [ ] 06.01.02.03 Verify labels are attached by testing issue creation

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-6/01-issue-lifecycle/apply-labels-to-issues/`

Use the `implementing-workstreams` skill.
When listing tasks, use `work list --tasks --batch "06.01"` to see tasks for this batch only.
