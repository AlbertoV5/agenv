Hello Agent!

You are working on the "Notification Providers" batch at the "Revision - Notification Configuration" stage of the "Synthesis Agents" workstream.

This is your thread:

"macOS Notification Center Provider" (1)

## Thread Summary
Add a provider that uses osascript to show macOS Notification Center notifications.

## Thread Details
- Working packages: `./packages/workstreams`
- Create `MacOSNotificationCenterProvider` class implementing `NotificationProvider`
- Use `osascript -e 'display notification "message" with title "title" sound name "default"'`
- Support title, message, and optional sound
- Include synthesis output in notification body when available
- Always available on macOS (no external dependencies)

Your tasks are:
- [ ] 05.02.01.01 Create `MacOSNotificationCenterProvider` class implementing `NotificationProvider` interface in notifications/providers/
- [ ] 05.02.01.02 Implement `playNotification()` using osascript: `osascript -e 'display notification "message" with title "title" sound name "default"'`
- [ ] 05.02.01.03 Add support for including synthesis output in notification body when metadata is provided
- [ ] 05.02.01.04 Implement `isAvailable()` to return true only on macOS (check process.platform === "darwin")
- [ ] 05.02.01.05 Add unit tests for MacOSNotificationCenterProvider

When listing tasks, use `work list --tasks --batch "05.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
