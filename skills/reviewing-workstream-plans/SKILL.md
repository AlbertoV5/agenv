---
name: reviewing-workstream-plans
description: How to review, validate, and approve workstream plans.
---

# Reviewing Workstream Plans

## Inspect Plan

To view and edit the current plan:

```bash
work preview             # Shows structure, progress, and dependencies
work edit                # Open PLAN.md to read details
```

## Validate Structure

```bash
work validate plan       # Checks for schema errors, open questions, missing inputs
work check plan          # Lists all unchecked [ ] items with line numbers
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
