---
description: Execute a specific stage as an isolated planner subtask
agent: plan
subtask: true
---

Execute stage `$ARGUMENTS` for the current workstream as an isolated planner run with complete stage context.

Required context-loading steps before launching workers:
- Resolve current workstream and validate stage exists.
- Read stage-level plan details, stage questions, and thread assignments (`@agent:` in PLAN.md and assigned agents in `threads.json`).
- Enumerate all batches/threads in this stage and current status.

Execution contract:
- Launch worker subagents via Task tool calls.
- Run worker subtasks in parallel where threads are independent.
- Use assigned agent profile per thread; fallback to `default` and report fallback usage.
- On worker failure/blocking, apply failover policy:
  - Retry once with the currently assigned agent if failure appears transient.
  - If reassignment is needed, choose another agent in the same role family (`system-engineer-*` or `frontend-designer-*`), then `default*` as final fallback.
  - Persist the reassignment before retry: `work assign --thread "ID" --agent "new-agent"`.
  - Allow at most one automatic reassignment attempt per thread in this execution cycle.
  - If retry also fails, mark blocked with explicit reason/dependency and stop retries.
- Each worker updates thread state:
  - `work update --thread "ID" --status in_progress`
  - `work update --thread "ID" --status completed --report "1-2 sentence summary"`
  - `work update --thread "ID" --status blocked --report "reason and dependency"`

Return deterministic per-thread outcomes:
```json
[
  {
    "thread_id": "SS.BB.TT",
    "status": "completed",
    "report": "short outcome",
    "agent_used": "frontend-designer-grok-fast",
    "failover_applied": false,
    "artifacts": ["path/or/pr"],
    "next_steps": []
  }
]
```

Final output must include:
- stage execution status,
- completed and blocked thread counts,
- unresolved stage questions,
- exact next user command:
  - if stage is ready: `!work approve stage N`
  - if more work remains: `/execute-stage <stage-number>` or `/execute-next-batch`
