---
description: Execute a specific stage as an isolated planner subtask
agent: manager
subtask: true
---

Execute stage `$ARGUMENTS` for the current workstream as an isolated planner run with complete stage context.

Start by running: `work preview --stage $ARGUMENTS`
Use that output as the stage source of truth for this execution.
Use the `Plan:` path shown in preview output whenever you need to read/edit PLAN.md.
If the stage shown is not the expected one, ask the user before continuing.

Before launching workers:
- Ensure all threads in this stage have `@agent:<agent-name>` in PLAN.md.
- If missing, add assignments in PLAN.md before execution.

Execution contract:
- Launch worker subagents via Task tool calls.
- Run worker subtasks in parallel where threads are independent.
- Use assigned agent profile per thread; fallback to `default` and report fallback usage.
- On worker failure/blocking, apply failover policy:
  - Retry once with the currently assigned agent if failure appears transient.
  - If reassignment is needed, choose another agent in the same role family (`system-engineer-*` or `frontend-designer-*`), then `default*` as final fallback.
  - Persist the reassignment before retry by updating PLAN.md thread heading to `@agent:new-agent`.
  - Allow at most one automatic reassignment attempt per thread in this execution cycle.
  - If retry also fails, mark blocked with explicit reason/dependency and stop retries.
- Each worker updates thread state:
  - `work update --thread "ID" --status in_progress`
  - `work update --thread "ID" --status completed --report "1-2 sentence summary"`
  - `work update --thread "ID" --status blocked --report "reason and dependency"`

Final output must include:
- stage execution status,
- completed and blocked thread counts,
- key thread outcomes (one short line per thread),
- exact next user command:
  - if stage is ready: `!work approve stage N`
  - if more work remains: `/execute-stage <stage-number>` or `/execute-next-batch`
