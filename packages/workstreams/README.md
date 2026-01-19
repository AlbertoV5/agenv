# @agenv/workstreams

Workstream management library for AI agents. Create, track, and complete implementation workstreams within git repositories.

## Installation

```bash
bun add @agenv/workstreams
```

## Features

- **Workstream Generation** - Create structured workstreams with PLAN.md and JSON task tracking
- **Progress Tracking** - Track task status via tasks.json
- **Task Management** - Add, update, delete tasks with atomic file writes
- **Concurrent Safety** - File locking prevents race conditions
- **Atomic Writes** - Crash-safe file operations using temp file + rename

## Quick Start

```typescript
import {
  getRepoRoot,
  generateStream,
  getStreamProgress,
  updateTask,
  addTasks,
  loadIndex,
  getStream,
} from "@agenv/workstreams"

// Auto-detect git repo root
const repoRoot = getRepoRoot()

// Create a new workstream
const result = generateStream({
  name: "my-feature",
  repoRoot,
})

console.log(`Created workstream: ${result.streamId}`)
// => Created workstream: 001-my-feature

// Add tasks
addTasks(repoRoot, result.streamId, [
  { stage: 1, thread: 1, name: "Setup environment" },
  { stage: 1, thread: 1, name: "Install dependencies" },
  { stage: 1, thread: 2, name: "Configure database" },
])

// Check progress
const progress = getStreamProgress(repoRoot, result.streamId)
console.log(`${progress.percentComplete}% complete`)

// Update a task
const index = loadIndex(repoRoot)
const stream = getStream(index, result.streamId)
updateTask({
  repoRoot,
  stream,
  taskId: "1.1.1",  // stage.thread.task
  status: "completed",
})
```

## Workstream Structure

Workstreams are stored in `docs/work/` with this structure:

```
docs/work/
├── index.json                    # Central index of all workstreams
└── 001-my-feature/
    ├── PLAN.md                   # Structured plan document
    ├── tasks.json                # Task tracking (status, timestamps)
    └── files/                    # Flexible space for outputs
        └── README.md             # Description of files directory
```

**Task ID Format:** `{stage}.{thread}.{task}` (e.g., `1.2.3` = Stage 1, Thread 2, Task 3)

## Workstream Lifecycle Stages

Workstreams progress through these stages:

| Stage | Skill | Description |
|-------|-------|-------------|
| **Create** | `/create-workstream-plans` | Generate workstream structure, define stages/threads/tasks |
| **Review** | `/reviewing-workstream-plans` | Read workstreams, add/remove tasks, reorganize structure |
| **Implement** | `/implementing-workstream-plans` | Execute tasks, track progress, update statuses |
| **Evaluate** | `/evaluating-workstream-outputs` | Review completed work, gather metrics |
| **Document** | `/documenting-workstream-outputs` | Generate reports, changelogs, exports |

### Task Status

| Status | Description |
|--------|-------------|
| `pending` | Not started |
| `in_progress` | Currently working |
| `completed` | Done |
| `blocked` | Waiting on something |
| `cancelled` | Abandoned |

### Workstream Status

Workstream status is computed automatically from tasks:

| Status | Description | Set by |
|--------|-------------|--------|
| `pending` | No tasks started | Computed |
| `in_progress` | Has tasks in progress | Computed |
| `completed` | All tasks completed | Computed |
| `on_hold` | Paused, won't work on | Manual |

```typescript
import { getStreamStatus, computeStreamStatus, setStreamStatus } from "@agenv/workstreams"

// Get current status (computed from tasks)
const status = getStreamStatus(repoRoot, stream)

// Manually set status (e.g., on_hold)
setStreamStatus(repoRoot, streamId, "on_hold")

// Clear manual status (revert to computed)
setStreamStatus(repoRoot, streamId, undefined)
```

## API Reference

### Workstream Generation

```typescript
import { generateStream, createGenerateArgs } from "@agenv/workstreams"

// Full control
const result = generateStream({
  name: "my-feature",
  repoRoot: "/path/to/repo",
})

// With helper
const args = createGenerateArgs("my-feature", repoRoot)
const result = generateStream(args)
```

### Task Operations

```typescript
import {
  addTasks,
  getTasks,
  updateTaskStatus,
  deleteTask,
  deleteTasksByStage,
  deleteTasksByThread,
  getTaskCounts,
} from "@agenv/workstreams"

// Add tasks
addTasks(repoRoot, streamId, [
  { stage: 1, thread: 1, name: "First task" },
  { stage: 1, thread: 2, name: "Second task" },
])

// Get all tasks
const tasks = getTasks(repoRoot, streamId)

// Update task status
updateTaskStatus(repoRoot, streamId, "1.1.1", "completed")

// Delete single task
deleteTask(repoRoot, streamId, "1.1.1")

// Delete all tasks in a thread
deleteTasksByThread(repoRoot, streamId, 1, 2)  // stage 1, thread 2

// Delete all tasks in a stage
deleteTasksByStage(repoRoot, streamId, 2)  // stage 2

// Get task counts
const counts = getTaskCounts(repoRoot, streamId)
// { total: 5, completed: 2, in_progress: 1, pending: 2, blocked: 0, cancelled: 0 }
```

