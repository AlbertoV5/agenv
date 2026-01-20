---
name: generating-workstream-prompts
description: How to generate execution prompts for agent threads. Use this to prepare context for an agent before it starts work on a thread.
---

# Generating Workstream Prompts

## When to Use

Before an agent starts work on a thread, generate a prompt containing all necessary context.

## Generate Prompt

```bash
work prompt --stream "000-stream-id" --stage 01 --batch 00 --thread 02
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

## CLI Summary

```bash
# Generate prompt for a thread
work prompt --stream "000-..." --stage N --batch M --thread T

# Output to file
work prompt --stream "000-..." --stage 01 --batch 00 --thread 02 > thread-prompt.md
```

## Next Steps

After generating prompt: `/implementing-workstream-plans`
