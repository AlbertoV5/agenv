---
description: Review current PLAN.md quality and readiness
agent: manager
subtask: false
---

Use @agent/skills/reviewing-workstreams/SKILL.md.

Review the current workstream plan.

Required actions:
- Launch a reviewer/planner subagent to run the plan review.
- Validate each batch for true parallel execution (no hidden coupling).
- Validate inter-thread dependencies are correct and minimal.
- Validate every thread lists concrete file paths it will edit.
- Validate thread ordering (parallel vs serial) is justified by file overlap/dependency constraints.
- Return concrete fixes for every issue found (exact thread/batch edits), not vague feedback.

Output format:
- Concise readiness verdict.
- Prioritized findings with exact fixes.
- Exact next user action:
  - Ready: `!work approve plan`
  - Not ready: `/edit-plan ...` with the listed fixes
