---
description: Review current stage outcomes and prepare stage approval guidance
agent: manager
subtask: false
---

Review stage `$ARGUMENTS` for the current workstream.

Required actions:
- Resolve target stream from current workstream pointer and print resolved stream ID/name.
- Do not use hardcoded/stale stream IDs from previous sessions.
- Read thread statuses and reports for the target stage.
- Summarize completed vs blocked threads.
- Identify missing evidence (tests/docs/artifacts) before approval.

Output format:
- Concise stage readiness summary.
- Clear blockers/follow-ups.
- Exact next user action:
  - If ready: `!work approve stage N`
  - If not ready: `/execute-stage N` (or `/execute-next-batch` if using batch flow)
