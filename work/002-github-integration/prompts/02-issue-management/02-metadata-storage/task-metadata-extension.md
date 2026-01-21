Hello Agent!

You are working on the "Metadata Storage" batch at the "Issue Management" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Add github_issue field to Task interface.

## Thread Details
Modify `src/lib/types.ts`:
```typescript
interface Task {
  // ... existing fields ...
  github_issue?: {
    number: number
    url: string
    state: "open" | "closed"
  }
}
```
Update `src/lib/tasks.ts`:
- Handle github_issue field in read/write operations
- Add `getTaskGitHubMeta(repoRoot, streamId, taskId)`
- Add `setTaskGitHubMeta(repoRoot, streamId, taskId, meta)`

Your tasks are:
- [ ] 02.02.01.01 Add github_issue optional field to Task interface in types.ts
- [ ] 02.02.01.02 Add getTaskGitHubMeta helper to tasks.ts
- [ ] 02.02.01.03 Add setTaskGitHubMeta helper to tasks.ts
- [ ] 02.02.01.04 Ensure github_issue field is preserved in task read/write operations

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-2/02-metadata-storage/task-metadata-extension/`

Use the `implementing-workstream-plans` skill.
When listing tasks, use `work list --tasks --batch "02.02"` to see tasks for this batch only.
