Hello Agent!

You are working on the "Foundation" batch at the "Core Infrastructure" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Notification System" (1)

## Thread Summary
Create a notification library that plays sounds on macOS with extensibility for custom sounds and external API hooks.

## Thread Details
- Working packages: `./packages/workstreams`
- Create `src/lib/notifications.ts` with:
- `NotificationProvider` interface for extensibility
- `MacOSSoundProvider` - Default implementation using `afplay`
- `playNotification(event: 'thread_complete' | 'batch_complete' | 'error')` function
- Configuration loading from `~/.config/agenv/notifications.json` for custom sounds
- `ExternalApiProvider` stub interface for future webhook/API integrations
- Default sounds from macOS system sounds (`/System/Library/Sounds/`)
- Async/non-blocking playback (spawn process, don't await)
- Create `tests/notifications.test.ts` with mocked audio playback

Your tasks are:
- [ ] 01.01.01.01 Create NotificationProvider interface with event types (thread_complete, batch_complete, error) and playNotification method
- [ ] 01.01.01.02 Implement MacOSSoundProvider using afplay with default system sounds from /System/Library/Sounds/
- [ ] 01.01.01.03 Add configuration loading from ~/.config/agenv/notifications.json for custom sound mappings
- [ ] 01.01.01.04 Create ExternalApiProvider stub interface for future webhook/API integrations
- [ ] 01.01.01.05 Write unit tests for notifications.ts with mocked audio playback

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
