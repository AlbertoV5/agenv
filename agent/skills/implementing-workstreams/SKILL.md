---
name: implementing-workstreams
description: Execute assigned threads for an existing workstream and keep thread state accurate.
---

# Implementing Workstreams

## Start Here

```bash
work status
work tree --batch "01.01"
work list --threads --thread "01.01.01"
```

## Execution Rules

1. Work only on your assigned thread.
2. Mark thread start: `work update --thread "ID" --status in_progress`
3. Mark completion with report:
   `work update --thread "ID" --status completed --report "1-2 sentence summary"`
4. If blocked:
   `work update --thread "ID" --status blocked --report "reason and dependency"`
5. Use thread-level updates only (no task-level status calls).

## Report Quality

- Mention concrete files or modules changed.
- Include notable decisions or deviations.
- Keep it short and factual.

## Recovery

- If work is already done but status is stale, update status and add report.
- If context is unclear, review:
  - `work review plan`
  - `work read --thread "ID"`
- Do not self-reassign to another agent profile. Reassignment decisions are planner-owned.
