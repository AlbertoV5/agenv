---
name: planning-workstreams
description: Create and prepare workstreams for execution. Planning only, no code implementation.
---

# Planning Workstreams

## Scope

- Planning only.
- Do not implement code.
- Keep plans concrete, short, and executable.

## Workflow

1. Create stream: `work create --name "feature-name" --stages N`
2. Set current stream: `work current --set "NNN-feature-name"`
3. Fill `PLAN.md` with stages, batches, threads, and stage questions.
4. Validate before review:
   - `work validate plan`
   - `work check plan`
   - `work preview`
5. Ask user to approve plan: `!work approve plan` (auto-populates `threads.json` from PLAN.md)
6. Assign agents to threads: `work assign --thread "01.01.01" --agent "agent-name"`
7. Link planning session using `workstream_link_planning_session`.

## Planning Rules

- Prefer independent threads in the same batch.
- Use clear file paths and concrete outputs.
- Put unresolved decisions in Stage Questions (`- [ ] ...`).

## Native Orchestration Contract

- Native execution is session-first inside OpenCode (planner launches Task subagents).
- Planner should launch multiple Task calls in parallel when threads are independent.
- Planner failover policy on worker failure/blocking:
  - First retry should keep the same assigned agent when failure cause is transient.
  - If reassignment is needed, pick another agent from the same role family when available:
    - `system-engineer-*` for system threads
    - `frontend-designer-*` for frontend threads
    - `default*` as final fallback
  - Persist reassignment before retry: `work assign --thread "ID" --agent "new-agent"`.
  - Limit automatic failover to one reassignment attempt per thread execution cycle.
  - If still failing, mark blocked with a concrete dependency/error report.
- Worker subagents must update thread status in `threads.json` through CLI:
  - Start: `work update --thread "ID" --status in_progress`
  - Success: `work update --thread "ID" --status completed --report "1-2 sentence summary"`
  - Blocked: `work update --thread "ID" --status blocked --report "reason and dependency"`
- Planner final response should include deterministic per-thread outcomes (completed/blocked/failed + next actions).

## Useful Commands

```bash
work create --name "feature-name" --stages 3
work current --set "001-feature-name"
work edit
work preview
work validate plan
work check plan
!work approve plan
work agents
work assign --thread "01.01.01" --agent "backend-expert"
work prompt --stage 1 --batch 1
```
