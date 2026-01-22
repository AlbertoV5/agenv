Hello Agent!

You are working on the "TASKS.md Format Extension" batch at the "TASKS.md Agent Assignment Support" stage of the "Streamlined Workflow" workstream.

This is your thread:

"Tasks MD Parser" (1)

## Thread Summary
Update tasks-md.ts to parse and generate agent assignments in TASKS.md format.

## Thread Details
- Working package: `./packages/workstreams/src/lib/tasks-md.ts`
- New syntax for thread headers: `#### Thread 01: Router @agent:backend-expert`
- Parser must extract agent name from thread header
- Generator must include agent assignment in output
- Serializer must apply assigned_agent to all tasks in that thread
Example TASKS.md with agent assignment:
```markdown
## Stage 01: Setup
### Batch 01: Core
#### Thread 01: Router @agent:backend-expert
- [ ] Task 01.01.01.01: Create route definitions
- [ ] Task 01.01.01.02: Add middleware chain
```

Your tasks are:
- [ ] 01.01.01.01 Add regex pattern to extract @agent:name from thread headers
- [ ] 01.01.01.02 Update parseTasksMd() to return assigned_agent per thread
- [ ] 01.01.01.03 Update generateTasksMdFromPlan() to include agent placeholder syntax
- [ ] 01.01.01.04 Update generateTasksMdFromTasks() to include existing agent assignments
- [ ] 01.01.01.05 Update serializeTasksMd() to apply thread agent to all tasks in thread
- [ ] 01.01.01.06 Add unit tests for agent assignment parsing and generation

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
