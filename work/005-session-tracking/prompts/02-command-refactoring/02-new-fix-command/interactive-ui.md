Hello Agent!

You are working on the "New Fix Command" batch at the "Command Refactoring" stage of the "Session Tracking" workstream.

This is your thread:

"Interactive UI" (2)

## Thread Summary
Build interactive prompts for fix command.

## Thread Details
- Working package: `./packages/workstreams`
- Use prompts library (or similar) for interactive selection
- Display thread status table:
```
Thread          Status      Sessions  Last Agent
01.01.01        completed   1         backend-expert
01.01.02        failed      2         backend-expert
01.02.01        incomplete  1         frontend-dev
```
- Prompt for thread selection (if not specified via flag)
- Prompt for action: Resume | Retry | Change Agent | New Stage
- If changing agent, show available agents from `agents.yaml`
- Confirm action before execution

Your tasks are:
- [ ] 02.02.02.01 Create thread status table display showing status, sessions count, and last agent
- [ ] 02.02.02.02 Implement thread selection prompt when no --thread flag provided
- [ ] 02.02.02.03 Implement action selection prompt: Resume, Retry, Change Agent, New Stage
- [ ] 02.02.02.04 Add agent selection prompt showing available agents from agents.yaml
- [ ] 02.02.02.05 Add confirmation prompt before executing selected action

When listing tasks, use `work list --tasks --batch "02.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
