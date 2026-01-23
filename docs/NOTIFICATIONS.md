# Notification System

The Workstreams CLI includes a notification system to alert you of long-running task completions and errors. This allows you to work in other windows while tasks execute in the background.

## Configuration

The notification system is configured via a JSON file located at:
`~/.config/agenv/notifications.json`

### Schema

```json
{
  "enabled": true,
  "sounds": {
    "thread_complete": "/path/to/sound.aiff",
    "batch_complete": "/path/to/sound.aiff",
    "error": "/path/to/sound.aiff"
  },
  "external_api": {
    "enabled": false,
    "webhook_url": "https://api.slack.com/webhook/...",
    "events": ["batch_complete", "error"]
  }
}
```

## Notification Events

| Event | Description | Default Trigger |
|-------|-------------|-----------------|
| `thread_complete` | A single thread (unit of work) finished | `work run`, `work multi` |
| `batch_complete` | All threads in a batch finished | `work multi` |
| `error` | An unrecoverable error occurred | Command failure |
| `on_all_complete` | Entire workstream completed | `work complete` |

## Sound Notifications (macOS)

On macOS, the system uses `afplay` to play sounds.

### Default Sounds
If no custom sounds are configured, the system uses:
- **Thread Complete**: `/System/Library/Sounds/Glass.aiff`
- **Batch Complete**: `/System/Library/Sounds/Hero.aiff`
- **Error**: `/System/Library/Sounds/Basso.aiff`

### Custom Sounds
You can map any of the events to a custom audio file path in the `sounds` object of your configuration.

## External API Webhooks

You can configure the system to send a JSON payload to a webhook URL (e.g., Slack, Discord, Zapier).

### Payload Format

```json
{
  "event": "batch_complete",
  "timestamp": "2024-03-21T10:00:00.000Z",
  "metadata": {
    "batch": "01.01",
    "stream": "009-ux-improvements"
  }
}
```

## CLI Flags

You can temporarily disable notifications for a single command execution:

```bash
work multi --batch "01.01" --silent
```

The `--silent` flag prevents audio playback but does not affect webhook payloads (unless configured otherwise).
