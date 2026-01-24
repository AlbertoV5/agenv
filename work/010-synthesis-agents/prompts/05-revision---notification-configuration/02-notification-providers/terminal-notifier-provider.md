Hello Agent!

You are working on the "Notification Providers" batch at the "Revision - Notification Configuration" stage of the "Synthesis Agents" workstream.

This is your thread:

"Terminal Notifier Provider" (2)

## Thread Summary
Add an optional provider for terminal-notifier with enhanced features.

## Thread Details
- Working packages: `./packages/workstreams`
- Create `TerminalNotifierProvider` class implementing `NotificationProvider`
- Feature detection: check if `terminal-notifier` is in PATH
- Support enhanced features:
- Custom app icon
- Click to activate VSCode (`-activate com.microsoft.VSCode`)
- Notification grouping (`-group workstreams`)
- Log helpful message if terminal-notifier not installed but enabled in config
- Command: `terminal-notifier -title "Title" -message "Message" -sound default -activate "com.microsoft.VSCode" -group "workstreams"`

Your tasks are:
- [ ] 05.02.02.01 Create `TerminalNotifierProvider` class implementing `NotificationProvider` interface in notifications/providers/
- [ ] 05.02.02.02 Implement `isAvailable()` with feature detection - check if `terminal-notifier` command exists in PATH using `which`
- [ ] 05.02.02.03 Implement `playNotification()` using terminal-notifier with flags: -title, -message, -sound, -activate "com.microsoft.VSCode", -group "workstreams"
- [ ] 05.02.02.04 Add config option for click action: activate_vscode, open_url, or none
- [ ] 05.02.02.05 Log helpful installation message if terminal-notifier not found but enabled in config

When listing tasks, use `work list --tasks --batch "05.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
