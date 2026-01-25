Hello Agent!

You are working on the "Update Install Command" batch at the "Agent Package Reorganization" stage of the "Opencode Workstream Commands" workstream.

This is your thread:

"Update Shell Installer" (2)

## Thread Summary
Update `install.sh` to reflect the new `agent/` structure.

## Thread Details
- Update any references to skills/tools/plugins paths
- Update comments and documentation
- Ensure `--skills-only` and related flags work with new paths

Your tasks are:
- [ ] 01.02.02.01 Update `install.sh` comments to reference new `agent/` structure
- [ ] 01.02.02.02 Update `--skills-only` flag to use new path if hardcoded
- [ ] 01.02.02.03 Update "Available commands" help text to mention `ag install commands`
- [ ] 01.02.02.04 Test `./install.sh` runs without errors

When listing tasks, use `work list --tasks --batch "01.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
