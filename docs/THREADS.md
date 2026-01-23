# Threads Metadata Schema

The `threads.json` file stores thread-level metadata for a workstream, separating execution state and external integrations from the core task definitions in `tasks.json`.

## Purpose

Previous versions of the Workstreams CLI stored session history and GitHub issue links directly on tasks in `tasks.json`. This caused duplication (as multiple tasks belong to one thread) and cluttered the task definition.

The new `threads.json` file centralizes this data at the **Thread** level (Stage.Batch.Thread).

## Location

Each workstream has its own `threads.json` file:
`work/{stream-id}/threads.json`

## Schema

```json
{
  "version": "1.0.0",
  "stream_id": "009-ux-improvements",
  "last_updated": "2024-03-21T10:00:00.000Z",
  "threads": [
    {
      "threadId": "01.01.01",
      "currentSessionId": "sess_123456",
      "sessions": [
        {
          "sessionId": "sess_123456",
          "agentName": "fullstack-dev",
          "model": "anthropic/claude-3-sonnet",
          "startedAt": "2024-03-21T09:00:00.000Z",
          "status": "running"
        }
      ],
      "githubIssue": {
        "number": 42,
        "url": "https://github.com/org/repo/issues/42",
        "state": "open"
      }
    }
  ]
}
```

### Fields

- `threadId`: Unique identifier for the thread (format: `SS.BB.TT`)
- `sessions`: History of agent sessions executed for this thread
- `currentSessionId`: ID of the currently active or last active session
- `githubIssue`: Linked GitHub issue metadata

## Migration Guide

The CLI automatically handles migration from the old `tasks.json` format to `threads.json`.

### Migration Process

1. The system reads `tasks.json`.
2. It extracts session history and GitHub issue links from all tasks.
3. It groups this data by Thread ID.
4. It creates or updates entries in `threads.json`.
5. It validates that all data was successfully transferred.

### Manual Migration

If you need to trigger migration manually (e.g., after manually editing `tasks.json`), you can run:

```bash
# Force a status check which triggers migration checks
work status
```

Or use the internal library function if developing tools:

```typescript
import { migrateFromTasksJson, loadTasks } from "@agenv/workstreams";

const tasks = loadTasks(root, streamId);
const result = migrateFromTasksJson(root, streamId, tasks);
console.log(`Migrated ${result.threadsCreated} threads.`);
```
