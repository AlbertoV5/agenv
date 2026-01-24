Hello Agent!

You are working on the "CLI Command" batch at the "Revision - Planning Session Resume" stage of the "Synthesis Output Parsing" workstream.

This is your thread:

"Update work create to capture session" (2)

## Thread Summary
Update `work create` to capture the opencode session ID after the planning agent completes, so it can be resumed later with `work plan`.

## Thread Details
- Working package: `./packages/workstreams`
- Note: This may require changes to how `work create` invokes the planning agent
- Options to investigate:
1. If `work create` already runs opencode, add tracking ID to title and capture session after
2. If `work create` doesn't run opencode yet, this thread may just document the manual flow
- For now, implement a way to manually set the planning session: `work plan --set <sessionId>`
- This allows users to run `work plan --set ses_xxx` after creating a workstream
- The auto-capture can be added later when we understand the full `work create` flow

Your tasks are:
- [ ] 03.02.02.01 Investigate how `work create` currently works and whether it invokes opencode
- [ ] 03.02.02.02 Document the manual flow for capturing planning session (user runs opencode, then `work plan --set`)
- [ ] 03.02.02.03 Add a note in `work plan --help` about how to capture the planning session ID

When listing tasks, use `work list --tasks --batch "03.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
