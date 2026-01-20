---
name: reviewing-workstream-plans
description: How to review, validate, and approve workstream plans.
---

# Reviewing Workstream Plans

## Inspect Plan

```bash
work current --set "000-stream-id"
work preview             # Shows structure, progress, and dependencies
work status              # Shows overall status & open questions
work edit                # Open PLAN.md to read details
```

## Validate Structure

```bash
work consolidate         # Checks for schema errors, missing links
work consolidate --dry-run
```

## Manage Approval

Plans must be approved before tasks can be started.

```bash
# Approve (blocked if open questions in PLAN.md)
work approve

# Force approval (ignore open questions)
work approve --force

# Revoke (if plan needs revision during execution)
work approve --revoke --reason "Missing security review"
```

## Quick Fixes

If the plan needs minor adjustments during review:

```bash
> **Note:** Commands accept names or indices.

# Add missing items
work add-batch --stage "setup" --name "tests"
work add-thread --stage "setup" --batch "tests" --name "unit"
work add-task --stage "setup" --batch "tests" --thread "unit" --name "Check coverage"

# Remove incorrect items
work delete --task "01.01.01.01"
```
