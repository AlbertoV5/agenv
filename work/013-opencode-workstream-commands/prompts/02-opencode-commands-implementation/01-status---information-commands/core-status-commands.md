Hello Agent!

You are working on the "Status & Information Commands" batch at the "OpenCode Commands Implementation" stage of the "Opencode Workstream Commands" workstream.

This is your thread:

"Core Status Commands" (1)

## Thread Summary
Create commands for viewing workstream status and information.

## Thread Details
- Commands to create in `agent/commands/`:
- `w:status.md` - Show workstream progress
- `w:current.md` - Show/set current workstream
- `w:context.md` - Show workstream context
- `w:list.md` - List tasks
- `w:tree.md` - Show structure tree
- `w:preview.md` - Preview PLAN.md structure
Example format:
```markdown
---
description: Show workstream status and progress
---

Run `work status $ARGUMENTS` and display the results.
```

Your tasks are:
- [ ] 02.01.01.01 Create `agent/commands/w:status.md` - runs `work status $ARGUMENTS`
- [ ] 02.01.01.02 Create `agent/commands/w:current.md` - runs `work current $ARGUMENTS`
- [ ] 02.01.01.03 Create `agent/commands/w:context.md` - runs `work context`
- [ ] 02.01.01.04 Create `agent/commands/w:list.md` - runs `work list $ARGUMENTS`
- [ ] 02.01.01.05 Create `agent/commands/w:tree.md` - runs `work tree`
- [ ] 02.01.01.06 Create `agent/commands/w:preview.md` - runs `work preview`

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
