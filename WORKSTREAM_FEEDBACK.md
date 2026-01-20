# Workstream Planning Feedback

Observations and improvement suggestions for the workstream planning workflow.

## What Works Well

1. **Hierarchy is clear**: Stage → Batch → Thread → Task makes sense
2. **Separation of concerns**: PLAN.md for human-readable intent, tasks.json for machine tracking
3. **HITL approval gate**: Requiring `work approve` before adding tasks is a good checkpoint
4. **Validation**: `work consolidate --dry-run` catches structural issues
5. **Interactive mode**: `work add-task` without flags prompts for stage/batch/thread selection
6. **Structure commands**: `work add-batch`, `work add-thread`, `work edit` make iterating faster
7. **Question blocking**: Approval blocked when open questions exist, with `--force` override

## Addressed Improvements

### 1. Heading Level Gap

The hierarchy uses H3 → H5 → H6, skipping H4:
- `### Stage` (H3)
- `#### Stage Definition/Constitution/Questions/Batches` (H4) - section headers
- `##### Batch` (H5)
- `###### Thread` (H6)

This works but is non-intuitive. Could consider restructuring.

**Status**: Kept as-is. The H4 level is used for stage sections (Definition, Constitution, Questions, Batches).

### 2. Task Addition Friction (RESOLVED)

~~Currently: `work add-task --stage 1 --batch 1 --thread 2 --name "..."`~~

**Implemented**: Interactive mode when flags are omitted:
```bash
work add-task
# > Select stage: 1
# > Select batch: 1
# > Select thread: 2
# > Task name: ...
```

### 3. Missing Commands (RESOLVED)

~~No `work add-batch`, `work add-thread`, `work edit` commands.~~

**Implemented**:
- `work add-batch --stage N --name "name"` - Add batch to stage
- `work add-thread --stage N --batch M --name "name"` - Add thread to batch
- `work edit` - Open PLAN.md in $EDITOR

### 4. Constitution Verbosity (RESOLVED)

~~The Constitution section (Requirements, Inputs, Outputs, Flows) is comprehensive but verbose.~~

**Simplified** to three optional sections:
- **Inputs**: What this stage needs (dependencies, data, prior work)
- **Structure**: Internal planning, architecture diagrams, component relationships
- **Outputs**: What this stage produces (files, features, artifacts)

The Structure section encourages planning internals and diagrams (mermaid, ASCII art).

### 5. Questions Section (RESOLVED)

~~Good idea but underutilized.~~

**Implemented**: Open questions now block `work approve`:
```bash
work approve
# Error: Cannot approve plan with open questions
# Found 2 open question(s):
#   Stage 1 (Setup): How should we handle auth?
#   Stage 2 (Views): Use SSR or CSR?

work approve --force  # Override if needed
```

### 6. Batch Numbering

Currently batches start at 01. Documentation now consistent with 1-indexed batch numbers.

### 7. Progress Visibility (RESOLVED)

~~`work preview` is useful but could show more detail.~~

**Implemented**: Enhanced `work preview` now shows:
- **Task counts**: Per-thread task counts with completion status (e.g., `[2/5]`)
- **Dependencies**: Visual indicator of stage dependencies (sequential by default)
- **Progress bar**: Overall completion percentage per batch and stage

```bash
work preview
# Stage 1: Setup [████████░░] 80%
#   Batch 1: Core Config [3/3] ✓
#   Batch 2: Dependencies [1/2]
#     Thread 1: NPM Packages [1/1] ✓
#     Thread 2: System Deps [0/1]
#   ↓ depends on Stage 1
# Stage 2: Implementation [░░░░░░░░░░] 0%
#   (blocked by Stage 1)
```

### 8. Name-Based Addressing (RESOLVED)

~~Currently: `work add-task --stage 1 --batch 1 --thread 2`~~

**Implemented**: Commands now accept names or indices:
```bash
# By index (original behavior)
work add-task --stage 1 --batch 1 --thread 2

# By name (new)
work add-task --stage "Core Infrastructure" --batch "Database Setup" --thread "Migrations"

# Mixed (both work)
work add-task --stage 1 --batch "Database Setup" --thread 2
```

Name matching is case-insensitive and supports partial matches:
```bash
work add-task --stage "core" --batch "db" --thread "mig"
```

### 9. Sequential Stage Dependencies (DOCUMENTED)

**Dependency Model**: The workstream follows a strict sequential execution model:

| Unit | Parallel? | Notes |
|------|-----------|-------|
| Stages | ❌ No | Must complete in order (Stage N blocks Stage N+1) |
| Batches | ❌ No | Within a stage, batches are sequential |
| Threads | ✅ Yes | Within a batch, threads can run in parallel |
| Tasks | ❌ No | Within a thread, tasks are sequential |

```
Stage 1 ──────────────────────────────→ Stage 2 ──────────────────→ ...
  │                                        │
  Batch 1 ────→ Batch 2                    Batch 1 ────→ Batch 2
    │             │                          │
    Thread 1 ═══╗ Thread 1 ═══╗              ...
    Thread 2 ═══╝ Thread 2 ═══╝
      │             │
      Task 1        Task 1
      Task 2        Task 2
      ↓             ↓
```

- **Why sequential stages?** Each stage typically produces outputs required by the next
- **Why parallel threads?** Threads represent independent work within the same scope
- **Validation**: `work consolidate` ensures no forward references exist

## Remaining Ideas

- Auto-create tasks from resolved questions
- Estimated effort tracking per task
- `work status` command for quick completion summary
