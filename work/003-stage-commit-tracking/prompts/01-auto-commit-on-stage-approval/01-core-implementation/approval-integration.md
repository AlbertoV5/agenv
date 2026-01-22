Hello Agent!

You are working on the "Core Implementation" batch at the "Auto-Commit on Stage Approval" stage of the "Stage Commit Tracking" workstream.

This is your thread:

"Approval Integration" (2)

## Thread Summary
Integrate commit creation into the stage approval flow.

## Thread Details
- Working package: `./packages/workstreams`
- Modify `packages/workstreams/src/cli/approve.ts`:
- After successful stage approval, check if GitHub integration enabled
- Check new config flag `auto_commit_on_approval`
- Call `createStageApprovalCommit()` if enabled
- Store returned commit SHA in stage approval metadata
- Modify `src/lib/approval.ts`:
- Add `commit_sha?: string` to stage approval metadata type
- Add function to store commit SHA after approval
- Modify `src/lib/github/config.ts`:
- Add `auto_commit_on_approval: boolean` to config type (default: true)

Your tasks are:
- [ ] 01.01.02.01 Add commit_sha field to StageApproval type in src/lib/types.ts
- [ ] 01.01.02.02 Add auto_commit_on_approval to GitHubConfig type in src/lib/github/types.ts
- [ ] 01.01.02.03 Update DEFAULT_GITHUB_CONFIG with auto_commit_on_approval default true
- [ ] 01.01.02.04 Modify approve.ts to call createStageApprovalCommit after stage approval
- [ ] 01.01.02.05 Store commit SHA in stage approval metadata

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
