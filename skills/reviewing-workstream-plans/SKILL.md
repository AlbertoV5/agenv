---
name: reviewing-workstream-plans
description: How to review and manage existing workstream plans before implementation. Use for reading workstreams, adding batches/tasks/stages/threads, and restructuring. Does not cover task status updates or implementation.
---

# Reviewing Workstream Plans

## Overview

Use for:
- Understanding workstream structure
- Adding stages, batches, threads, tasks
- Reorganizing workstream content

**Not for:** Task status updates (use `/implementing-workstream-plans`).

## Read Workstreams

```bash
work status                                 # All workstreams
work preview --stream "000-stream-id"       # Structure overview
work list --stream "000-stream-id" --tasks  # Task list
work read --stream "000-stream-id" --task "01.01.02.01"  # Task details
work edit                                   # Open PLAN.md in editor
```

## Structure

```
Stage 01: Setup
├── Batch 01: Environment Setup
│   ├── Thread 01: Backend
│   │   └── Task 01.01.01.01: Install deps
│   └── Thread 02: Frontend
│       └── Task 01.01.02.01: Setup bundler
└── Batch 02: Database
    └── Thread 01: Schema
        └── Task 01.02.01.01: Create tables
```

**Hierarchy:** Stage → Batch → Thread → Task
**Task ID:** `{stage}.{batch}.{thread}.{task}`

Batches run serially (01 before 02). Threads within a batch run in parallel.

## PLAN.md Format

```markdown
### Stage N: {Name}

#### Stage Definition
{Stage definition}

#### Stage Constitution

**Inputs:**
- What this stage needs

**Structure:**
- Internal planning, architecture, diagrams

**Outputs:**
- What this stage produces

#### Stage Questions
- [ ] Unresolved questions (blocks approval)
- [x] Resolved questions

#### Stage Batches

##### Batch MM: {Name}
{Batch purpose}

###### Thread T: {Name}

**Summary:**
Thread purpose.

**Details:**
Implementation approach.
```

## Manage Structure

```bash
# Add batch to a stage
work add-batch --stage 1 --name "testing"

# Add thread to a batch
work add-thread --stage 1 --batch 1 --name "unit-tests"

# Add task (interactive)
work add-task
# > Select stage: 1
# > Select batch: 1
# > Select thread: 2
# > Task name: Task description

# Add task (explicit)
work add-task --stage 1 --batch 1 --thread 2 --name "Task description"

# Delete
work delete --stream "000-..." --task "01.01.02.03"
work delete --stream "000-..." --thread "01.01.02"
work delete --stream "000-..." --batch "01.01"
work delete --stream "000-..." --stage 2
```

## Validate

```bash
work consolidate --stream "000-stream-id"
```

## Approval Status

Check and manage approval:

```bash
# Check status (shows if approved, draft, or revoked)
work status --stream "000-..."

# Approve plan (blocked if open questions exist)
work approve

# Force approval with open questions
work approve --force

# Revoke to make changes
work approve --revoke --reason "Need changes"
```

## CLI Summary

```bash
# Read
work status
work preview --stream "000-..."
work list --stream "000-..." --tasks
work read --stream "000-..." --task "01.01.02.01"
work edit                               # Open in $EDITOR

# Manage structure
work add-batch --stage N --name "batch-name"
work add-thread --stage N --batch M --name "thread-name"
work add-task                           # Interactive mode
work add-task --stage N --batch M --thread T --name "desc"

# Delete
work delete --stream "000-..." --task "01.01.02.03"
work delete --stream "000-..." --batch "01.01"

# Validate and approve
work consolidate --stream "000-..."
work approve
work approve --force
work approve --revoke
```

## Next Steps

Once ready: `/implementing-workstream-plans`
