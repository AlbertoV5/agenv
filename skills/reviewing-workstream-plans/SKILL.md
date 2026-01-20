---
name: reviewing-workstream-plans
description: How to review and manage existing workstream plans before implementation. Use for reading workstreams, adding tasks/stages/threads, and restructuring. Does not cover task status updates or implementation.
---

# Reviewing Workstream Plans

## Overview

Use for:
- Understanding workstream structure
- Adding stages, threads, tasks
- Reorganizing workstream content

**Not for:** Task status updates (use `/implementing-workstream-plans`).

## Read Workstreams

```bash
work status                                 # All workstreams
work preview --stream "000-stream-id"       # Structure overview
work list --stream "000-stream-id" --tasks  # Task list
work read --stream "000-stream-id" --task "1.2.1"  # Task details
cat work/000-stream-id/PLAN.md         # Full content
```

## Structure

```
Stage 1: Setup
├── Thread 1: Environment
│   └── Task 1.1.1: Install deps
└── Thread 2: Database
    └── Task 1.2.1: Create schema
```

**Task ID:** `{stage}.{thread}.{task}`

## Edit PLAN.md

```markdown
## Stage N: {Name}
{Stage definition}

### Thread M: {Name}

#### Summary
Thread purpose.

#### Details
Implementation approach.
```

## Manage Tasks

```bash
# Add
work add-task --stream "000-..." --stage 1 --thread 2 --name "Task description"

# Delete
work delete --stream "000-..." --task "1.2.3"
work delete --stream "000-..." --thread "1.2"
work delete --stream "000-..." --stage 2
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
work read --stream "000-..." --task "1.2.1"

# Manage
work add-task --stream "000-..." --stage N --thread M --name "desc"
work delete --stream "000-..." --task "1.2.3"
work consolidate --stream "000-..."
```

## Next Steps

Once ready: `/implementing-workstream-plans`
