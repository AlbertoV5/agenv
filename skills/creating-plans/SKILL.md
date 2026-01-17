---
name: creating-plans
description: How to create a plan for the development of a task or project. Plans should be made for medium to large tasks, as well as indefinite time tasks like debugging and refactoring. They are not needed for small fixes or updates, however, we may need to update existing plans after a fix is applied.
---

# Creating Plans

## Overview

Plans help define, track, and document development tasks. Each plan lives in `./docs/plans/{id}/` with three subdirectories:

| Directory | Purpose | When |
|-----------|---------|------|
| `principle/` | Analysis, design, pseudo-code | BEFORE development |
| `checklist/` | Task tracking, progress state | DURING development |
| `reference/` | Final documentation | AFTER development |

## Plan Sizes

| Size | Sessions | Est. Hours | Structure |
|------|----------|------------|-----------|
| **short** | 2-3 | 1-2 | Single `INDEX.md` in each directory |
| **medium** | 3-5 | 2-4 | `INDEX.md` with inline stages |
| **long** | 6-10 | 4-8 | `INDEX.md` + separate `STAGE_N.md` files |

A **session** is ~30-45 minutes of implementation with 4-8 back-and-forth iterations.

**Note:** If a task may exceed 8 hours, ask the user for an over-arching document to reference. Then plan only a portion achievable within a long-sized implementation after confirmation.

## Creating a Plan

Run the generator command (auto-detects repo root from current directory):

```bash
plan create --name "plan-name-in-kebab-case" --size short|medium|long
```

Optional flags:
- `--stages N`, `--supertasks N`, `--subtasks N` to customize structure
- `--repo-root /path` to explicitly specify repository (usually auto-detected)

## After Generation

The script creates template files with placeholder comments. Fill in:

1. **principle/INDEX.md** - Goal, Summary, Details (add ### subsections), Architecture & Design, Implementation Stages, Considerations and Questions, References

2. **checklist/** - Replace placeholder task names with actual tasks. Update checkbox status during implementation.

3. **reference/INDEX.md** - Leave mostly empty during planning. Fill in Summary and Outcomes, Documentation and Files (add ### subsections or link to other .md files), Lessons and Considerations after implementation.

## Plan Index

All plans are tracked in `docs/plans/index.json` with metadata (size, timestamps, synthesis status). The script manages this automatically.
