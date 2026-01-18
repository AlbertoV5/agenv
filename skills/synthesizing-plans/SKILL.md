---
name: synthesizing-plan
description: How to synthesize plan reference documentation into global docs. Only use when the user requests to synthesize a plan or a plan reference.
---

# Synthesizing Plan Reference

> **Prerequisite**: Run `~/.agenv/install.sh` to install the `ag` CLI.

## Overview

After a plan is complete, synthesize its reference documentation into global docs at `./docs/reference/`. This captures learnings for future use.

```
docs/plans/{id}/reference/INDEX.md  →  docs/reference/{topic}.md
```

## Workflow

### 1. Verify Implementation

Read the plan's reference and confirm the codebase matches:

```bash
ag plan status --plan "plan-id"
cat docs/plans/{plan-id}/reference/INDEX.md
```

Check that documented files exist and code matches the description.

### 2. Create Global Reference

```bash
mkdir -p docs/reference
```

Write `docs/reference/{topic}.md` synthesizing the plan's reference with:
- Overview of the feature/system
- Key files and their purposes
- Usage notes and configuration
- Link back to the source plan

### 3. Mark Synthesis Complete

```bash
ag plan complete --plan "plan-id" --reference-path "docs/reference/{topic}.md"
```

## CLI Commands

```bash
# View plan metadata
ag plan index --plan "plan-id" --list

# Check progress
ag plan status --plan "plan-id"

# Mark complete with reference
ag plan complete --plan "plan-id" --reference-path "docs/reference/topic.md"

# Update fields individually
ag plan index --plan "plan-id" --field "synthesis.reference_path" --value "path"
```

## Handling Issues

- **Stale docs**: Update `reference/INDEX.md` first, then synthesize
- **Incomplete implementation**: Don't synthesize; create follow-up tasks
- **Multiple plans → one doc**: Point all plans' `reference_path` to the same file
