---
name: reviewing-workstream-plans
description: How to review, validate, and approve workstream plans.
---

# Reviewing Workstream Plans

## Inspect Plan

To view and edit the current plan:

```bash
work review plan         # Prints the entire PLAN.md to console
work preview             # Shows structure, progress, and dependencies
work edit                # Open PLAN.md to read details
```

## Validate Structure

```bash
work validate plan       # Checks for schema errors
work check plan          # Check for open questions, missing inputs, and schema errors
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
