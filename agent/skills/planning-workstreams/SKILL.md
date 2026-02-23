---
name: planning-workstreams
description: Create and prepare workstreams for execution. Planning only, no code implementation.
---

# Planning Workstreams

## Scope

- Planning only.
- Do not implement code.
- Keep plan and tasks concrete, short, and executable.

## Workflow

1. Create stream: `work create --name "feature-name" --stages N`
2. Set current stream: `work current --set "NNN-feature-name"`
3. Fill `PLAN.md` with stages, batches, threads, and stage questions.
4. Validate before review:
   - `work validate plan`
   - `work check plan`
   - `work preview`
5. Ask user to approve plan: `!work approve plan`
6. Fill generated `TASKS.md` with specific tasks and agent assignments.
7. Ask user to approve tasks: `!work approve tasks`
8. Link planning session using `workstream_link_planning_session`.

## Planning Rules

- Prefer independent threads in the same batch.
- Keep tasks small and observable.
- Use clear file paths and concrete outputs.
- Put unresolved decisions in Stage Questions (`- [ ] ...`).

## Asking Questions

- If you have questions during planning, use the opencode `question` tool. Mark all questions as open first, then ask the user, and fill with the responses afterwards.
- The tool supports asking multiple questions in one call via the `questions` array; use this when collecting related inputs together.
- For each question, provide exactly one predefined option labeled as recommended.
- Keep `custom` enabled so the user can type their own answer (open response).

## Useful Commands

```bash
work create --name "feature-name" --stages 3
work current --set "001-feature-name"
work edit
work preview
work validate plan
work check plan
!work approve plan
!work approve tasks
work agents
work assign --thread "01.01.01" --agent "backend-expert"
work prompt --stage 1 --batch 1
```
