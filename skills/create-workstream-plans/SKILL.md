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

| Level | Heading | Execution | Description |
|-------|---------|-----------|-------------|
| Stage | H3 (`###`) | Serial | Major checkpoints |
| Batch | H5 (`#####`) | Serial | Ordered groups within stage |
| Thread | H6 (`######`) | Parallel | Concurrent work units within batch |
| Task | List item | Hybrid | Granular steps within thread |

**Task ID:** `{stage}.{batch}.{thread}.{task}` (e.g., `01.01.02.01`)

## Shared Files

These live at `./work/` (shared across all workstreams):

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent definitions and capabilities |
| `TESTS.md` | Test commands and requirements |

## Create a Workstream

```bash
# Create with default 1 stage
work create --name "feature-name-kebab-case"

# Create with multiple stages
work create --name "feature-name" --stages 4
```

## Fill in PLAN.md

The PLAN.md uses markdown heading levels to define the hierarchy:

```markdown
# Plan: {Name}

## Summary
Brief overview of what this workstream achieves.

## References
- Links to relevant docs

## Stages

### Stage 01: {Stage Name}

#### Stage Definition
What this stage accomplishes.

#### Stage Constitution

**Inputs:**
- What this stage needs (dependencies, data, prior work)

**Structure:**
- Internal planning, architecture diagrams, component relationships
- Mermaid diagrams, ASCII art, or prose descriptions

**Outputs:**
- What this stage produces (files, features, artifacts)

#### Stage Questions
- [ ] Open questions to resolve before approval

#### Stage Batches

##### Batch 01: {Batch Name}
What this batch accomplishes.

###### Thread 01: {Thread Name}
**Summary:**
Short description of this parallelizable work unit.

**Details:**
Implementation notes, dependencies, goals, code examples.

###### Thread 02: {Another Thread}
**Summary:**
Another parallel work unit.

**Details:**
More implementation details.

##### Batch 02: {Next Batch}
Next batch in sequence.

###### Thread 01: {Thread Name}
**Summary:**
Work unit in batch 02.

**Details:**
Implementation details.
```

## Add Tasks

Tasks can be added interactively or with explicit flags:

```bash
# Interactive mode (prompts for stage, batch, thread)
work add-task
# > Select stage: 1
# > Select batch: 1
# > Select thread: 2
# > Task name: Task description

# Explicit mode
work add-task --stream "000-my-stream" --stage 1 --batch 1 --thread 2 --name "Task description"

# Using current workstream
work current --set "000-my-stream"
work add-task --stage 1 --batch 1 --thread 2 --name "Task description"
```

## Add Batches and Threads

```bash
# Add a new batch to a stage
work add-batch --stage 1 --name "testing"

# Add a new thread to a batch
work add-thread --stage 1 --batch 1 --name "unit-tests"

# Open PLAN.md in your editor
work edit
```

## Validate & Preview

```bash
# Preview PLAN.md structure
work preview --stream "000-my-stream"

# Validate PLAN.md structure
work consolidate --stream "000-my-stream"

# Dry run (validate without writing)
work consolidate --stream "000-my-stream" --dry-run
```

## Approve the Plan

Plans must be approved before tasks can be created. Approval is blocked if there are open questions (unchecked `[ ]` items in Stage Questions):

```bash
# Approve the plan
work approve

# If open questions exist, you'll see:
# Error: Cannot approve plan with open questions
# Found 2 open question(s):
#   Stage 1 (Setup): How should we handle auth?
#   Stage 2 (Views): Use SSR or CSR?

# Options:
# 1. Resolve questions in PLAN.md (mark with [x])
# 2. Force approval anyway
work approve --force

# Revoke approval (to make changes)
work approve --revoke --reason "Need to revise stage 2"
```

## CLI Summary

```bash
# Create and setup
work create --name "feature-name" --stages 4
work current --set "000-..."
work edit                          # Open PLAN.md in editor

# Preview and validate
work preview
work consolidate

# Add structure
work add-batch --stage N --name "batch-name"
work add-thread --stage N --batch M --name "thread-name"
work add-task                      # Interactive mode
work add-task --stage N --batch M --thread T --name "desc"

# Review
work list --tasks
work status

# Approve
work approve                       # Blocks if open questions
work approve --force               # Approve anyway
work approve --revoke              # Revoke approval
```

## Next Steps

- `/implementing-workstream-plans` - work through tasks
- `/reviewing-workstream-plans` - manage workstream structure
- `/generating-workstream-prompts` - generate execution prompts for threads
