Hello Agent!

You are working on the "Documentation and Testing" batch at the "Integration and Polish" stage of the "Session Tracking" workstream.

This is your thread:

"Error Handling" (2)

## Thread Summary
Add comprehensive error handling across session tracking features.

## Thread Details
- Working package: `./packages/workstreams`
- Handle cases:
- Session ID not available (opencode version mismatch)
- Stale session (can't resume old sessions)
- Concurrent writes to tasks.json
- Missing or corrupted session records
- Add graceful degradation if session tracking fails
- Log warnings for debugging
- Ensure existing workflows continue to work even if session tracking fails
*Last updated: 2026-01-22*

Your tasks are:
- [ ] 03.02.02.01 Handle missing session ID gracefully with fallback behavior
- [ ] 03.02.02.02 Handle stale sessions that cannot be resumed
- [ ] 03.02.02.03 Add file locking or retry logic for concurrent tasks.json writes
- [ ] 03.02.02.04 Add validation for corrupted or missing session records
- [ ] 03.02.02.05 Ensure existing workflows work even if session tracking fails

When listing tasks, use `work list --tasks --batch "03.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
