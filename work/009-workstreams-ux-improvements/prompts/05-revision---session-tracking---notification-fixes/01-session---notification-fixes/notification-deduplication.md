Hello Agent!

You are working on the "Session & Notification Fixes" batch at the "Revision - Session Tracking & Notification Fixes" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Notification Deduplication" (3)

## Thread Summary
Ensure only one notification per thread and one batch notification, regardless of how tmux session ends.

## Thread Details
- Working packages: `./packages/workstreams`
- Create a notification state tracker in multi.ts:
- `Set<string>` to track threadIds that have already played `thread_complete`
- Boolean flag for `batch_complete` played
- Modify all notification call sites:
- Check tracker before calling `playNotification()`
- Add threadId to tracker after playing sound
- Remove the loop in Ctrl-b X handler that plays sound for each thread
- Ensure edge cases don't cause duplicate sounds:
- Thread completes normally
- User closes tmux session early
- Thread fails/errors
- Add unit tests for notification deduplication logic

Your tasks are:
- [ ] 05.01.03.01 Create NotificationTracker class/object with Set<string> for notified threadIds and batchCompleteNotified flag
- [ ] 05.01.03.02 Wrap all playNotification calls to check tracker before playing, add to tracker after
- [ ] 05.01.03.03 Remove the loop in Ctrl-b X handler that plays sound for each thread (lines 875-889 in multi.ts)
- [ ] 05.01.03.04 Handle edge cases: normal completion, early tmux close, thread failure - ensure single notification per event
- [ ] 05.01.03.05 Add unit tests for NotificationTracker deduplication logic

When listing tasks, use `work list --tasks --batch "05.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
