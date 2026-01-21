Hello Agent!

You are working on the "Automation Hooks" batch at the "CLI Commands" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Auto-create issues after workstream approval.

## Thread Details
Modify `src/cli/approve.ts`:
- After successful approval, check if GitHub is enabled
- If enabled and auto_create_issues is true:
- Call `ensureWorkstreamLabels()` to create labels
- Call `createThreadIssue()` for each thread
- Log created issue URLs
- Handle errors gracefully (don't fail approval if GitHub fails)

Your tasks are:
- [ ] 04.02.01.01 Create src/lib/github/sync.ts with createIssuesForWorkstream function
- [ ] 04.02.01.02 Modify approve.ts to check if GitHub is enabled after approval
- [ ] 04.02.01.03 Call ensureWorkstreamLabels and createThreadIssue for each thread
- [ ] 04.02.01.04 Handle errors gracefully without failing approval

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-4/02-automation-hooks/approve-hook/`

Use the `implementing-workstream-plans` skill.
When listing tasks, use `work list --tasks --batch "04.02"` to see tasks for this batch only.
