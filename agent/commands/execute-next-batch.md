---
description: Execute the next incomplete batch with planner-led subagents
agent: manager
subtask: false
---

Use @agent/skills/implementing-workstreams/SKILL.md for worker behavior.

Execute the next incomplete batch for the current workstream using native session-first orchestration.

Execution contract:
- You are the planner in this active OpenCode session.
- Start by running `work preview` to confirm the current workstream context.
- Use the `Plan:` path shown in preview output whenever you need to read/edit PLAN.md.
- Launch worker subagents via Task tool calls.
- Run workers in parallel when assigned threads are independent.
- Select each worker subagent profile from PLAN.md thread assignment (`@agent:`), or from `threads.json` assignment when present.
- If a thread has no assignment, use the `default` agent profile and note the fallback in the final summary.
- On worker failure/blocking, apply failover policy:
  - Retry once with the currently assigned agent if failure appears transient.
  - If reassignment is needed, choose another agent in the same role family (`system-engineer-*` or `frontend-designer-*`), then `default*` as final fallback.
  - Persist the reassignment before retry by updating PLAN.md thread heading to `@agent:new-agent`.
  - Allow at most one automatic reassignment attempt per thread in this execution cycle.
  - If retry also fails, mark blocked with explicit reason/dependency and stop retries.
- Each worker must operate on one thread and run thread updates:
  - `work update --thread "ID" --status in_progress`
  - `work update --thread "ID" --status completed --report "1-2 sentence summary"`
  - `work update --thread "ID" --status blocked --report "reason and dependency"`

After execution, include:
- batch completion status,
- blocked threads (if any),
- key thread outcomes (one short line per thread),
- exact user gate command if ready (for example `!work approve stage N`).

If no incomplete batch exists, do not return an empty response.
Report that no incomplete batch exists and provide the exact next user command (`!work complete` if fully done, otherwise `!work status`).
