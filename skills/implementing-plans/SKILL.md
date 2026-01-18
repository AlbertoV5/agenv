---
name: implementing-plans
description: How to follow and update a plan during implementation. This is the counterpart to creating-plans - use it when working through an existing plan.
---

# Implementing Plans

> **Prerequisite**: Requires [bun](https://bun.sh) installed.

## Overview

Plans live in `./docs/plans/{id}/` with three directories:

| Directory | Purpose | Your Role |
|-----------|---------|-----------|
| `principle/` | Analysis, design, pseudo-code | READ for context |
| `checklist/` | Task tracking (accumulative log) | UPDATE as you work |
| `reference/` | Curated exposition (transformative) | TRANSFORM during/after |

## Starting a Session

```bash
bun ~/.agenv/bin/ag plan status --plan "plan-id"
cat docs/plans/{plan-id}/principle/INDEX.md
cat docs/plans/{plan-id}/checklist/INDEX.md
```

Read `principle/` for context, then find the next unchecked `[ ]` task in `checklist/`.

## During Implementation

### Task Status Markers

```markdown
- [ ] Pending
- [x] Completed
- [~] In progress
- [!] Blocked (add note)
```

### Workflow

1. Mark task in-progress
2. Follow principle guidance
3. Mark `[x]` when done, add notes if you deviated from plan

### Stage Status (medium/long plans)

| Icon | Meaning |
|------|---------|
| ⏳ | Pending |
| 🔄 | In Progress |
| ✅ | Complete |
| ⚠️ | Blocked |

## Reference Documentation

The `reference/INDEX.md` may contain initial expectations written during planning. Transform these into a curated exposition of the actual implementation:

- Rewrite to describe what exists NOW
- Update when things change (unlike checklist which is a log)
- Focus on architecture, key files, and how things work

## Completing the Plan

1. Ensure all tasks marked `[x]` or cancelled with reason
2. Transform reference to reflect actual implementation
3. Mark complete:

```bash
bun ~/.agenv/bin/ag plan complete --plan "plan-id"
```

## CLI Commands

```bash
bun ~/.agenv/bin/ag plan status [--plan "plan-id"]                    # Check progress
bun ~/.agenv/bin/ag plan update --plan "id" --task "1.2" --status completed
bun ~/.agenv/bin/ag plan complete --plan "id"                         # Mark done
bun ~/.agenv/bin/ag plan index --plan "id" --list                     # View metadata
```
