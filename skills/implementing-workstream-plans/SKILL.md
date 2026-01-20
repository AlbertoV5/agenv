---
name: implementing-workstream-plans
description: How to execute an existing workstream plan. Focuses on finding tasks, updating status, and maintaining context.
---

# Implementing Workstream Plans

## Start Session

```bash
work current --set "000-stream-id"
work continue           # Finds active task or next pending task
```

## Execution Context

**Rule:** Batches run serially; threads within a batch run in parallel.
*Complete all threads in the current batch before moving to the next.*

```bash
work status             # High-level progress & current stage
work list --tasks       # List all tasks with status
work read --task "ID"   # Read specific task details
```

## Task Workflow

1. **Find Task**: Use `work continue` or pick from `work list`
2. **Start**: `work update --task "01.01.01.01" --status in_progress`
3. **Work**: Implement changes defined in `PLAN.md` (read via `work edit`)
4. **Finish**: `work update --task "01.01.01.01" --status completed`

**Status options:** `in_progress`, `completed`, `blocked`, `cancelled`

## Adjustments (Mid-Stream)

> **Note:** Commands accept names or indices.

```bash
# Add forgotten task
work add-task --stage "setup" --batch "core" --thread "config" --name "Extra task"

# Add emergency batch (e.g. for unexpected work)
work add-batch --stage "setup" --name "hotfix"

# Add fix stage (appended to end)
work fix --stage "setup" --name "fix-auth"
```

## Completion

```bash
work complete    # Generates completion report when all tasks done
```
