---
name: implementing-workstream-plans
description: How to execute an existing workstream plan. Focuses on finding tasks, updating status, and maintaining context.
---

# Implementing Workstream Plans

## Execution Context

**Rule:** Batches run serially; threads within a batch run in parallel.
*Complete all threads in the current batch before moving to the next.*

```bash
work status             # High-level progress & current stage
work list --tasks       # List all tasks with status
work read --task "ID"   # Read specific task details
```

## Task Workflow

1. **Find Task**: Pick from `work list`
2. **Start**: `work update --task "01.01.01.01" --status in_progress`
3. **Work**: Implement changes defined in `PLAN.md` (read via `work edit`)
4. **Test**: If `work/TESTS.md` exists, run tests and fix any failures
5. **Finish**: `work update --task "01.01.01.01" --status completed --report "Brief summary"`

**Status options:** `in_progress`, `completed`, `blocked`, `cancelled`

## Task Completion

When completing a task, **always include a brief report**:

```bash
work update --task "01.01.01.01" --status completed \
  --report "Brief summary of what was done"
```

Reports should be:
- 1-2 sentences
- Mention specific files/dependencies changed
- Note any important decisions or deviations

### Example

```bash
work update --task "01.01.01.01" --status completed \
  --report "Added hono@4.0.0 to package.json. Fixed peer dependency warning by also adding @hono/node-server."
```

## Reference Files

Check these files for context during execution (read-only):

| File | Purpose |
|------|---------|
| `work/{stream}/PLAN.md` | Thread details, implementation approach |
| `work/TESTS.md` | Test requirements (user-managed, if present) |