---
description: Apply requested edits to PLAN.md and re-validate
agent: plan
subtask: true
---

Use @agent/skills/planning-workstreams/SKILL.md.

Apply this planning change request: $ARGUMENTS

Required actions:
- Update PLAN.md according to the request.
- Keep thread definitions executable and concrete.
- Re-run plan checks and validation (`work validate plan`, `work check plan`, `work preview`).

Subagent behavior:
- This command runs as a planner subagent.
- It does not launch worker subagents.

Output format:
- List exactly what was changed.
- Call out any tradeoffs or open questions.
- End with the next user action (usually `!work approve plan` when ready).
