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

Workstreams live in `./work/{id}/`:

| File | Purpose |
|------|---------|
| `PLAN.md` | Stages, batches, threads, documentation |
| `tasks.json` | Task tracking (CLI managed) |
| `files/` | Outputs organized by stage/batch/thread |

**Hierarchy:** Stage → Batch → Thread → Task

| Level | Execution | Description |
|-------|-----------|-------------|
| Stage | Serial | Major checkpoints |
| Batch | Serial | Ordered groups within stage (00-setup, 01-impl) |
| Thread | Parallel | Concurrent work units within batch |
| Task | Hybrid | Granular steps within thread |

**Task ID:** `{stage}.{batch}.{thread}.{task}` (e.g., `01.00.02.01`)

## Shared Files

These live at `./work/` (shared across all workstreams):

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent definitions and capabilities |
| `TESTS.md` | Test commands and requirements |

## Create a Workstream

```bash
work create --name "feature-name-kebab-case"
```

## Fill in PLAN.md

```markdown
# Plan: {Name}

## Summary
Brief overview.

## References
- Links to relevant docs

## Stage 01: {Stage Name}
{What this stage accomplishes}

### Batch 00: {Batch Name}
{What this batch accomplishes}

#### Thread 01: {Thread Name}

##### Summary
What this thread accomplishes.

##### Details
Implementation approach.
```

## Add Batches and Tasks

```bash
# Add batch to stage
work add-batch --stream "000-my-stream" --stage 01 --name "setup"

# Add task to thread within batch
work add-task --stream "000-my-stream" --stage 01 --batch 00 --thread 01 --name "Task description"
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
work add-batch --stream "000-..." --stage N --name "batch-name"
work add-task --stream "000-..." --stage N --batch M --thread T --name "desc"
```

## Next Steps

- `/implementing-workstream-plans` - work through tasks
- `/reviewing-workstream-plans` - manage workstream structure
- `/generating-workstream-prompts` - generate execution prompts for threads
