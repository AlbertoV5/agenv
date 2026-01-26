Hello Agent!

You are working on the "GitHub.json Structure" batch at the "GitHub Issues Per Stage" stage of the "Workstream Review Standardization" workstream.

This is your thread:

"Remove Thread Issue Storage" (2)

## Thread Summary
Remove github_issue storage from tasks.json and threads.json.

## Thread Details
- Working packages: `packages/workstreams/src/lib`
- Remove `github_issue` field from Task type
- Remove `githubIssue` field from ThreadMetadata type
- Update any code that reads these fields
- Clean migration: these fields simply won't be used anymore

Your tasks are:
- [ ] 03.01.02.01 Remove `github_issue` field from Task interface in `packages/workstreams/src/lib/types.ts`
- [ ] 03.01.02.02 Remove `githubIssue` field from ThreadMetadata interface in types
- [ ] 03.01.02.03 Update `storeThreadIssueMeta()` in issues.ts to be a no-op or remove entirely
- [ ] 03.01.02.04 Find and update all code that reads `task.github_issue` or `thread.githubIssue`
- [ ] 03.01.02.05 Run `bun run typecheck` and fix any resulting errors

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
