---
name: create-workstream-plans
description: How to create a workstream plan for development tasks. Plans are for medium to large tasks or multi-session work. Not needed for small fixes.
---

# Creating Workstream Plans

## When to Create

- Medium to large features
- Multi-stage implementations
- Tasks spanning multiple sessions

**Not needed for:** Small fixes, single-file changes.

## Create a Workstream

```bash
work create --name "feature-name" --stages 4  # Stage number required
```

## Structure Overview

Workstreams live in `./work/{id}/`:

| File | Purpose |
|------|---------|
| `PLAN.md` | Stages, batches, threads, documentation |
| `tasks.json` | Task tracking (CLI managed) |

**Hierarchy:** Stage → Batch → Thread → Task  
**Execution:** Stages/batches run serially; threads run in parallel within a batch.

## Fill in PLAN.md

```markdown
# Plan: {Name}

## Summary
Brief overview of what this workstream achieves.

## Stages

### Stage 01: {Stage Name}

#### Stage Definition
What this stage accomplishes.

#### Stage Constitution

**Inputs:** What this stage needs
**Structure:** Internal planning, architecture
**Outputs:** What this stage produces

#### Stage Questions
- [ ] Open questions (blocks approval)

#### Stage Batches

##### Batch 01: {Batch Name}

###### Thread 01: {Thread Name}
**Summary:** Short description
**Details:** Implementation notes
```

## Add Structure

> **Note:** Commands accept stage/batch/thread names or numeric indices.

```bash
work add-batch --stage "setup" --name "testing"
work add-thread --stage "setup" --batch "core" --name "unit-tests"
work add-task --stage "setup" --batch "core" --thread "config" --name "Task description"
work add-task   # Interactive mode
work edit       # Open PLAN.md in editor
```

## Validate & Approve

```bash
work preview      # Shows structure with progress
work consolidate  # Validates PLAN.md structure
work approve      # Approve plan (blocked if open questions)
work approve --force  # Approve anyway
```

## CLI Summary

```bash
# Create
work create --name "feature-name"
work current --set "000-..."

# Structure (names or indices)
work add-batch --stage "setup" --name "batch-name"
work add-thread --stage "setup" --batch "core" --name "thread-name"
work add-task --stage "setup" --batch "core" --thread "config" --name "desc"

# Validate & approve
work preview
work consolidate
work approve
```
