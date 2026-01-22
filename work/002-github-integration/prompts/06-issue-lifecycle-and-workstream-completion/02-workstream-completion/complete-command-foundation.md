Hello Agent!

You are working on the "Workstream Completion" batch at the "Issue Lifecycle and Workstream Completion" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

"Complete Command Foundation" (1)

## Thread Summary
Create `work complete` command that validates and prepares for PR.

## Thread Details
Create `src/cli/complete.ts`:
- Check all stages are approved (`work check approval` logic)
- Check GitHub is enabled and branch exists
- Verify we're on the workstream branch
- Display summary: tasks completed, branch name, target branch
- Store completion metadata in stream (index.json):
```typescript
github?: {
  branch?: string
  completed_at?: string
  pr_number?: number
}
```
Update `bin/work.ts`:
- Add `complete` to command router

Your tasks are:
- [ ] 06.02.01.01 Create src/cli/complete.ts with command structure
- [ ] 06.02.01.02 Add approval check - verify all stages are approved
- [ ] 06.02.01.03 Add GitHub check - verify enabled and branch exists
- [ ] 06.02.01.04 Add branch check - verify on workstream branch
- [ ] 06.02.01.05 Display completion summary (tasks, branch, target)
- [ ] 06.02.01.06 Extend StreamMetadata.github with completed_at and pr_number fields
- [ ] 06.02.01.07 Add 'complete' case to bin/work.ts command router

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-6/02-workstream-completion/complete-command-foundation/`

Use the `implementing-workstreams` skill.
When listing tasks, use `work list --tasks --batch "06.02"` to see tasks for this batch only.
