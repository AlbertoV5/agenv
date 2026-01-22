Hello Agent!

You are working on the "Integration" batch at the "Integration and Polish" stage of the "Session Tracking" workstream.

This is your thread:

"Status Command Enhancement" (2)

## Thread Summary
Enhance `work status` to show session information.

## Thread Details
- Working package: `./packages/workstreams`
- Update `src/cli/status.ts` to display:
- Session count per thread
- Last session status and timestamp
- Current running sessions (if any)
- Resumable threads indicator
- Add `--sessions` flag for detailed session history view
- Format output for readability

Your tasks are:
- [ ] 03.01.02.01 Add session count and last session status to thread display
- [ ] 03.01.02.02 Add indicator for currently running sessions
- [ ] 03.01.02.03 Add indicator for resumable threads
- [ ] 03.01.02.04 Implement --sessions flag for detailed session history view

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
