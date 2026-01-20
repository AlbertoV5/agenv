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
work read --stream "000-stream-id" --task "01.00.02.01"  # Task details
cat work/000-stream-id/PLAN.md              # Full content
```

## Structure

```
Stage 01: Setup
├── Batch 00: Environment Setup
│   ├── Thread 01: Backend
│   │   └── Task 01.00.01.01: Install deps
│   └── Thread 02: Frontend
│       └── Task 01.00.02.01: Setup bundler
└── Batch 01: Database
    └── Thread 01: Schema
        └── Task 01.01.01.01: Create tables
```

**Hierarchy:** Stage → Batch → Thread → Task
**Task ID:** `{stage}.{batch}.{thread}.{task}`

Batches run serially (00 before 01). Threads within a batch run in parallel.

## Edit PLAN.md

```markdown
## Stage N: {Name}
{Stage definition}

### Batch MM: {Name}
{Batch purpose}

#### Thread T: {Name}

##### Summary
Thread purpose.

##### Details
Implementation approach.
```

## Manage Structure

```bash
# Add batch
work add-batch --stream "000-..." --stage 01 --name "setup"

# Add task
work add-task --stream "000-..." --stage 01 --batch 00 --thread 02 --name "Task description"

# Delete
work delete --stream "000-..." --task "01.00.02.03"
work delete --stream "000-..." --thread "01.00.02"
work delete --stream "000-..." --batch "01.00"
work delete --stream "000-..." --stage 02
```

## Validate

```bash
work consolidate --stream "000-stream-id"
```

## CLI Summary

```bash
# Read
work status
work preview --stream "000-..."
work list --stream "000-..." --tasks
work read --stream "000-..." --task "01.00.02.01"

# Manage
work add-batch --stream "000-..." --stage 01 --name "batch-name"
work add-task --stream "000-..." --stage 01 --batch 00 --thread 02 --name "desc"
work delete --stream "000-..." --task "01.00.02.03"
work delete --stream "000-..." --batch "01.00"
work consolidate --stream "000-..."
```

## Next Steps

Once ready: `/implementing-workstream-plans`
