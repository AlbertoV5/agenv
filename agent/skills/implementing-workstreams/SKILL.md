---
name: implementing-workstreams
description: How to execute an existing workstream plan. Focuses on finding tasks, updating status, and maintaining context.
---

# Implementing Workstream Plans

## Execution Context

```bash
work status             # High-level progress & current stage
work tree --batch "01.01" # Structure view for the batch your thread is in
work list --tasks --thread "01.01.01" # List tasks for your thread
```

## Thread Workflow

1. **Find Task**: View current working batch via `work list --batch "ID"`
2. **Work on your task**: Implement the task for your thread only
3. **Start**: `work update --task "01.01.01.01" --status in_progress`
4. **Finish**: `work update --task "01.01.01.01" --status completed --report "Brief summary"`

**Status options:** `in_progress`, `completed`, `blocked`, `cancelled`

## Task Completion

When completing a task, **always include a brief report**:

```bash
work update --task "01.01.01.01" --status completed \
  --report "Brief summary of what was done"
```

Reports should be:
- 1-2 sentences
- Mention specific files/dependencies changed
- Note any important decisions or deviations

### Example

```bash
work update --task "01.01.01.01" --status completed \
  --report "Added hono@4.0.0 to package.json. Fixed peer dependency warning by also adding @hono/node-server."
```

### Update All Tasks in Thread

When you've completed **all tasks in your thread**, you can update them all at once:

```bash
work update --thread "01.01.01" --status completed \
  --report "Implemented full API layer with validation and error handling."
```

This is useful when wrapping up a thread's work in one step.

## Work Continuation

In case of finding an in-progress thread, make sure to review all files that were edited, look at the incomplete tasks report and determine best course of action.

In case the previous agent finished all the work and failed to mark as completed just update the task status.

In case the task is impossible to solve, stop and notify the user in your response. 

## Work Collaboration

In case of requiring a functionality that may currently be worked on in a parallel Thread: 

1. Wait 10-20 seconds to check if the fellow agent finished the work.
2. If not done yet you can implement a placeholder to continue your work, or mark the task as blocked.
3. If you include a placeholder mask the task as in_progress and include details in the task "report".

## Fixing & Resuming Work

The system tracks your session ID, allowing you to resume work if interrupted or fix issues in completed threads.

### Interactive Fix
Run `work fix` to see a list of incomplete or failed threads and choose an action.

### Common Fix Scenarios

**1. Resuming an Interrupted Session**
If your session crashed or was interrupted, you can resume exactly where you left off:
```bash
work fix --thread "01.01.01" --resume
```

**2. Retrying a Failed Thread**
If a thread failed or the result is unsatisfactory, you can retry with the same agent (starts a fresh session):
```bash
work fix --thread "01.01.01" --retry
```

**3. Trying a Different Agent**
If the current agent is struggling, try a different one:
```bash
work fix --thread "01.01.01" --agent "senior-dev"
```

## Additional Resources

If you have questions you can check the plan using `work review plan`.