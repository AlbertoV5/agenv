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
## Criteria

- Check that the threads are parallelizable, small overlaps are ok as agents can wait a few seconds for each another
- Check that we mention files correctly
- Check that we have documentation stages
- Check that we are following best practices for this repo