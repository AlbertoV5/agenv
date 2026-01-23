Hello Agent!

You are working on the "Session & Notification Fixes" batch at the "Revision - Session Tracking & Notification Fixes" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"First Command Completion Detection" (2)

## Thread Summary
Detect when `opencode run` finishes (model done, awaiting user input) and trigger notification at that moment, not when the pane/session closes.

## Thread Details
- Working packages: `./packages/workstreams`
- Modify `src/lib/opencode.ts` shell script structure:
- After `opencode run` exits, write a marker file: `/tmp/workstream-{threadId}-complete.txt`
- Marker indicates first command done, user can now interact with TUI
- Modify `src/cli/multi.ts`:
- Add file watcher or polling loop to detect marker files
- When marker detected for a thread, trigger `playNotification('thread_complete')`
- Track which threads have notified to prevent duplicates
- Only play `batch_complete` when ALL threads have marker files (first commands done)
- Remove notification triggers from the Ctrl-b X / session close handler
- Remove per-thread notification from the `child.on("close")` handler
- Update `--silent` flag to still suppress sounds
- Add cleanup of marker files when batch completes
- Update tests for new notification timing

Your tasks are:
- [ ] 05.01.02.01 Modify buildRunCommand to write marker file /tmp/workstream-{threadId}-complete.txt after opencode run exits (before opencode --session)
- [ ] 05.01.02.02 Modify buildRetryRunCommand similarly to write completion marker
- [ ] 05.01.02.03 Add file watcher/polling in multi.ts to detect marker files for each thread
- [ ] 05.01.02.04 Trigger playNotification('thread_complete') when marker detected, not when pane exits
- [ ] 05.01.02.05 Trigger playNotification('batch_complete') only when ALL threads have marker files
- [ ] 05.01.02.06 Remove notification triggers from child.on('close') and Ctrl-b X handlers
- [ ] 05.01.02.07 Add cleanup of /tmp/workstream-*-complete.txt marker files after batch completes
- [ ] 05.01.02.08 Update tests for new marker-based notification timing

When listing tasks, use `work list --tasks --batch "05.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
