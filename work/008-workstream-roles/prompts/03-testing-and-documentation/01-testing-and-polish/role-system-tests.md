Hello Agent!

You are working on the "Testing and Polish" batch at the "Testing and Documentation" stage of the "Workstream Roles" workstream.

This is your thread:

"Role System Tests" (1)

## Thread Summary
Write comprehensive tests for the role system.

## Thread Details
- Working package: `./packages/workstreams`
- Create `tests/roles.test.ts` with tests for:
- `getCurrentRole()` with various env values
- `canExecuteCommand()` for USER-only and shared commands
- `getRoleDenialMessage()` formatting
- Command permissions registry completeness
- Create `tests/cli-roles.test.ts` for CLI integration tests:
- Test that approve/start/complete reject when WORKSTREAM_ROLE=AGENT or unset (default)
- Test that they succeed when WORKSTREAM_ROLE=USER
- Test help output filtering

Your tasks are:
- [ ] 03.01.01.01 Write integration tests in `packages/workstreams/tests/cli-roles.test.ts` for CLI role enforcement
- [ ] 03.01.01.02 Test that `work approve` rejects with WORKSTREAM_ROLE=AGENT or unset, succeeds with WORKSTREAM_ROLE=USER
- [ ] 03.01.01.03 Test that `work start` and `work complete` follow the same role restrictions
- [ ] 03.01.01.04 Test that help output correctly filters commands based on role
- [ ] 03.01.01.05 Verify all tests pass with `bun run test` in packages/workstreams

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
