Hello Agent!

You are working on the "Integration" batch at the "Revision - Notification Configuration" stage of the "Synthesis Agents" workstream.

This is your thread:

"Documentation and Defaults" (2)

## Thread Summary
Document the notification configuration and create sensible defaults.

## Thread Details
- Working packages: `./packages/workstreams`
- Update `work init` to create default `notifications.json`:
```json
{
  "enabled": true,
  "providers": {
    "sound": { "enabled": true },
    "notification_center": { "enabled": true },
    "terminal_notifier": { "enabled": false }
  },
  "events": {
    "thread_complete": true,
    "batch_complete": true,
    "error": true,
    "synthesis_complete": true
  }
}
```
- Add `work notifications` command to show current config and provider status
- Update README with notification configuration section

Your tasks are:
- [ ] 05.03.02.01 Update `work init` command to create default `notifications.json` in work directory
- [ ] 05.03.02.02 Create `work notifications` command to display current config and provider availability status
- [ ] 05.03.02.03 Update packages/workstreams/README.md with notification configuration section
- [ ] 05.03.02.04 Add example notifications.json to documentation with all provider options explained
- [ ] 05.03.02.05 Add JSDoc comments to all new notification config functions and interfaces

When listing tasks, use `work list --tasks --batch "05.03"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
