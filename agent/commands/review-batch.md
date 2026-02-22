---
description: Review latest batch outcomes and prepare stage approval guidance
agent: plan
subtask: false
---

Review the latest executed batch for the current workstream and summarize readiness for approval.

Required actions:
- Read current thread statuses/reports for the active stage.
- Summarize completed vs blocked threads.
- Identify any missing evidence (tests, docs, artifacts) before approval.

Subagent behavior:
- This command runs as a planner subagent.
- It does not launch worker subagents.

Output format:
- Concise stage readiness summary.
- Clear list of blockers or follow-ups.
- Exact user action next:
  - If ready: `!work approve stage N`
  - If not ready: recommend running `/execute-next-batch` after fixes.
