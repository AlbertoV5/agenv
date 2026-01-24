Hello Agent!

You are working on the "CLI Command" batch at the "Revision - Planning Session Resume" stage of the "Synthesis Output Parsing" workstream.

This is your thread:

"Create work plan CLI" (1)

## Thread Summary
Create the `work plan` CLI command that opens the planning opencode session for the current workstream.

## Thread Details
- Working package: `./packages/workstreams`
- Create `packages/workstreams/src/cli/plan.ts`:
- Parse CLI args: `--stream` (optional, uses current), `--help`
- Get current workstream if not specified
- Look up planning session ID from index
- If session exists: run `opencode --session <id>`
- If no session: print helpful message about running `work create` first or offer to start a new planning session
- Update `packages/workstreams/src/bin/work.ts` to add the `plan` subcommand
- The command should:
- Support `work plan` (uses current workstream)
- Support `work plan --stream "001-my-stream"` (explicit workstream)
- Print the session ID being resumed for user reference

Your tasks are:
- [ ] 03.02.01.01 Create `packages/workstreams/src/cli/plan.ts` with CLI argument parsing (--stream, --set, --help)
- [ ] 03.02.01.02 Implement session resume logic: if session exists, run `opencode --session <id>`
- [ ] 03.02.01.03 Implement `--set <sessionId>` flag to manually store a planning session ID
- [ ] 03.02.01.04 Add helpful messages when no session exists (suggest using --set or running work create)
- [ ] 03.02.01.05 Update `packages/workstreams/src/bin/work.ts` to add the `plan` subcommand

When listing tasks, use `work list --tasks --batch "03.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
