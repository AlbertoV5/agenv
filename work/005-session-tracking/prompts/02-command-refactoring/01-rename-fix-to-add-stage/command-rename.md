Hello Agent!

You are working on the "Rename Fix to Add-Stage" batch at the "Command Refactoring" stage of the "Session Tracking" workstream.

This is your thread:

"Command Rename" (1)

## Thread Summary
Rename `work fix` to `work add-stage` and update all references.

## Thread Details
- Working package: `./packages/workstreams`
- Rename `src/cli/fix.ts` to `src/cli/add-stage.ts`
- Update command registration in `src/cli/index.ts` or main router
- Update command name and help text inside the file
- Add deprecation alias: `work fix` shows warning and forwards to `work add-stage`
- Update skill documentation in `.claude/skills/planning-workstreams/SKILL.md`
- Keep functionality identical, only rename

Your tasks are:
- [ ] 02.01.01.01 Rename fix.ts to add-stage.ts and update internal command name
- [ ] 02.01.01.02 Update command registration in CLI router/index
- [ ] 02.01.01.03 Add deprecation wrapper that shows warning and forwards to add-stage
- [ ] 02.01.01.04 Update help text and command descriptions
- [ ] 02.01.01.05 Update SKILL.md CLI reference documentation

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
