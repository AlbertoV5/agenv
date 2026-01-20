---
name: generating-workstream-prompts
description: How to generate execution prompts for agent threads. Use this to prepare context for an agent before it starts work on a thread.
---

# Generating Workstream Prompts

## When to Use

Before an agent starts work on a thread, generate a prompt containing all necessary context.

## Generate Prompt

```bash
work prompt --stream \"000-stream-id\" --stage \"setup\" --batch \"core\" --thread \"config\"
```

## What the Prompt Contains

| Section | Source |
|---------|--------|
| Thread Summary | PLAN.md thread summary |
| Thread Details | PLAN.md implementation approach |
| Stage Context | PLAN.md stage definition |
| Batch Context | PLAN.md batch purpose |
| Assigned Tasks | tasks.json tasks for this thread |
| Parallel Threads | Other threads in same batch (for awareness) |
| Test Requirements | `work/TESTS.md` if present |
| Agent Assignment | `work/AGENTS.md` if present |

## Prompt Structure

```markdown
# Thread: {Thread Name}

## Context
Stage: {Stage Name} - {Stage Definition}
Batch: {Batch Name} - {Batch Purpose}

## Summary
{Thread summary from PLAN.md}

## Details
{Thread details from PLAN.md}

## Tasks
- [ ] {task id}: {description}
- [ ] {task id}: {description}

## Parallel Threads
These threads run alongside yours in this batch:
- Thread {N}: {Name}

## Test Requirements
{From work/TESTS.md if present}

## Agent Assignment
{From work/AGENTS.md if present}
```

## User-Managed Configuration Files

These files are created and maintained by the user. The planning agent reads them but does not create or edit them.

### AGENTS.md (at `work/AGENTS.md`)

If present, defines available agents. Use `work agents` to list them, then assign to threads:

```bash
work agents                                      # List available agents
work assign --thread "01.01.01" --agent "backend-expert"
```

### TESTS.md (at `work/TESTS.md`)

If present, test requirements are automatically included in generated prompts.

To exclude test requirements from a prompt:
```bash
work prompt --stage 1 --batch 1 --thread 1 --no-tests
```

## CLI Summary

> **Note:** Commands accept stage/batch/thread names or numeric indices.

```bash
# Generate prompt for a thread (by name)
work prompt --stream \"000-...\" --stage \"setup\" --batch \"core\" --thread \"config\"

# All threads in a batch
work prompt --stage 1 --batch 1

# Note: All generated prompts are automatically appended to `work/{id}/PROMPTS.md` with a timestamp.
```