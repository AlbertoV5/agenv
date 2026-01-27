Hello Agent!

You are working on the "Enhanced Commit Format" batch at the "Git Commit Improvements" stage of the "Workstream Review Standardization" workstream.

This is your thread:

"Trailer Parsing Updates" (2)

## Thread Summary
Update trailer extraction to support new trailers and fix date parsing.

## Thread Details
- Working packages: `packages/workstreams/src/lib/git`
- Update `extractWorkstreamTrailers()` in `log.ts`
- Add parsing for `Stream-Name` and `Stage-Name`
- Update `WorkstreamTrailers` interface
- Fix date parsing fallback in review.ts `formatCommit()`

Your tasks are:
- [ ] 02.01.02.01 Add `streamName` and `stageName` fields to `WorkstreamTrailers` interface in `packages/workstreams/src/lib/git/log.ts`
- [ ] 02.01.02.02 Update `extractWorkstreamTrailers()` to parse `Stream-Name:` and `Stage-Name:` trailers
- [ ] 02.01.02.03 Fix date parsing in `formatCommit()` in `packages/workstreams/src/cli/review.ts` - ensure fallback works for commits with invalid dates
- [ ] 02.01.02.04 Run `bun run typecheck` to verify no type errors

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
