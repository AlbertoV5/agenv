---
name: reviewing-workstreams
description: How to review, validate, and approve workstream plans.
---

# Reviewing Workstream Plans

## Inspect Plan

To view and edit the current plan:

```bash
work review plan         # Prints the entire PLAN.md to console
work preview             # Shows structure, progress, and dependencies
```

## Validate Structure

```bash
work validate plan       # Checks for schema errors
work check plan          # Check for open questions, missing inputs, and schema errors
```

## Manage Approval

Plans must be approved before tasks can be started. All approval commands are **user-only** and require the `!` prefix.

```bash
# Approve (blocked if open questions in PLAN.md)
!work approve plan

# Approve specific stage
!work approve stage 1

# Force approval (ignore open questions)
!work approve plan --force

# Revoke (if plan needs revision during execution)
!work approve plan --revoke --reason "Missing security review"
```

## Criteria

- Check that the threads are parallelizable, small overlaps are ok as agents can wait a few seconds for each another
- Check that we mention files correctly
- Check that we have documentation stages
- Check that we are following best practices for this repo