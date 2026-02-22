---
description: Run final workstream evaluation and produce completion assessment
agent: plan
subtask: true
---

Use @agent/skills/evaluating-workstreams/SKILL.md.

Evaluate the current workstream end-to-end.

Required actions:
- Assess thread outcomes, reports, and stage approvals.
- Identify risks, regressions, and unfinished work.
- Produce a concise final evaluation summary and recommended next actions.

Subagent behavior:
- This command runs as a planner subagent.
- If deeper review is needed, it may launch evaluator/reviewer subagents.

Output format:
- Overall verdict (ready to complete or not).
- Key evidence and any critical gaps.
- Exact user next command:
  - Ready: `!work complete`
  - Not ready: specify whether to run `/execute-next-batch` or `/edit-plan ...`.
