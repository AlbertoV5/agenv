---
name: implementing-plans
description: How to follow and update a plan during implementation. This is the counterpart to creating-plans - use it when working through an existing plan.
---

# Implementing Plans

## Overview

This skill guides implementation of plans created with the `creating-plans` skill. Plans live in `./docs/plans/{id}/` with three directories:

| Directory | Purpose | Your Role |
|-----------|---------|-----------|
| `principle/` | Analysis, design, pseudo-code | READ for context and approach |
| `checklist/` | Task tracking, progress state | UPDATE as you work |
| `reference/` | Final documentation | WRITE after completion |

## Starting Implementation

### 1. Load the Plan

Before starting work, read the plan files:

```bash
# Get plan info from index (auto-detects repo root)
plan status --plan "plan-id"

# Or read directly
cat docs/plans/{plan-id}/principle/INDEX.md
cat docs/plans/{plan-id}/checklist/INDEX.md
```

### 2. Understand the Context

From `principle/`:
- **Goal**: What we're trying to achieve
- **Summary**: High-level approach
- **Architecture & Design**: Technical decisions and patterns
- **Considerations**: Constraints, risks, edge cases

### 3. Identify Current Task

From `checklist/`:
- Find the first unchecked `[ ]` task
- Check if any tasks are marked in-progress but incomplete
- Review the stage context if applicable

## During Implementation

### Updating Task Status

Update checkboxes in the checklist files as you work:

```markdown
# Status markers
- [ ] Task pending
- [x] Task completed
- [~] Task in progress (optional marker)
- [!] Task blocked (add note below)
```

### Workflow Per Task

1. **Before starting**: Mark task in-progress or note which task you're on
2. **During work**: Follow the principle guidance for approach
3. **After completing**:
   - Mark task `[x]` completed
   - Add notes if implementation deviated from plan
   - Update the "Last updated" date at bottom of file

### Updating Checklist Files

For **short** plans - single `checklist/INDEX.md`:
```markdown
## Tasks

### Task Group 1
- [x] Subtask 1.1  <!-- completed -->
- [x] Subtask 1.2  <!-- completed -->
- [ ] Subtask 1.3  <!-- next up -->
```

For **medium** plans - inline stages in `checklist/INDEX.md`:
```markdown
## Stage Overview
| Stage | Title | Status |
|-------|-------|--------|
| 1 | Database Setup | ✅ Complete |
| 2 | API Layer | 🔄 In Progress |
| 3 | Frontend | ⏳ Pending |

## Stage 2: API Layer
### Stage 2 - Task Group 1
- [x] Subtask 1.1
- [ ] Subtask 1.2  <!-- working on this -->
```

For **long** plans - update both `checklist/INDEX.md` and `checklist/STAGE_N.md`:
```markdown
# In INDEX.md - update stage status
| 1 | STAGE_1.md | Database Setup | ✅ Complete |
| 2 | STAGE_2.md | API Layer | 🔄 In Progress |

# In STAGE_2.md - update tasks
- [x] Subtask 1.1
- [ ] Subtask 1.2
```

### Status Icons Reference

| Icon | Meaning | When to Use |
|------|---------|-------------|
| ⏳ Pending | Not started | Default state |
| 🔄 In Progress | Currently working | Active stage/task |
| ✅ Complete | All tasks done | Stage/section finished |
| ⚠️ Blocked | Cannot proceed | Waiting on dependency |
| ❌ Cancelled | Will not do | Scope changed |

## Adding Implementation Notes

Add notes directly in checklist files when:
- Implementation differs from the principle
- You discover edge cases
- You make architectural decisions
- Something is blocked or needs follow-up

```markdown
### Task Group 1

- [x] Implement user validation

**Notes:**
- Used zod instead of joi as specified - better TypeScript support
- Added rate limiting not in original plan (security concern)
```

## Completing a Stage

When finishing a stage:

1. Mark all tasks complete in the stage
2. Update stage status in INDEX.md overview table
3. Add stage completion notes if needed
4. Update progress summary (for long plans)

```markdown
## Progress Summary

- **Total Stages:** 4
- **Completed:** 2
- **In Progress:** 1
- **Pending:** 1
```

## Completing the Plan

### 1. Final Checklist Review

Ensure all tasks are marked complete or explicitly cancelled with reason.

### 2. Update Reference Documentation

Fill in `reference/INDEX.md`:

```markdown
## Summary and Outcomes

- Successfully migrated 15 database tables to new ORM
- Reduced query latency by 40%
- Added comprehensive type safety

## Documentation and Files

### Database Schema
- `src/db/schema.ts` - Main schema definitions
- `src/db/migrations/` - Migration files

### API Changes
- Updated endpoints documented in `docs/api.md`

## Lessons and Considerations

### What Worked
- Incremental migration approach prevented downtime
- Type generation caught 12 bugs before deployment

### Future Considerations
- Consider adding query caching layer
- Monitor N+1 query patterns in new ORM
```

### 3. Update Plan Index

Update `docs/plans/index.json` to mark synthesis status:

```bash
plan complete --plan "001-migrate-sql-to-orm"
```

Or manually update the plan entry:
```json
{
  "synthesis": {
    "synthesized": true,
    "reference_path": "docs/references/sql-to-orm-migration.md",
    "synthesized_at": "2025-01-15T10:30:00Z"
  }
}
```

## CLI Tools

All CLI tools auto-detect the repository root from the current directory. Use the unified `plan` command with subcommands:

### Check Plan Status

```bash
plan status [--plan "plan-id"]
```

### Update Task Status

```bash
plan update --plan "plan-id" --task "1.2" --status completed [--note "Note"]
```

### Complete a Plan

```bash
plan complete --plan "plan-id" [--reference-path "docs/references/feature.md"]
```

### Update Plan Metadata

```bash
plan index --plan "plan-id" --field "synthesis.synthesized" --value "true"

# Or list plan fields:
plan index --plan "plan-id" --list
```

## Quick Reference

### Starting a Session

1. Read `principle/INDEX.md` for context
2. Check `checklist/INDEX.md` for current progress
3. Find next uncompleted task
4. Work on task, updating checklist as you go

### Ending a Session

1. Mark completed tasks with `[x]`
2. Add notes for any deviations or discoveries
3. Update stage status if applicable
4. Update "Last updated" timestamp

### Handling Blockers

1. Mark task with `[!]` or note as blocked
2. Add blocker description in Notes section
3. Create follow-up task if needed
4. Continue with next unblocked task
