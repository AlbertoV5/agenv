Hello Agent!

You are working on the "Stage Issue Commands" batch at the "GitHub Issues Per Stage" stage of the "Workstream Review Standardization" workstream.

This is your thread:

"Sync Stage Issues" (2)

## Thread Summary
Update `work github sync` to sync stage-level issues.

## Thread Details
- Working packages: `packages/workstreams/src/lib/github`
- Update `syncIssueStates()` to work with stages
- Close issue when all tasks in stage are completed
- Update github.json state on sync
- Remove thread-level sync logic

Your tasks are:
- [ ] 03.02.02.01 Create `syncStageIssues()` function in sync.ts that works with stages instead of threads
- [ ] 03.02.02.02 Close stage issue when all tasks in stage are completed
- [ ] 03.02.02.03 Update github.json state field when syncing
- [ ] 03.02.02.04 Update `work github sync` command to use new stage-level sync
- [ ] 03.02.02.05 Remove or deprecate thread-level sync functions
- [ ] 03.02.02.06 Run `bun run typecheck` and test sync functionality

When listing tasks, use `work list --tasks --batch "03.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
