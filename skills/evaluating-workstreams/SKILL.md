---
name: evaluating-workstreams
description: How to document workstream results and next steps.
---

# Evaluating Workstreams

## View Workstream

The first thing you want to do is to check the current workstream status and progress.

```bash
work status              # Shows plan status and progress
work tree                # Tree view of plan tasks status
```

## Review Workstream

Once you know the status you can look at the initial plan to understand the initial goal and workstream stages.

```bash
work review plan         # Prints the entire PLAN.md to console
work preview             # Shows structure, progress, and dependencies
```

## Evaluate Workstream

- Determine the status of the implementation by researching the codebase based on the files mentioned in the plan and additional exploration you may do.
- Ask the user for feedback on the implementation and for any bugs and issues found.
- Once the user has given you feedback, create a .md file to document the status, issues, and the evaluation result:

The evaluation result should contain the following sections:

```md
# Evaluation Result

## Status

## Issues

## Next Steps
```