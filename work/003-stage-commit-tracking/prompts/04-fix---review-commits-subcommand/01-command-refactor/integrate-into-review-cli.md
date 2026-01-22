Hello Agent!

You are working on the "Command Refactor" batch at the "Fix - review-commits-subcommand" stage of the "Stage Commit Tracking" workstream.

This is your thread:

"Integrate into Review CLI" (1)

## Thread Summary
Move commits functionality into review.ts as a subcommand.

## Thread Details
- Working package: `./packages/workstreams`
- Modify `packages/workstreams/src/cli/review.ts`:
- Add `commits` to subcommand type: `"plan" | "tasks" | "commits"`
- Import git log functions from `src/lib/git/log.ts`
- Add commits subcommand handling with same options as review-commits.ts
- Update help text to include `work review commits` usage
- Remove `packages/workstreams/src/cli/review-commits.ts`
- Remove import and registration from `bin/work.ts`

Your tasks are:
- [ ] 04.01.01.01 Add commits subcommand to review.ts with imports from src/lib/git/log.ts
- [ ] 04.01.01.02 Update review.ts help text to include work review commits usage
- [ ] 04.01.01.03 Remove review-commits.ts and its registration from bin/work.ts

When listing tasks, use `work list --tasks --batch "04.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
