---
description: Create or refresh a workstream plan for review
agent: manager
subtask: false
---

Use @agent/skills/planning-workstreams/SKILL.md.

Planning request: $ARGUMENTS

Always create a NEW workstream for this request.
Before drafting the plan, launch subagents to explore the codebase and collect implementation context.
Use manager for synthesis/decisions; do not perform broad repository exploration only in the manager context.
Produce PLAN.md and run plan validation.
If Stage Questions are open, use the `question` tool to ask them before requesting approval (single consolidated prompt preferred).
If the `question` tool is unavailable, ask in plain text with a numbered list and recommended defaults.
Before finishing, assign an agent to every planned thread by adding `@agent:<agent-name>` to each PLAN.md thread heading.
Only finish with `!work approve plan` once questions are resolved or explicitly deferred by the user.
