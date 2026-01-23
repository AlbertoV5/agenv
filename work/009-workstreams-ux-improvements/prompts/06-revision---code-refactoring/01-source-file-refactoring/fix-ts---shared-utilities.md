Hello Agent!

You are working on the "Source File Refactoring" batch at the "Revision - Code Refactoring" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Fix.ts & Shared Utilities" (3)

## Thread Summary
Extract duplicated utilities from fix.ts and create shared modules for prompt paths and session retrieval.

## Thread Details
- Working packages: `./packages/workstreams`
- Run tests first: `bun run test` in packages/workstreams
- Create `src/lib/prompt-paths.ts`:
- Extract `getPromptFilePath()` from fix.ts
- Extract `getPromptFilePathFromMetadata()` from multi.ts
- Consolidate into single `resolvePromptPath(threadId, streamPath)` function
- Update `src/lib/threads.ts`:
- Add `getLastSessionForThread(threadId)` helper
- Add `getOpencodeSessionId(threadId)` helper
- Refactor fix.ts:
- Use shared `resolvePromptPath()` instead of inline logic
- Use threads.ts helpers instead of direct file access
- Consider extracting `executeResume()` and `executeRetry()` to `src/lib/fix-actions.ts`
- Update multi.ts to use shared `resolvePromptPath()`
- Run tests last: `bun run test` to verify no regressions

Your tasks are:
- [ ] 06.01.03.01 Run tests first - execute `bun run test` in packages/workstreams to establish baseline
- [ ] 06.01.03.02 Create src/lib/prompt-paths.ts - consolidate getPromptFilePath() from fix.ts and getPromptFilePathFromMetadata() from multi.ts
- [ ] 06.01.03.03 Add getLastSessionForThread(threadId) helper to src/lib/threads.ts
- [ ] 06.01.03.04 Add getOpencodeSessionId(threadId) helper to src/lib/threads.ts
- [ ] 06.01.03.05 Update fix.ts to use shared resolvePromptPath() and threads.ts helpers
- [ ] 06.01.03.06 Update multi.ts to use shared resolvePromptPath() instead of inline logic
- [ ] 06.01.03.07 Run tests last - execute `bun run test` to verify no regressions

When listing tasks, use `work list --tasks --batch "06.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
