---
name: implementing-workstream-plans
description: How to follow and update a workstream plan during implementation. This is the counterpart to create-workstream-plans - use it when working through an existing workstream.
---

# Implementing Workstream Plans

## Start a Session

```bash
work current --set "000-stream-id"
work status
work list --tasks
```

Read `PLAN.md` for context, find the next pending task.

## Execution Order

**Batches run serially, threads run in parallel within a batch.**

1. Complete all threads in Batch 01 before starting Batch 02
2. Within a batch, threads can run in parallel (by different agents)
3. Use `/generating-workstream-prompts` to get thread execution context

```
Stage 01
├── Batch 01 (complete first)
│   ├── Thread 01 ──┐
│   └── Thread 02 ──┴── parallel
└── Batch 02 (then this)
    └── Thread 01
```

## Task Workflow

```bash
# 1. Start task
work update --task "01.01.02.01" --status in_progress

# 2. Implement (follow PLAN.md guidance)

# 3. Complete
work update --task "01.01.02.01" --status completed
```

## Task Statuses

| Status | When to Use |
|--------|-------------|
| `pending` | Not started |
| `in_progress` | Working on it |
| `completed` | Done |
| `blocked` | Cannot proceed |
| `cancelled` | Dropped |

```bash
work update --task "01.01.02.01" --status blocked --note "Waiting on API spec"
```

## Workstream Statuses

Computed from tasks (except `on_hold` which is manual):

| Status | Meaning |
|--------|---------|
| `pending` | No tasks started |
| `in_progress` | Has active tasks |
| `completed` | All done |
| `on_hold` | Paused (manual) |

```bash
work set-status on_hold     # Pause
work set-status --clear     # Resume
```

## Reading Context

```bash
work read --task "01.01.02.01"        # Task details
work edit                              # Open PLAN.md in editor
cat work/000-stream-id/PLAN.md        # Full workstream
```

## Add Tasks Mid-Work

```bash
# Interactive mode
work add-task
# > Select stage: 1
# > Select batch: 1
# > Select thread: 2
# > Task name: New task

# Explicit mode
work add-task --stage 1 --batch 1 --thread 2 --name "New task"

# Add new batch
work add-batch --stage 1 --name "hotfix"

# Add new thread
work add-thread --stage 1 --batch 2 --name "validation"
```

## Fix Workflow

When issues are discovered:

```bash
# Fix within a stage - add fix batch
work fix --batch --stage 1 --name "fix-validation"

# Fix after stage completion - add fix stage
work fix --stage 1 --name "fix-auth-race"
```

## Check Progress

```bash
work status
```

## Complete the Workstream

```bash
work complete
```

This auto-generates `COMPLETION.md` with:
- Accomplishments (from completed tasks)
- File references (from `files/` directory)
- Metrics (tasks completed, stages, batches)

## CLI Summary

```bash
# Status
work status
work list --tasks
work read --task "01.01.02.03"
work edit                               # Open PLAN.md in editor

# Updates
work update --task "01.01.02.03" --status completed
work update --task "01.01.02.03" --status blocked --note "reason"
work set-status on_hold

# Add work
work add-task                           # Interactive mode
work add-task --stage N --batch M --thread T --name "desc"
work add-batch --stage N --name "batch-name"
work add-thread --stage N --batch M --name "thread-name"

# Fixes
work fix --batch --stage N --name "fix-name"
work fix --stage N --name "fix-name"

# Finish
work complete
```
