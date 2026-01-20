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

## Workflow Overview

Your scope is **planning only** — you do not implement code. Follow this workflow:

1. **Create workstream** — `work create --name "feature" --stages N`
2. **Fill out PLAN.md** — Define stages, batches, threads, and resolve questions
3. **Ask user for review** — Present the plan structure for feedback
4. **Create tasks** — Once approved, add tasks to each thread
5. **Plan agent assignments** — Decide which threads map to which implementation agents
6. **Generate agent prompts** — Use `work prompt` to create execution context
7. **Ask user to run agents** — Hand off prompts to user for execution
8. **Wait for instructions** — User may request fixes, additional stages, or adjustments

The user manages agent execution. Your job ends when prompts are ready.

---

## Create a Workstream

```bash
work create --name "feature-name" --stages 4  # --stages is required
work current --set "000-feature-name"         # Set as active
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
Describe inputs (what this stage needs), structure (how it's organized), and outputs (what it produces).

#### Stage Questions
- [ ] Open questions (blocks approval)
- [x] Resolved questions

#### Stage Batches

##### Batch 01: {Batch Name}

###### Thread 01: {Thread Name}
**Summary:** Short description
**Details:** Implementation notes, dependencies, code examples
```

## Add Structure

Commands accept stage/batch/thread names or numeric indices.

```bash
work add-batch --stage "setup" --name "testing"
work add-thread --stage "setup" --batch "core" --name "unit-tests"
work edit       # Open PLAN.md in editor
```

## Validate & Approve

```bash
work preview      # Shows structure with progress
work consolidate  # Validates PLAN.md structure
work approve      # Approve plan (blocked if open questions)
work approve --force  # Approve with open questions
```

## Create Tasks

After approval, add tasks to threads:

```bash
work add-task --stage 1 --batch 1 --thread 1 --name "Implement router"
work add-task   # Interactive mode
```

Each thread typically has 1-3 tasks. Task names should be actionable.

## Generate Agent Prompts

Create execution prompts for implementation agents:

```bash
work prompt --stage 1 --batch 1 --thread 1
work prompt --stage 1 --batch 1              # All threads in batch
```

Present these prompts to the user. They will run implementation agents with this context.

## Handoff to User

When prompts are ready:

1. Show the user the generated prompts
2. Explain which threads can run in parallel (same batch)
3. Ask user to execute with their implementation agents
4. Wait for user to report completion or issues

If the user reports problems:
- Use `work update --task "01.01.01.01" --status blocked` to mark issues
- Add fix stages with `work fix` if needed
- Regenerate prompts after adjustments

---

## CLI Reference

```bash
# Create & setup
work create --name "feature-name" --stages N
work current --set "000-feature-name"

# Structure
work add-batch --stage "setup" --name "batch-name"
work add-thread --stage "setup" --batch "core" --name "thread-name"
work edit

# Validate & approve
work preview
work consolidate
work approve

# Tasks (after approval)
work add-task --stage 1 --batch 1 --thread 1 --name "Task description"

# Agent prompts
work prompt --stage 1 --batch 1 --thread 1

# Status updates (after user feedback)
work update --task "01.01.01.01" --status completed
work update --task "01.01.01.01" --status blocked
work fix   # Add fix stage
```
