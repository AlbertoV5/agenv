Hello Agent!

You are working on the "Cleanup & Documentation" batch at the "Revision - Remove Commands & Document Bang Syntax" stage of the "Opencode Workstream Commands" workstream.

This is your thread:

"Implementation" (1)

## Thread Summary
Remove commands directory and update documentation to explain the `!work` bash syntax.

## Thread Details
- Remove `agent/commands/` directory entirely
- Update `docs/opencode-commands.md` to document `!work` syntax instead of custom commands
- Update `README.md` to remove references to `ag install commands`
- Remove `ag install commands` from the CLI (or keep for future use)

Your tasks are:
- [ ] 04.01.01.01 Remove `agent/commands/` directory (already done)
- [ ] 04.01.01.02 Update `docs/opencode-commands.md` to document `!work` bash syntax instead of custom commands
- [ ] 04.01.01.03 Update `agent/skills/planning-workstreams/SKILL.md` to use `!` prefix for user commands (approve, start, complete) and regular syntax for agent commands
- [ ] 04.01.01.04 Update any other skills that reference workstream CLI commands to use the `!` convention
- [ ] 04.01.01.05 Verify documentation is clear about agent vs user command execution

When listing tasks, use `work list --tasks --batch "04.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
