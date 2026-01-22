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
- **Approval Workflow** - Human-in-the-loop approval with open question detection

## Quick Start

1. **Create Workstream**
   ```bash
   work create --name "my-feature" --stages 1
   ```

2. **Plan**
   Edit `work/001-my-feature/PLAN.md` to define the work.
   ```bash
   work approve plan  # Auto-generates TASKS.md
   ```

3. **Define Tasks & Agents**
   Edit `work/001-my-feature/TASKS.md` to assign tasks.
   
   Syntax: `- [ ] Task description @agent:agent-name`
   
   work approve tasks  # Auto-generates tasks.json + prompts
   ```bash
   work approve tasks  # Auto-generates tasks.json + prompts
   ```

   work tree
   ```

5. **Start**
   ```bash
   work start
   ```

## Library Usage

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
  { stage: 1, batch: 1, thread: 1, name: "Setup environment" },
  { stage: 1, batch: 1, thread: 1, name: "Install dependencies" },
  { stage: 1, batch: 1, thread: 2, name: "Configure database" },
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
  taskId: "01.01.01.01",  // stage.batch.thread.task
  status: "completed",
})
```

## Workstream Structure

Workstreams are stored in `work/` with this structure:

```text
work/
  ├── index.json          # Registry of all workstreams
  └── 001-feature-name/   # Individual workstream directory
      ├── PLAN.md         # Stages, batches, threads, documentation
      ├── tasks.json      # Task tracking
```

**Task ID Format:** `{stage}.{batch}.{thread}.{task}` (e.g., `01.01.02.03` = Stage 01, Batch 01, Thread 02, Task 03)

## PLAN.md Structure

```markdown
# Plan: {Name}

## Summary
Brief overview.

## References
- Links to docs

## Stages

### Stage 01: {Stage Name}

#### Stage Definition
What this stage accomplishes.

#### Stage Constitution

**Inputs:**
- What this stage needs (dependencies, data, prior work)

**Structure:**
- Internal planning, architecture diagrams, component relationships

**Outputs:**
- What this stage produces (files, features, artifacts)

#### Stage Questions
- [ ] Open questions (block approval)
- [x] Resolved questions

#### Stage Batches

##### Batch 01: {Batch Name}
Batch purpose.

###### Thread 01: {Thread Name}
**Summary:** Thread purpose.
**Details:** Implementation approach.
```

## TASKS.md Structure

`TASKS.md` is an intermediate file generated from `PLAN.md` that allows you to define granular tasks and assign them to specific agents.

```markdown
# Tasks: {Name}

## Stage 01: {Stage Name}

### Batch 01: {Batch Name}

#### Thread 01: {Thread Name}
- [ ] Implement feature core logic @agent:implementing-workstreams
- [ ] Add unit tests @agent:implementing-workstreams
```

### Agent Assignment

Use the `@agent:name` syntax to assign a task to a specific agent skill.

- **Default:** If no agent is specified, the system default is used.
- **Syntax:** `@agent:skill-name`
- **Example:** `... @agent:planning-workstreams`

#### Agents Configuration

Agents are defined in `work/agents.yaml`. You can list available agents using:

```bash
work agents
```

Example `agents.yaml`:

```yaml
agents:
  - name: planning-workstreams
    description: Specializes in creating and validating workstream plans
    best_for: Planning, architecture, requirement analysis
    models:
      - anthropic/claude-3-5-sonnet
```

## Workstream Lifecycle Stages

Workstreams progress through these stages:

| Stage | Skill | Description |
|-------|-------|-------------|
| **Plan** | `/planning-workstreams` | Create stream, fill `PLAN.md` |
| **Review** | `/reviewing-workstreams` | Validate and approve `PLAN.md` |
| **Define** | `/planning-workstreams` | Fill `TASKS.md` with assignments, approve tasks |
| **Implement** | `/implementing-workstreams` | Execute tasks (`work start`), track progress |
| **Evaluate** | `/evaluating-workstreams` | Review completed work, gather metrics |

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
  stages: 3,  // Optional: number of stages (default: 1)
})

