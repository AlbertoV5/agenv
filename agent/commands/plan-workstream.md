---
description: Create or refresh a workstream plan for review
agent: plan
subtask: true
---

Use @agent/skills/planning-workstreams/SKILL.md.

Create or update the current workstream planning artifacts so they are ready for user review and approval.

Required actions:
- Ensure a current stream is selected (or create one if missing).
- Fill or refine PLAN.md with clear stages, batches, and thread definitions.
- Run plan checks and validation (`work validate plan`, `work check plan`, `work preview`).
- If needed, assign agents to threads (`work assign --thread ... --agent ...`).

Subagent behavior:
- This command runs as a planner subagent.
- It does not launch worker subagents.

Output format:
- Briefly summarize what changed in PLAN.md.
- List unresolved stage questions.
- End with the exact approval command the user should run: `!work approve plan`.
