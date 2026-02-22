---
description: Apply requested edits to PLAN.md and re-validate
agent: manager
subtask: false
---

Use @agent/skills/planning-workstreams/SKILL.md.

Apply this planning change request: $ARGUMENTS

Required actions:
- Launch subagents to explore affected code areas for this change request.
- Use manager for synthesis and plan edits, not broad file-by-file exploration.
- Update PLAN.md according to the request.
- Keep thread definitions executable and concrete.
- Re-run plan checks and validation (`work validate plan`, `work check plan`, `work preview`).

Execution behavior:
- This command runs in the active manager context (not as a subtask).
- It does not launch worker subagents.

Output format:
- List exactly what was changed.
- Call out any tradeoffs or open questions.
- End with the next user action (usually `!work approve plan` when ready).
