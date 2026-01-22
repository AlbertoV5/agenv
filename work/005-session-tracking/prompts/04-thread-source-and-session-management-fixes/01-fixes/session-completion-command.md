Hello Agent!

You are working on the "Fixes" batch at the "Thread Source and Session Management Fixes" stage of the "Session Tracking" workstream.

This is your thread:

"Session Completion Command" (2)

## Thread Summary
Add `work session complete` command to manually mark sessions as completed.

## Thread Details
- Working package: `./packages/workstreams`
- Create `src/cli/session.ts` with subcommand structure:
```
work session complete --thread "01.01.01"     # Complete specific thread's session
work session complete --batch "01.01"         # Complete all sessions in batch
work session complete --all                   # Complete all running/interrupted sessions
```
- Update session status from 'running' or 'interrupted' to 'completed'
- Set completedAt timestamp
- Useful for recovery when tmux exits unexpectedly or agent crashes

Your tasks are:
- [ ] 04.01.02.01 Create src/cli/session.ts with subcommand structure
- [ ] 04.01.02.02 Implement work session complete --thread to complete specific thread session
- [ ] 04.01.02.03 Implement work session complete --batch to complete all sessions in batch
- [ ] 04.01.02.04 Implement work session complete --all to complete all running/interrupted sessions
- [ ] 04.01.02.05 Register session command in CLI router

When listing tasks, use `work list --tasks --batch "04.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
