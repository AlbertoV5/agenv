---
name: create-workstream-plans
description: How to create a workstream plan for the development of a task or project. Plans should be made for medium to large tasks, as well as indefinite time tasks like debugging and refactoring. They are not needed for small fixes or updates, however, we may need to update existing plans after a fix is applied.
---

# Creating Workstream Plans

## When to Create

- Medium to large features
- Multi-stage implementations
- Debugging complex issues
- Tasks spanning multiple sessions

**Not needed for:** Small fixes, single-file changes.

## Structure

Workstreams live in `./docs/work/{id}/`:

| File | Purpose |
|------|---------|
| `PLAN.md` | Stages, threads, documentation |
| `tasks.json` | Task tracking (CLI managed) |
| `files/` | Outputs (docs, scripts) |

**Hierarchy:** Stage → Thread → Task
**Task ID:** `{stage}.{thread}.{task}` (e.g., `1.2.3`)

## Create a Workstream

```bash
work create --name "feature-name-kebab-case"
```

## Fill in PLAN.md

```markdown
# Plan: {Name}

## Summary
Brief overview.

## Stage 1: {Stage Name}
{What this stage accomplishes}

### Thread 1: {Thread Name}

#### Summary
What this thread accomplishes.

#### Details
Implementation approach.
```

## Add Tasks

```bash
work add-task --stream "000-my-stream" --stage 1 --thread 1 --name "Task description"
```

## Validate

```bash
work consolidate --stream "000-my-stream"
```

## CLI Summary

```bash
work create --name "feature-name"
work preview --stream "000-..."
work consolidate --stream "000-..."
work add-task --stream "000-..." --stage N --thread M --name "desc"
```

## Next Steps

- `/implementing-workstream-plans` - work through tasks
- `/reviewing-workstream-plans` - manage workstream structure