### Index Operations

```typescript
import {
  loadIndex,
  saveIndex,
  saveIndexSafe,
  modifyIndex,
  findStream,
  getStream,
  deleteStream,
} from "@agenv/workstreams"

// Read index (throws if missing)
const index = loadIndex(repoRoot)

// Find workstream (returns undefined if not found)
const stream = findStream(index, "001-my-feature")

// Get workstream (throws if not found)
const stream = getStream(index, "my-feature")  // by name or ID

// Save index (sync, atomic write)
saveIndex(repoRoot, index)

// Save with file locking (async, concurrent-safe)
await saveIndexSafe(repoRoot, index)

// Atomic read-modify-write with locking
const result = await modifyIndex(repoRoot, (index) => {
  index.streams[0].name = "renamed"
  return "done"
})

// Delete a workstream
await deleteStream(repoRoot, "001-my-feature", { deleteFiles: true })
```

### Progress Tracking

```typescript
import { getStreamProgress, formatProgress } from "@agenv/workstreams"

const progress = getStreamProgress(repoRoot, "001-my-feature")

console.log(progress)
// {
//   streamId: "001-my-feature",
//   streamName: "my-feature",
//   totalTasks: 6,
//   completedTasks: 2,
//   inProgressTasks: 1,
//   blockedTasks: 0,
//   pendingTasks: 3,
//   percentComplete: 33.33,
//   stages: [...]
// }

// Formatted output
console.log(formatProgress(progress))
```

### Task Updates

```typescript
import { updateTask, parseTaskId } from "@agenv/workstreams"

// Parse task ID
const parts = parseTaskId("1.2.3")
// { stage: 1, thread: 2, task: 3 }

// Update task status
const result = updateTask({
  repoRoot,
  stream,  // StreamMetadata from getStream()
  taskId: "1.2.3",
  status: "completed",
})
```

### Workstream Completion

```typescript
import { completeStream, updateIndexField } from "@agenv/workstreams"

// Mark workstream as complete (sets status to "completed")
completeStream({
  repoRoot,
  streamId: "001-my-feature",
})

// Update arbitrary metadata field
updateIndexField({
  repoRoot,
  streamId: "001-my-feature",
  field: "status",
  value: "on_hold",
})
```

### Utilities

```typescript
import {
  getRepoRoot,
  findRepoRoot,
  validateStreamName,
  atomicWriteFile,
} from "@agenv/workstreams"

// Get repo root (throws if not in a git repo)
const repoRoot = getRepoRoot()

// Find repo root (returns undefined if not found)
const repoRoot = findRepoRoot()

// Validate workstream name (must be kebab-case)
validateStreamName("my-feature")  // ok
validateStreamName("My Feature")  // throws

// Atomic file write (crash-safe)
atomicWriteFile("/path/to/file.md", content)
```

## Concurrent Access

The library provides two levels of safety:

1. **Atomic writes** (sync) - All file writes use temp file + rename, preventing corruption from crashes

2. **File locking** (async) - Use `saveIndexSafe()`, `modifyIndex()`, or `deleteStream()` for concurrent access

```typescript
// Single-process usage (sync, atomic writes)
const index = loadIndex(repoRoot)
index.streams.push(newStream)
saveIndex(repoRoot, index)

// Multi-process usage (async, with locking)
await modifyIndex(repoRoot, (index) => {
  index.streams.push(newStream)
})
```

## CLI

The package includes a CLI for workstream management:

```bash
# Create a workstream
work create --name my-feature

# Preview PLAN.md structure
work preview --stream "001-my-feature"

# Validate PLAN.md
work consolidate --stream "001-my-feature"

# Add tasks
work add-task --stream "001-my-feature" --stage 1 --thread 1 --name "Task description"

# List tasks
work list --stream "001-my-feature" --tasks

# Read task details
work read --stream "001-my-feature" --task "1.1.1"

# Update task status
work update --stream "001-my-feature" --task "1.1.1" --status completed

# Delete task/thread/stage/workstream
work delete --stream "001-my-feature" --task "1.1.1"
work delete --stream "001-my-feature" --thread "1.2"
work delete --stream "001-my-feature" --stage 2
work delete --stream "001-my-feature" --force  # delete entire workstream

# Check status
work status
work status --stream "001-my-feature"

# Set workstream status manually
work set-status on_hold --stream "001-my-feature"
work set-status --clear --stream "001-my-feature"

# Complete a workstream
work complete --stream "001-my-feature"

# Update metadata
work index --stream "001-my-feature" --field "status" --value "on_hold"

# Metrics and reports
work metrics --stream "001-my-feature"
work report --stream "001-my-feature"
work changelog --since-days 7
work export --format csv
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  WorkIndex,
  StreamMetadata,
  TaskStatus,
  StreamStatus,
  Task,
  TasksFile,
  GenerateStreamArgs,
  GenerateStreamResult,
  DeleteStreamOptions,
  DeleteStreamResult,
} from "@agenv/workstreams"
```

## License

MIT
