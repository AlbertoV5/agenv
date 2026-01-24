Hello Agent!

You are working on the "Command and Session Building" batch at the "Integration" stage of the "Synthesis Agents" workstream.

This is your thread:

"Working Session Tracker" (2)

## Thread Summary
Add logic to track and store the working agent session ID separately from synthesis session.

## Thread Details
- Working packages: `./packages/workstreams`
- Extend threads.ts with functions:
- `setWorkingAgentSessionId(repoRoot, streamId, threadId, sessionId)`
- `getWorkingAgentSessionId(repoRoot, streamId, threadId)`
- The working agent session ID is what we want to use for `work fix --resume`
- Update multi.ts session close handler to capture and store both session IDs

Your tasks are:
- [ ] 02.01.02.01 Add `setWorkingAgentSessionId(repoRoot, streamId, threadId, sessionId)` function to threads.ts
- [ ] 02.01.02.02 Add `getWorkingAgentSessionId(repoRoot, streamId, threadId)` function to threads.ts
- [ ] 02.01.02.03 Update the session close handler in multi.ts to capture and store both synthesis and working agent session IDs
- [ ] 02.01.02.04 Ensure `work fix --resume` uses `workingAgentSessionId` when available, falling back to `opencodeSessionId`

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
