# @agenv/planning

Plan management library for AI agents. Create, track, and complete implementation plans within git repositories.

## Installation

```bash
bun add @agenv/planning
```

## Features

- **Plan Generation** - Create structured plans with checklists, principles, and references
- **Progress Tracking** - Parse markdown checklists and calculate completion status
- **Task Updates** - Update task status with atomic file writes
- **Concurrent Safety** - File locking prevents race conditions
- **Atomic Writes** - Crash-safe file operations using temp file + rename

## Quick Start

```typescript
import {
  getRepoRoot,
  generatePlan,
  getPlanProgress,
  updateTask,
  loadIndex,
  getPlan,
} from "@agenv/planning"

// Auto-detect git repo root
const repoRoot = getRepoRoot()

// Create a new plan
const result = generatePlan({
  name: "my-feature",
  size: "medium",  // short, medium, or long
  repoRoot,
  stages: 3,
  supertasks: 2,
  subtasks: 3,
})

console.log(`Created plan: ${result.planId}`)
// => Created plan: 001-my-feature

// Check progress
const progress = getPlanProgress(repoRoot, result.planId)
console.log(`${progress.percentComplete}% complete`)

// Update a task
const index = loadIndex(repoRoot)
const plan = getPlan(index, result.planId)
updateTask({
  repoRoot,
  plan,
  taskId: "1.1.2",  // stage.taskGroup.subtask
  status: "completed",
  note: "Implemented the feature",
})
```

## Plan Structure

Plans are stored in `docs/plans/` with this structure:

```
docs/plans/
├── index.json                    # Central index of all plans
└── 001-my-feature/
    ├── checklist/
    │   ├── INDEX.md              # Task checklist
    │   └── STAGE_N.md            # Stage files (long plans only)
    ├── principle/
    │   ├── INDEX.md              # Implementation approach
    │   └── STAGE_N.md            # Stage principles (long plans)
    └── reference/
        └── INDEX.md              # Documentation and notes
```

### Plan Sizes

| Size | Stages | Task Groups | Subtasks | Total Tasks |
|------|--------|-------------|----------|-------------|
| short | 1 | 1 | 3 | 3 |
| medium | 3 | 2 | 3 | 18 |
| long | 4 | 3 | 4 | 48 |

### Task Status

| Status | Checkbox | Description |
|--------|----------|-------------|
| `pending` | `[ ]` | Not started |
| `in_progress` | `[~]` | Currently working |
| `completed` | `[x]` | Done |
| `blocked` | `[!]` | Waiting on something |
| `cancelled` | `[-]` | Abandoned |

## API Reference

### Plan Generation

```typescript
import { generatePlan, createGenerateArgs } from "@agenv/planning"

// Full control
const result = generatePlan({
  name: "my-feature",
  size: "medium",
  repoRoot: "/path/to/repo",
  stages: 3,
  supertasks: 2,
  subtasks: 3,
  cliVersion: "1.0.0",  // optional
})

// With defaults based on size
const args = createGenerateArgs("my-feature", "medium", repoRoot)
const result = generatePlan(args)
```

### Index Operations

```typescript
import {
  loadIndex,
  saveIndex,
  saveIndexSafe,
  modifyIndex,
  findPlan,
  getPlan,
  deletePlan,
} from "@agenv/planning"

// Read index (throws if missing)
const index = loadIndex(repoRoot)

// Find plan (returns undefined if not found)
const plan = findPlan(index, "001-my-feature")

// Get plan (throws if not found)
const plan = getPlan(index, "my-feature")  // by name or ID

// Save index (sync, atomic write)
saveIndex(repoRoot, index)

// Save with file locking (async, concurrent-safe)
await saveIndexSafe(repoRoot, index)

// Atomic read-modify-write with locking
const result = await modifyIndex(repoRoot, (index) => {
  // Modify index here
  index.plans[0].name = "renamed"
  return "done"
})

// Delete a plan
await deletePlan(repoRoot, "001-my-feature", { deleteFiles: true })
```

### Progress Tracking

```typescript
import { getPlanProgress, formatProgress } from "@agenv/planning"

const progress = getPlanProgress(repoRoot, "001-my-feature")

console.log(progress)
// {
//   planId: "001-my-feature",
//   planName: "my-feature",
//   totalTasks: 18,
//   completedTasks: 5,
//   inProgressTasks: 1,
//   blockedTasks: 0,
//   pendingTasks: 12,
//   percentComplete: 27.78,
//   stages: [...]
// }

// Formatted output
console.log(formatProgress(progress))
```

### Task Updates

```typescript
import { updateTask, parseTaskId } from "@agenv/planning"

// Parse task ID
const parts = parseTaskId("2.1.3")
// { stage: 2, taskGroup: 1, subtask: 3 }

// Update task status
const result = updateTask({
  repoRoot,
  plan,  // PlanMetadata from getPlan()
  taskId: "2.1.3",
  status: "completed",
  note: "Implementation notes here",
})
```

### Plan Completion

```typescript
import { completePlan, updateIndexField } from "@agenv/planning"

// Mark plan as complete
completePlan({
  repoRoot,
  planId: "001-my-feature",
  referencePath: "docs/references/my-feature.md",
})

// Update arbitrary metadata field
updateIndexField({
  repoRoot,
  planId: "001-my-feature",
  field: "synthesis.synthesized",
  value: "true",
})
```

### Utilities

```typescript
import {
  getRepoRoot,
  findRepoRoot,
  validatePlanName,
  atomicWriteFile,
} from "@agenv/planning"

// Get repo root (throws if not in a git repo)
const repoRoot = getRepoRoot()

// Find repo root (returns undefined if not found)
const repoRoot = findRepoRoot()

// Validate plan name (must be kebab-case)
validatePlanName("my-feature")  // ok
validatePlanName("My Feature")  // throws

// Atomic file write (crash-safe)
atomicWriteFile("/path/to/file.md", content)
```

## Concurrent Access

The library provides two levels of safety:

1. **Atomic writes** (sync) - All file writes use temp file + rename, preventing corruption from crashes

2. **File locking** (async) - Use `saveIndexSafe()`, `modifyIndex()`, or `deletePlan()` for concurrent access

```typescript
// Single-process usage (sync, atomic writes)
const index = loadIndex(repoRoot)
index.plans.push(newPlan)
saveIndex(repoRoot, index)

// Multi-process usage (async, with locking)
await modifyIndex(repoRoot, (index) => {
  index.plans.push(newPlan)
})
```

## CLI

The package includes a CLI for plan management:

```bash
# Create a plan
plan create --name my-feature --size medium

# Check status
plan status
plan status --plan "001-my-feature"

# Update a task
plan update --plan "001-my-feature" --task "1.2" --status completed

# Complete a plan
plan complete --plan "001-my-feature"

# Update metadata
plan index --plan "001-my-feature" --field "synthesis.synthesized" --value "true"
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  PlansIndex,
  PlanMetadata,
  PlanSize,
  TaskStatus,
  GeneratePlanArgs,
  GeneratePlanResult,
  DeletePlanOptions,
  DeletePlanResult,
} from "@agenv/planning"
```

## License

MIT
