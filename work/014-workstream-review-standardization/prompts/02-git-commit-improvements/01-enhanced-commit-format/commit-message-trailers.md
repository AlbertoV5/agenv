Hello Agent!

You are working on the "Enhanced Commit Format" batch at the "Git Commit Improvements" stage of the "Workstream Review Standardization" workstream.

This is your thread:

"Commit Message Trailers" (1)

## Thread Summary
Add Stream-Name and Stage-Name trailers to stage approval commits.

## Thread Details
- Working packages: `packages/workstreams/src/lib/github`
- Update `formatStageCommitMessage()` in `commits.ts`
- Add `Stream-Name: {name}` trailer
- Add `Stage-Name: {name}` trailer
- Keep existing trailers for backwards compatibility
- Format example:
```
Stage 1 approved: Foundation

Approved stage 1 of workstream 014-workstream-review.

Stream-Id: 014-workstream-review
Stream-Name: Workstream Review Standardization
Stage: 1
Stage-Name: Foundation
```

Your tasks are:
- [ ] 02.01.01.01 Update `formatStageCommitMessage()` in `packages/workstreams/src/lib/github/commits.ts` to add `Stream-Name` trailer
- [ ] 02.01.01.02 Add `Stage-Name` trailer to the commit message format
- [ ] 02.01.01.03 Update function signature to accept stream name and stage name parameters
- [ ] 02.01.01.04 Update callers of `formatStageCommitMessage()` to pass the new parameters
- [ ] 02.01.01.05 Run `bun run typecheck` and verify commit format looks correct

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
