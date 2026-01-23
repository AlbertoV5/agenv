Hello Agent!

You are working on the "Router and Command Updates" batch at the "CLI Integration" stage of the "Workstream Roles" workstream.

This is your thread:

"Start and Complete Commands" (3)

## Thread Summary
Update `start` and `complete` commands with role enforcement and role-aware help.

## Thread Details
- Working package: `./packages/workstreams`
- Update `src/cli/start.ts`:
- Add role check at entry
- Update help text with role note
- Update `src/cli/complete.ts`:
- Add role check at entry
- Update help text with role note
- Add tests for both commands

Your tasks are:
- [ ] 02.01.03.01 Update `packages/workstreams/src/cli/start.ts` to import role utilities and add role check at entry
- [ ] 02.01.03.02 Update `start.ts` `printHelp()` to include USER role requirement note
- [ ] 02.01.03.03 Update `packages/workstreams/src/cli/complete.ts` to import role utilities and add role check at entry
- [ ] 02.01.03.04 Update `complete.ts` `printHelp()` to include USER role requirement note

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
