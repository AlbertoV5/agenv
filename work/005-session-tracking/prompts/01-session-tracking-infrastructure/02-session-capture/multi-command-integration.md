Hello Agent!

You are working on the "Session Capture" batch at the "Session Tracking Infrastructure" stage of the "Session Tracking" workstream.

This is your thread:

"Multi Command Integration" (2)

## Thread Summary
Update `work multi` to track sessions for parallel threads.

## Thread Details
- Working package: `./packages/workstreams`
- Modify `src/cli/multi.ts`:
1. For each thread window, capture session ID before spawn
2. Update tasks.json atomically (file locking consideration)
3. Track session status per window
4. On batch completion, update all session statuses
- Integrate with tmux window tracking in `src/lib/tmux.ts`
- Handle race conditions with multiple parallel writes

Your tasks are:
- [ ] 01.02.02.01 Generate session IDs for each thread before parallel spawn
- [ ] 01.02.02.02 Implement atomic tasks.json updates to handle concurrent writes
- [ ] 01.02.02.03 Track session status per tmux window using window hooks or polling
- [ ] 01.02.02.04 Update all session statuses on batch completion
- [ ] 01.02.02.05 Integrate with tmux.ts to capture window exit events

When listing tasks, use `work list --tasks --batch "01.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
