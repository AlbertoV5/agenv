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

## Task Workflow

```bash
# 1. Start task
work update --task "1.2.1" --status in_progress

# 2. Implement (follow PLAN.md guidance)

# 3. Complete
work update --task "1.2.1" --status completed
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
work update --task "1.2.1" --status blocked --note "Waiting on API spec"
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
work read --task "1.2.1"              # Task details
cat work/000-stream-id/PLAN.md   # Full workstream
```

## Add Tasks Mid-Work

```bash
work add-task --stage 1 --thread 2 --name "New task"
```

## Check Progress

```bash
work status
```

## Complete the Workstream

```bash
work complete
```

## CLI Summary

```bash
# Status
work status
work list --tasks
work read --task "1.2.3"

# Updates
work update --task "1.2.3" --status completed
work update --task "1.2.3" --status blocked --note "reason"
work set-status on_hold

# Add work
work add-task --stage N --thread M --name "desc"

# Finish
work complete
```
