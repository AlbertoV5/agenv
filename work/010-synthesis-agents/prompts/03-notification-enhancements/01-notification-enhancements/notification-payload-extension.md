Hello Agent!

You are working on the "Notification Enhancements" batch at the "Notification Enhancements" stage of the "Synthesis Agents" workstream.

This is your thread:

"Notification Payload Extension" (2)

## Thread Summary
Extend webhook payload and notification events to include synthesis output for future TTS.

## Thread Details
- Working packages: `./packages/workstreams`
- Extend NotificationEvent type or add new event: "thread_synthesis_complete"
- Add metadata option to playNotification for passing synthesis output
- Extend WebhookPayload to include synthesisOutput field
- Update NotificationTracker to accept and pass through synthesis data
- Add helper method: playSynthesisComplete(threadId, synthesisOutput)
- This sets up the interface for a future TTSProvider to receive summaries
- Maintain backward compatibility: existing notification consumers unaffected

Your tasks are:
- [ ] 03.01.02.01 Add new `thread_synthesis_complete` event type to NotificationEvent type definition
- [ ] 03.01.02.02 Add optional `metadata` parameter to `playNotification()` method for passing synthesis output
- [ ] 03.01.02.03 Extend `WebhookPayload` interface to include optional `synthesisOutput` field
- [ ] 03.01.02.04 Update `NotificationTracker` to accept and pass through synthesis data to providers
- [ ] 03.01.02.05 Add `playSynthesisComplete(threadId: string, synthesisOutput: string)` helper method to NotificationManager

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
