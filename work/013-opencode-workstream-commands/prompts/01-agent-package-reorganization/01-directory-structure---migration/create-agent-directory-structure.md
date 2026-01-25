Hello Agent!

You are working on the "Directory Structure & Migration" batch at the "Agent Package Reorganization" stage of the "Opencode Workstream Commands" workstream.

This is your thread:

"Create Agent Directory Structure" (1)

## Thread Summary
Create the `agent/` directory with all subdirectories and move existing resources.

## Thread Details
- Working packages: Root directory
- Create `agent/` with subdirectories:
- `agent/skills/` - Move from `./skills/`
- `agent/commands/` - New, for opencode slash commands
- `agent/tools/` - Move from `./tools/`
- `agent/plugins/` - Move from `./plugins/`
- `agent/hooks/` - Move from `./hooks/`
- Move all existing files to new locations
- Remove old empty directories
- Update `.gitignore` if needed

Your tasks are:
- [ ] 01.01.01.01 Create `agent/` directory with subdirectories: `skills/`, `commands/`, `tools/`, `plugins/`, `hooks/`
- [ ] 01.01.01.02 Move contents of `skills/` to `agent/skills/` (5 workstream skill directories)
- [ ] 01.01.01.03 Move contents of `tools/` to `agent/tools/` (workstream.ts)
- [ ] 01.01.01.04 Move contents of `plugins/` to `agent/plugins/` (setup-env.ts)
- [ ] 01.01.01.05 Move contents of `hooks/` to `agent/hooks/` (hooks.json)
- [ ] 01.01.01.06 Remove old empty directories (`skills/`, `tools/`, `plugins/`, `hooks/`)
- [ ] 01.01.01.07 Verify all files moved correctly with `ls -la agent/*/`

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
