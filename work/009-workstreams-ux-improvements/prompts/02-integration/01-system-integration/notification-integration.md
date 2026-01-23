Hello Agent!

You are working on the "System Integration" batch at the "Integration" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Notification Integration" (2)

## Thread Summary
Wire notification sounds into multi.ts thread completion events.

## Thread Details
- Working packages: `./packages/workstreams`
- Modify `src/cli/multi.ts`:
- Import notification service from `src/lib/notifications.ts`
- In `waitForAllPanesExit()` callback or status polling loop, detect thread completion
- Call `playNotification('thread_complete')` when a thread completes
- Call `playNotification('batch_complete')` when all threads in batch complete
- Call `playNotification('error')` on thread failure
- Add `--silent` flag to multi command to disable sounds
- Update `tests/multi.test.ts` with notification integration tests (mocked)

Your tasks are:
- [ ] 02.01.02.01 Import notification service in multi.ts and add --silent flag to disable sounds
- [ ] 02.01.02.02 Detect thread completion in status polling loop and call playNotification('thread_complete')
- [ ] 02.01.02.03 Call playNotification('batch_complete') when all threads in batch complete
- [ ] 02.01.02.04 Call playNotification('error') on thread failure detection
- [ ] 02.01.02.05 Add notification integration tests to multi.test.ts with mocked playback

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
