Hello Agent!

You are working on the "Configuration Schema" batch at the "Revision - Notification Configuration" stage of the "Synthesis Agents" workstream.

This is your thread:

"Config Schema and Loader" (1)

## Thread Summary
Create the notifications.json schema and configuration loader.

## Thread Details
- Working packages: `./packages/workstreams`
- Create `NotificationsConfig` interface in types.ts:
```typescript
interface NotificationsConfig {
  enabled: boolean
  providers: {
    sound?: { enabled: boolean; volume?: number }
    notification_center?: { enabled: boolean }
    terminal_notifier?: { enabled: boolean; click_action?: "activate_vscode" | "open_url" | "none" }
    tts?: { enabled: boolean; voice?: string }  // Future
  }
  events: {
    thread_complete?: boolean
    batch_complete?: boolean
    error?: boolean
    synthesis_complete?: boolean
  }
}
```
- Add `loadNotificationsConfig()` function to load from `work/notifications.json`
- Add `getDefaultNotificationsConfig()` for sensible defaults
- Create default `notifications.json` during `work init`

Your tasks are:
- [ ] 05.01.01.01 Add `NotificationsConfig` interface to types.ts with providers (sound, notification_center, terminal_notifier, tts) and events (thread_complete, batch_complete, error, synthesis_complete) configuration
- [ ] 05.01.01.02 Add `ProviderConfig` interfaces for each provider type (SoundProviderConfig, NotificationCenterConfig, TerminalNotifierConfig, TTSProviderConfig)
- [ ] 05.01.01.03 Create `loadNotificationsConfig(repoRoot)` function in notifications/config.ts to load from `work/notifications.json`
- [ ] 05.01.01.04 Create `getDefaultNotificationsConfig()` function returning sensible defaults (sound + notification_center enabled)
- [ ] 05.01.01.05 Add `getNotificationsConfigPath(repoRoot)` helper function returning path to `work/notifications.json`

When listing tasks, use `work list --tasks --batch "05.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
