Hello Agent!

You are working on the "Integration" batch at the "Revision - Notification Configuration" stage of the "Synthesis Agents" workstream.

This is your thread:

"NotificationManager Update" (1)

## Thread Summary
Update NotificationManager to load config and initialize configured providers.

## Thread Details
- Working packages: `./packages/workstreams`
- Modify `NotificationManager` constructor to accept optional `repoRoot` parameter
- Load `notifications.json` from `work/notifications.json` if repoRoot provided
- Fall back to `~/.config/agenv/notifications.json` for global config (existing behavior)
- Initialize only enabled providers based on config
- Update `playNotification()` to respect per-event configuration
- Update multi.ts to pass repoRoot when creating NotificationManager

Your tasks are:
- [ ] 05.03.01.01 Update `NotificationManager` constructor to accept optional `repoRoot` parameter for loading workstream-specific config
- [ ] 05.03.01.02 Modify provider initialization to read from `notifications.json` and only enable configured providers
- [ ] 05.03.01.03 Add fallback chain: workstream config (`work/notifications.json`) -> global config (`~/.config/agenv/notifications.json`) -> defaults
- [ ] 05.03.01.04 Update `playNotification()` to check per-event configuration before dispatching to providers
- [ ] 05.03.01.05 Update multi.ts to pass repoRoot when creating NotificationManager and NotificationTracker

When listing tasks, use `work list --tasks --batch "05.03"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
