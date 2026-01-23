Hello Agent!

You are working on the "Error Message Updates" batch at the "Revision - Agent-Friendly Error Messages" stage of the "Workstream Roles" workstream.

This is your thread:

"Agent-Friendly Denial Messages" (1)

## Thread Summary
Update the role denial message generation to produce agent-appropriate error messages that direct agents to ask users for help.

## Thread Details
- Working package: `./packages/workstreams`
- Update `getRoleDenialMessage()` in `src/lib/roles.ts`:
- For AGENT role: "Access denied: This command requires human approval. Please ask the user to run `work <command>` to proceed."
- Do NOT mention WORKSTREAM_ROLE or how to change roles
- Keep the message actionable - tell the agent exactly what to ask for
- Update `COMMAND_PERMISSIONS` denial messages to be agent-friendly:
- `approve`: "Approval requires human oversight. Ask the user to run `work approve <target>`"
- `start`: "Starting a workstream requires human approval. Ask the user to run `work start`"
- `complete`: "Completing a workstream requires human approval. Ask the user to run `work complete`"
- Add tests to verify error messages don't leak role-changing instructions

Your tasks are:
- [ ] 04.01.01.01 Update `getRoleDenialMessage()` in `packages/workstreams/src/lib/roles.ts` to return agent-friendly messages that say "ask the user to run X" instead of mentioning WORKSTREAM_ROLE
- [ ] 04.01.01.02 Update `COMMAND_PERMISSIONS` denial messages for `approve`, `start`, and `complete` to be agent-friendly (e.g., "Ask the user to run `work approve <target>`")
- [ ] 04.01.01.03 Remove any mention of WORKSTREAM_ROLE environment variable from agent-facing error messages
- [ ] 04.01.01.04 Add test in `packages/workstreams/tests/roles.test.ts` to verify denial messages don't contain "WORKSTREAM_ROLE" or instructions on how to change roles
- [ ] 04.01.01.05 Verify the updated error messages work correctly by running `work approve` without USER role

When listing tasks, use `work list --tasks --batch "04.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
