Hello Agent!

You are working on the "Session & Notification Fixes" batch at the "Revision - Session Tracking & Notification Fixes" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Opencode Session ID Capture" (1)

## Thread Summary
Modify the shell command structure to capture and report the actual opencode session ID back to workstreams for storage in threads.json.

## Thread Details
- Working packages: `./packages/workstreams`
- Modify `src/lib/opencode.ts` `buildRunCommand()` and `buildRetryRunCommand()`:
- After `opencode run` completes and session ID is looked up, write it to a known file path
- File path pattern: `/tmp/workstream-{threadId}-session.txt`
- Content: Just the opencode session ID (e.g., `ses_413402385ffe4rhZzbpafvjAUc`)
- Modify `src/cli/multi.ts`:
- After detecting thread completion (first command), read the session file
- Update threads.json with the actual opencode session ID via ThreadsStore
- Clean up temp files after reading
- Update `src/lib/threads.ts`:
- Add `opencodeSessionId` field to ThreadMetadata (separate from internal sessionId)
- Update `updateThreadMetadata()` to handle opencode session storage
- Update tests to verify opencode session capture

Your tasks are:
- [ ] 05.01.01.01 Modify buildRunCommand in opencode.ts to write opencode session ID to /tmp/workstream-{threadId}-session.txt after lookup
- [ ] 05.01.01.02 Modify buildRetryRunCommand similarly to write session ID to temp file
- [ ] 05.01.01.03 Add opcodeSessionId field to ThreadMetadata interface in types.ts (separate from internal sessionId)
- [ ] 05.01.01.04 Update multi.ts to read session file after thread first command completes and store in threads.json
- [ ] 05.01.01.05 Add cleanup of /tmp/workstream-*-session.txt files after batch completes
- [ ] 05.01.01.06 Update tests to verify opencode session ID capture and storage

When listing tasks, use `work list --tasks --batch "05.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
