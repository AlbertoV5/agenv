Hello Agent!

You are working on the "Session Storage Infrastructure" batch at the "Revision - Planning Session Resume" stage of the "Synthesis Output Parsing" workstream.

This is your thread:

"Add Types and Index Helpers" (1)

## Thread Summary
Add `planningSession` field to `StreamMetadata` type and create helper functions in `index.ts` to get/set planning session IDs.

## Thread Details
- Working package: `./packages/workstreams`
- Update `packages/workstreams/src/lib/types.ts`:
- Add `PlanningSession` interface with `sessionId: string` and `createdAt: string`
- Add optional `planningSession?: PlanningSession` field to `StreamMetadata`
- Update `packages/workstreams/src/lib/index.ts`:
- Add `setStreamPlanningSession(repoRoot, streamId, sessionId)` function
- Add `getPlanningSessionId(repoRoot, streamId): string | null` function
- Follow existing pattern from `setStreamGitHubMeta()`

Your tasks are:
- [ ] 03.01.01.01 Add `PlanningSession` interface to `packages/workstreams/src/lib/types.ts` with `sessionId: string` and `createdAt: string` fields
- [ ] 03.01.01.02 Add optional `planningSession?: PlanningSession` field to `StreamMetadata` interface in types.ts
- [ ] 03.01.01.03 Add `setStreamPlanningSession(repoRoot, streamId, sessionId)` function to `packages/workstreams/src/lib/index.ts`
- [ ] 03.01.01.04 Add `getPlanningSessionId(repoRoot, streamId): string | null` function to index.ts

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
