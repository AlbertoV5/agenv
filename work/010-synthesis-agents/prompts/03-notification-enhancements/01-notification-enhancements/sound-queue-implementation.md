Hello Agent!

You are working on the "Notification Enhancements" batch at the "Notification Enhancements" stage of the "Synthesis Agents" workstream.

This is your thread:

"Sound Queue Implementation" (1)

## Thread Summary
Add sound queueing to MacOSSoundProvider to prevent overlapping sounds when multiple threads complete simultaneously.

## Thread Details
- Working packages: `./packages/workstreams`
- Modify MacOSSoundProvider class:
- Add private queue: string[] for pending sound paths
- Add isPlaying: boolean flag
- Modify playNotification to queue sounds instead of spawning immediately
- Add playNext() method to play from queue when current sound finishes
- Use afplay's exit event to trigger next sound
- This prepares for TTS where we'd want summaries read sequentially

Your tasks are:
- [ ] 03.01.01.01 Add private `queue: string[]` array and `isPlaying: boolean` flag to MacOSSoundProvider class
- [ ] 03.01.01.02 Modify `playNotification()` method to push sounds to queue instead of spawning immediately
- [ ] 03.01.01.03 Implement `playNext()` private method to play the next sound from queue when current sound finishes
- [ ] 03.01.01.04 Hook into afplay's exit event to trigger `playNext()` for sequential sound playback
- [ ] 03.01.01.05 Write unit tests for the sound queue to verify sequential playback behavior

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
