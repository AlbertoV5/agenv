Hello Agent!

You are working on the "Command Audit & Docs" batch at the "Skill Refinement & Cleanup" stage of the "Workstream Review Standardization" workstream.

This is your thread:

"Command Consolidation" (1)

## Thread Summary
Identify and consolidate redundant report-related commands.

## Thread Details
- Working packages: `packages/workstreams/src/cli`
- Audit: `work report`, `work export`, `work metrics`, `work changelog`
- Determine which to keep/merge/deprecate
- `work report` - Keep (main report command)
- `work export` - Keep (different purpose: CSV/JSON export)
- `work metrics` - Consider merging into report
- `work changelog` - Keep (useful for git history)
- Document decisions and update help text

Your tasks are:
- [ ] 04.02.01.01 Audit `work report`, `work export`, `work metrics`, `work changelog` for overlapping functionality
- [ ] 04.02.01.02 Document purpose of each command and decide: keep, merge, or deprecate
- [ ] 04.02.01.03 If merging, update the surviving command with combined functionality
- [ ] 04.02.01.04 Update all CLI --help text to be accurate and consistent
- [ ] 04.02.01.05 Run `bun run typecheck` to verify changes

When listing tasks, use `work list --tasks --batch "04.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
