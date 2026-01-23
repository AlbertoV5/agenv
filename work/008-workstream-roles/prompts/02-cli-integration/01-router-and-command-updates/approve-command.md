Hello Agent!

You are working on the "Router and Command Updates" batch at the "CLI Integration" stage of the "Workstream Roles" workstream.

This is your thread:

"Approve Command" (2)

## Thread Summary
Update the `approve` command with role enforcement and role-aware help.

## Thread Details
- Working package: `./packages/workstreams`
- Update `src/cli/approve.ts`:
- Add secondary role check at command entry for detailed error
- Update `printHelp()` to include role requirement note using `getRoleHelpNote` or hardcoded text
- Add test for role enforcement

Your tasks are:
- [ ] 02.01.02.01 Update `packages/workstreams/src/cli/approve.ts` to import role utilities
- [ ] 02.01.02.02 Add role check at command entry using `canExecuteCommand("approve")` with early exit if denied
- [ ] 02.01.02.03 Update `printHelp()` to include "Requires: USER role" note in header and explanation

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
