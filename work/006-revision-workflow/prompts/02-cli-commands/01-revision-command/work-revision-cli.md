Hello Agent!

You are working on the "Revision Command" batch at the "CLI Commands" stage of the "Revision Workflow" workstream.

This is your thread:

"Work Revision CLI" (1)

## Thread Summary
Implement `work revision --name "..."` command that adds a stage template to PLAN.md.

## Thread Details
- Working packages: `./packages/workstreams`
- Create `src/cli/revision.ts`
- Register in `bin/work.ts` SUBCOMMANDS
- Command: `work revision --name <name> [--description <desc>]`
- Behavior:
1. Parse args, load stream
2. Call modified `appendFixStage()` or new `appendRevisionStage()` that uses "Revision -" prefix
3. Output: "Added Stage N: Revision - {name} to PLAN.md"
4. Output: "Edit PLAN.md to fill in details, then run 'work approve revision'"
- Simpler than `work add stage` - no `--stage` reference needed, just appends new stage

Your tasks are:
- [ ] 02.01.01.01 Create `src/cli/revision.ts` with parseCliArgs for `--name` and `--description` flags
- [ ] 02.01.01.02 Implement main() that loads index, resolves stream, calls appendRevisionStage
- [ ] 02.01.01.03 Output success message with stage number and next steps
- [ ] 02.01.01.04 Register "revision" in bin/work.ts SUBCOMMANDS

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
