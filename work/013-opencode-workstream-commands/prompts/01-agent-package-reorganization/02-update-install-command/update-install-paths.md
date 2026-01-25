Hello Agent!

You are working on the "Update Install Command" batch at the "Agent Package Reorganization" stage of the "Opencode Workstream Commands" workstream.

This is your thread:

"Update Install Paths" (1)

## Thread Summary
Update `packages/cli/src/commands/install.ts` to use `agent/` paths.

## Thread Details
- Working packages: `packages/cli`
- Update constants:
- `AGENV_SKILLS` -> `agent/skills`
- `AGENV_TOOLS` -> `agent/tools`
- `AGENV_PLUGINS` -> `agent/plugins`
- `AGENV_HOOKS` -> `agent/hooks`
- Add new `AGENV_COMMANDS` constant for `agent/commands`
- Add `ag install commands` subcommand for opencode commands
- Update help text to reflect new structure

Your tasks are:
- [ ] 01.02.01.01 Update `AGENV_SKILLS` constant to `join(AGENV_HOME, "agent/skills")`
- [ ] 01.02.01.02 Update `AGENV_TOOLS` constant to `join(AGENV_HOME, "agent/tools")`
- [ ] 01.02.01.03 Update `AGENV_PLUGINS` constant to `join(AGENV_HOME, "agent/plugins")`
- [ ] 01.02.01.04 Update `AGENV_HOOKS` constant to `join(AGENV_HOME, "agent/hooks")`
- [ ] 01.02.01.05 Add `AGENV_COMMANDS` constant for `join(AGENV_HOME, "agent/commands")`
- [ ] 01.02.01.06 Add `COMMANDS_TARGETS` with opencode target path `~/.config/opencode/commands`
- [ ] 01.02.01.07 Implement `listCommands()` function to list available commands
- [ ] 01.02.01.08 Implement `installCommandsTo()` function to copy command files
- [ ] 01.02.01.09 Implement `commandsCommand()` function to handle CLI args
- [ ] 01.02.01.10 Add "commands" case to main switch in `main()` function
- [ ] 01.02.01.11 Update `printHelp()` to include commands subcommand
- [ ] 01.02.01.12 Run `bun run typecheck` to verify no type errors

When listing tasks, use `work list --tasks --batch "01.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
