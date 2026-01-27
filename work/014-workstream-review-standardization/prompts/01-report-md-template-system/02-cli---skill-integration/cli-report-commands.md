Hello Agent!

You are working on the "CLI & Skill Integration" batch at the "REPORT.md Template System" stage of the "Workstream Review Standardization" workstream.

This is your thread:

"CLI Report Commands" (1)

## Thread Summary
Add CLI commands for generating and validating REPORT.md.

## Thread Details
- Working packages: `packages/workstreams/src/cli`
- Add `work report generate` to create REPORT.md from template
- Add `work report validate` to check required sections are filled
- Update `work create` to generate REPORT.md template
- Consider merging/consolidating existing report commands

Your tasks are:
- [ ] 01.02.01.01 Add `work report init` subcommand to generate REPORT.md template for existing workstreams
- [ ] 01.02.01.02 Add `work report validate` subcommand to check REPORT.md has required sections filled
- [ ] 01.02.01.03 Update `work create` to generate REPORT.md template alongside PLAN.md
- [ ] 01.02.01.04 Update CLI help text in `report.ts` to document new subcommands
- [ ] 01.02.01.05 Run `bun run typecheck` and test commands work correctly

When listing tasks, use `work list --tasks --batch "01.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
