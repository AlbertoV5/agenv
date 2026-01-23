Hello Agent!

You are working on the "Finalization" batch at the "Documentation & Polish" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Cleanup & Deprecation" (2)

## Thread Summary
Add deprecation warnings and clean up transitional code.

## Thread Details
- Working packages: `./packages/workstreams`
- Add console warning when reading sessions from tasks.json (deprecated location)
- Add `@deprecated` JSDoc annotations to old session fields in Task interface
- Clean up any temporary migration code
- Ensure all tests pass with new code paths
- Run full test suite: `bun run test`
- Run typecheck: `bun run typecheck`
*Last updated: 2026-01-23*

Your tasks are:
- [ ] 04.01.02.01 Add console warning when reading sessions from deprecated tasks.json location
- [ ] 04.01.02.02 Add @deprecated JSDoc annotations to old session fields in Task interface
- [ ] 04.01.02.03 Clean up any temporary migration code paths
- [ ] 04.01.02.04 Run full test suite (bun run test) and typecheck (bun run typecheck) to verify no regressions

When listing tasks, use `work list --tasks --batch "04.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
