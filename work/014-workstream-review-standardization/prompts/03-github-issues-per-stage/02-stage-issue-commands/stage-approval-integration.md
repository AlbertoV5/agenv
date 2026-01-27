Hello Agent!

You are working on the "Stage Issue Commands" batch at the "GitHub Issues Per Stage" stage of the "Workstream Review Standardization" workstream.

This is your thread:

"Stage Approval Integration" (3)

## Thread Summary
Optionally close GitHub issue when stage is approved.

## Thread Details
- Working packages: `packages/workstreams/src/cli/approve`
- In stage approval, check if stage has GitHub issue
- Add option to close issue on approval (since approval means stage is complete)
- Update github.json with closed_at timestamp

Your tasks are:
- [ ] 03.02.03.01 In stage approval (approve/plan.ts or relevant file), check if stage has GitHub issue in github.json
- [ ] 03.02.03.02 Add `--close-issue` flag to `work approve stage` to optionally close the GitHub issue
- [ ] 03.02.03.03 Update github.json with `closed_at` timestamp when issue is closed
- [ ] 03.02.03.04 Run `bun run typecheck` and test stage approval with issue closing

When listing tasks, use `work list --tasks --batch "03.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