// With helper
const args = createGenerateArgs("my-feature", repoRoot, 3)
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
  { stage: 1, batch: 1, thread: 1, name: "First task" },
  { stage: 1, batch: 1, thread: 2, name: "Second task" },
])

// Get all tasks
const tasks = getTasks(repoRoot, streamId)

// Update task status
updateTaskStatus(repoRoot, streamId, "01.01.01.01", "completed")

// Delete single task
deleteTask(repoRoot, streamId, "01.01.01.01")

// Delete all tasks in a thread
deleteTasksByThread(repoRoot, streamId, 1, 1, 2)  // stage 1, batch 1, thread 2

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
const parts = parseTaskId("01.01.02.03")
// { stage: 1, batch: 1, thread: 2, task: 3 }

// Update task status
const result = updateTask({
  repoRoot,
  stream,  // StreamMetadata from getStream()
  taskId: "01.01.02.03",
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

## Session Tracking & Recovery

The library automatically tracks execution sessions for every task. This enables:

1.  **Resuming Interrupted Work**: If a session crashes or is killed, you can resume it using the same session ID.
2.  **Audit Trail**: Track which agent and model performed each task, along with start/end times.
3.  **Retry Workflows**: Easily retry failed threads with the same or different agents.

### Session Storage
Session data is stored in `tasks.json` alongside task definitions.

```json
"sessions": [
  {
    "sessionId": "sess_123...",
    "agentName": "implementing-workstreams",
    "model": "anthropic/claude-3-5-sonnet",
    "startedAt": "2024-01-20T10:00:00Z",
    "status": "completed"
  }
]
```

### Limitations
- **Resume Capability**: Resuming a session relies on the underlying agent runner (e.g., `opencode`) retaining the session state. If the runner's temporary state is cleared, resuming may fail.
- **Concurrent Sessions**: While multiple threads can run in parallel, resuming a specific session is an exclusive operation.

## CLI

The package includes a CLI for workstream management:

```bash
# Initialize workstreams in a repository
work init
```

```bash
# Create a workstream
work create --name my-feature
work create --name my-feature --stages 3

# Set current workstream
work current --set "001-my-feature"

# Preview, validate, and check PLAN.md
work preview --stream "001-my-feature"
work validate plan
work check plan
work review plan
work review tasks

# Review stage approval commits history
work review commits
# Output:
# [2024-01-20] Stage 1 approved by User (commit: abc1234)
# [2024-01-21] Stage 2 approved by User (commit: def5678)

# Open PLAN.md in editor
work edit

# Context & Continuation
work context             # Show current workstream context (task, breadcrumbs)
work continue            # Resume execution (alias for 'work multi --continue')

# Human-In-The-Loop Approvals
# 1. Plan approval - Validates PLAN.md structure and questions
work approve plan
work approve plan --force         # Approve with open questions

# 2. Tasks approval - Validates tasks.json existence
work approve tasks


# Check approval status
work approve

# Revoke approval
work approve plan --revoke --reason "Need to revise stage 2"

# Start Execution
# Requires all 3 approvals. Creates GitHub branch and issues.
work start
work start --stream "001-my-feature"

# Add structure
work add-batch --stage 1 --name "testing"
work add-thread --stage 1 --batch 1 --name "unit-tests"

# Add tasks (interactive or explicit)
work add-task                     # Interactive mode
work add-task --stage 1 --batch 1 --thread 1 --name "Task description"

# List tasks
work list --stream "001-my-feature" --tasks

# List available agents
work agents
work agents --json

# Read task details
work read --stream "001-my-feature" --task "01.01.01.01"

# Update task status
work update --stream "001-my-feature" --task "01.01.01.01" --status completed

# Update all tasks in a thread at once
work update --thread "01.01.01" --status completed

# Delete task/thread/batch/stage/workstream
work delete --stream "001-my-feature" --task "01.01.01.01"
work delete --stream "001-my-feature" --thread "01.01.02"
work delete --stream "001-my-feature" --batch "01.01"
work delete --stream "001-my-feature" --stage 2
work delete --stream "001-my-feature" --force  # delete entire workstream

# Check tree structure
work tree
work tree --batch "01.01"           # Filter to specific batch

# Check status
work status
work status --stream "001-my-feature"

# Set workstream status manually
work set-status on_hold --stream "001-my-feature"
work set-status --clear --stream "001-my-feature"

# Complete a workstream (with GitHub: commits, pushes, and creates PR)
work complete --stream "001-my-feature"
work complete --no-commit            # Skip git add/commit
work complete --no-pr                # Skip PR creation
work complete --target develop       # PR target branch (default: main)
work complete --draft                # Create draft PR

# Update metadata
work index --stream "001-my-feature" --field "status" --value "on_hold"

# Metrics and reports
work metrics --stream "001-my-feature"
work report --stream "001-my-feature"
work changelog --since-days 7
work export --format csv
```

### Manual Commands

These commands are usually handled automatically by the approval workflow but can be run manually:

```bash
# Generate TASKS.md from PLAN.md
work tasks generate

# Convert TASKS.md to tasks.json
work tasks serialize

# Generate agent prompts from tasks.json
work prompts
```

## GitHub Integration

The workstreams package includes optional GitHub integration to automatically create issues for threads, manage workstream branches, and sync task status with GitHub issues.

### Setup

GitHub integration is disabled by default. To enable it:

1. **Authenticate with GitHub** using one of these methods (in priority order):
   - Set `GITHUB_TOKEN` environment variable with a Personal Access Token (PAT)
   - Set `GH_TOKEN` environment variable with a PAT
   - Use GitHub CLI (`gh auth login`)

2. **Enable integration** for your repository:
   ```bash
   work github enable
   ```
   This auto-detects your repository from the git remote `origin` and creates a configuration file at `work/github.json`.

3. **Verify status**:
   ```bash
   work github status
   ```

**Required PAT Scopes:**
- `repo` (full control of private repositories)
- `public_repo` (for public repositories only)

### Commands

All GitHub commands are available under `work github <subcommand>`:

#### Enable/Disable

```bash
# Enable GitHub integration (auto-detects repo from git remote)
work github enable

# Disable GitHub integration
work github disable

# Check integration status
work github status
```

#### Branch Management

```bash
# Create a branch for the current workstream
work github create-branch

# Create a branch for a specific workstream
work github create-branch --stream "002-my-feature"

# Create a branch from a specific base (default: main)
work github create-branch --from develop
```

Branches are created with the format `workstream/{streamId}` (e.g., `workstream/002-my-feature`) and automatically checked out locally.

#### Issue Management

```bash
# Create issues for all pending threads (threads without issues)
work github create-issues

# Create issues for a specific batch
work github create-issues --batch "01.01"

# Create issues for all threads in a stage
work github create-issues --stage 1

# Create issues for a specific workstream
work github create-issues --stream "002-my-feature" --stage 1

# Output as JSON
work github create-issues --json
```

Each thread gets one GitHub issue that tracks all tasks within that thread. Issues are automatically labeled with workstream, stage, batch, and thread information.

#### Sync Issue States

```bash
# Sync issue states for current workstream
work github sync

# Sync for a specific workstream
work github sync --stream "002-my-feature"

# Output as JSON
work github sync --json
```

The sync command updates issue bodies with task completion status and reports, closes GitHub issues for completed threads, and updates the local task metadata.

### Automation

When GitHub integration is enabled, the following automations are triggered:

#### Auto-Create Issues After Approval

After running `work approve`, issues are automatically created for all threads in the workstream:

```bash
work approve  # Creates GitHub issues for all threads

work approve stage 3  # Creates GitHub issues only for threads in stage 3
```

This also works when approving individual stages (e.g., fix stages added later).

Issues are created with:
- Title based on thread name
- Body containing task list
- Labels for workstream, stage, batch, and thread

#### Auto-Close Issues on Completion

When all tasks in a thread are completed, the associated GitHub issue is automatically closed:

```bash
work update --task "01.01.01.05" --status completed
# If this was the last task in thread 01.01.01, the issue is auto-closed
```

When closing, the issue body is automatically updated to show:
- All tasks marked as checked (`- [x] Task name`)
- Task reports included as blockquotes (if present)
- Cancelled tasks marked with `*(cancelled)*`

The issue state is updated both on GitHub and in the local `tasks.json` file.

#### Auto-Reopen Issues on Status Change

If a task status changes from `completed` back to `in_progress` or `blocked`, the thread's GitHub issue is automatically reopened:

```bash
work update --task "01.01.01.05" --status in_progress
# If the thread's issue was closed, it will be reopened
```

This ensures GitHub issues accurately reflect the current state of work.

### Stage Approval Commits

When a stage is approved using `work approve stage <N>`, the system can automatically create a commit to mark this milestone. This feature helps track the progress of the workstream in the git history.

#### Auto-Commit on Approval

If enabled, approving a stage will trigger an automatic git commit with the following changes:
- `work/index.json`: Updates the stage status to approved
- `work/<stream-id>/PLAN.md`: Updates the stage questions and approval status

#### Commit Message Format

The automatic commits follow a structured format with Git Trailers for machine readability:

```text
feat: approve stage <N> for <stream-name>

Approved stage <N> of workstream <stream-name>.

Workstream-Id: <stream-id>
Stage-Id: <stage-number>
Action: approve-stage
```

#### Configuration

To enable auto-commit on approval, add `auto_commit_on_approval: true` to your `work/github.json` configuration:

```json
{
  "enabled": true,
  "auto_commit_on_approval": true
}
```

### Label Conventions

GitHub issues are automatically tagged with hierarchical labels:

| Label Type | Format | Example | Color |
|------------|--------|---------|-------|
| Workstream | `workstream:{id}` | `workstream:002-my-feature` | `#1d76db` (blue) |
| Stage | `stage:{number}` | `stage:01` | `#0e8a16` (green) |
| Batch | `batch:{id}` | `batch:01.01` | `#fbca04` (yellow) |
| Thread | `thread:{id}` | `thread:01.01.01` | `#d93f0b` (orange) |

Labels are automatically created when issues are created and can be used to filter issues in GitHub's issue tracker. For example:
- `workstream:002-my-feature` - All issues for a specific workstream
- `stage:01` - All issues in stage 1
- `batch:01.01` - All issues in a specific batch

### Configuration

The GitHub configuration is stored in `work/github.json`:

```json
{
  "enabled": true,
  "owner": "myorg",
  "repo": "myrepo",
  "branch_prefix": "workstream",
  "auto_create_issues": true,
  "auto_commit_on_approval": true,
  "label_config": {
    "workstream": { "prefix": "workstream", "color": "1d76db" },
    "stage": { "prefix": "stage", "color": "0e8a16" },
    "batch": { "prefix": "batch", "color": "fbca04" },
    "thread": { "prefix": "thread", "color": "d93f0b" }
  }
}
```

You can manually edit this file to customize label prefixes and colors.

### Workstream Completion

When you're ready to complete a workstream and create a pull request, use the `work complete` command:

```bash
work complete
```

This command performs the following steps:

1. **Validates** all stages are approved
2. **Verifies** you're on the workstream branch (if GitHub integration is enabled)
3. **Commits** all changes with message "Completed workstream: {stream-name}"
4. **Pushes** to the remote branch
5. **Creates a PR** to the target branch (default: `main`)
6. **Stores** completion metadata (PR number, completion timestamp) in index.json

#### Options

```bash
work complete                     # Full workflow: commit, push, create PR
work complete --no-commit         # Skip git add/commit (changes already committed)
work complete --no-pr             # Skip PR creation
work complete --target develop    # Create PR against 'develop' instead of 'main'
work complete --draft             # Create a draft PR
work complete --stream "002-..."  # Complete a specific workstream
```

#### Configuration

Set a default PR target branch in `work/github.json`:

```json
{
  "default_pr_target": "develop"
}
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
  ConstitutionDefinition,
  StageDefinition,
  BatchDefinition,
  ThreadDefinition,
} from "@agenv/workstreams"
```

## License

MIT
