---
description: Execute the next incomplete batch with planner-led subagents
agent: plan
subtask: false
---

Use @agent/skills/implementing-workstreams/SKILL.md for worker behavior.

Execute the next incomplete batch for the current workstream using native session-first orchestration.

Execution contract:
- You are the planner in this active OpenCode session.
- Launch worker subagents via Task tool calls.
- Run workers in parallel when assigned threads are independent.
- Select each worker subagent profile from PLAN.md thread assignment (`@agent:`), or from `threads.json` assignment when present.
- If a thread has no assignment, use the `default` agent profile and note the fallback in the final summary.
- On worker failure/blocking, apply failover policy:
  - Retry once with the currently assigned agent if failure appears transient.
  - If reassignment is needed, choose another agent in the same role family (`system-engineer-*` or `frontend-designer-*`), then `default*` as final fallback.
  - Persist the reassignment before retry: `work assign --thread "ID" --agent "new-agent"`.
  - Allow at most one automatic reassignment attempt per thread in this execution cycle.
  - If retry also fails, mark blocked with explicit reason/dependency and stop retries.
- Each worker must operate on one thread and run thread updates:
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
    "agent_used": "system-engineer-codex",
    "failover_applied": false,
    "artifacts": ["path/or/pr"],
    "next_steps": []
  }
]
```

After execution, include:
- batch completion status,
- blocked threads (if any),
- exact user gate command if ready (for example `!work approve stage N`).

If no incomplete batch exists, do not return an empty response.
Return:
- `batch_completion_status: "no_incomplete_batch"`
- an empty deterministic outcomes array (`[]`)
- the exact next user command (`!work complete` if fully done, otherwise `!work status`)
