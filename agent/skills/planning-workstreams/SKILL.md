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

1. Explore the codebase first via Task subagents (do not do full-file exploration yourself):
   - Launch `explore` or `general` subagents for architecture and file discovery.
   - Run subagents in parallel for independent areas.
   - Synthesize findings into concrete planning inputs.
2. Always create a NEW stream: `work create --name "feature-name" --stages N`
3. Set it current: `work current --set "NNN-feature-name"`
4. Fill `PLAN.md` with stages, batches, threads, and stage questions.
5. Validate before review:
   - `work validate plan`
   - `work check plan`
   - `work preview`
6. If Stage Questions remain open, ask the user those questions with the `question` tool and wait for answers before asking for approval.
   - Prefer one consolidated question prompt rather than many tiny prompts.
   - If the tool is unavailable, ask in plain text with numbered questions and recommended defaults.
7. Assign agents to every thread before approval:
   - Add explicit `@agent:<agent-name>` in each PLAN thread heading.
8. Once Stage Questions are resolved (or user explicitly accepts them as deferred), ask user to approve plan: `!work approve plan` (auto-populates `threads.json` from PLAN.md)

## Planning Rules

- Prefer independent threads in the same batch.
- Use clear file paths and concrete outputs.
- Put unresolved decisions in Stage Questions (`- [ ] ...`).
- Never silently leave many open Stage Questions without surfacing them to the user.
- When asking questions, provide a short numbered list and a recommended default for each when possible.
- Do not leave threads unassigned unless the user explicitly asks for default fallback.
- Manager should delegate broad discovery/research to subagents and keep itself focused on synthesis and planning decisions.

## Native Orchestration Contract

- Native execution is session-first inside OpenCode (planner launches Task subagents).
- Planner should launch multiple Task calls in parallel when threads are independent.
- Planner failover policy on worker failure/blocking:
  - First retry should keep the same assigned agent when failure cause is transient.
  - If reassignment is needed, pick another agent from the same role family when available:
    - `system-engineer-*` for system threads
    - `frontend-designer-*` for frontend threads
    - `default*` as final fallback
  - Persist reassignment by updating that thread heading in PLAN.md to `@agent:new-agent` before retry.
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
work prompt --stage 1 --batch 1
```
