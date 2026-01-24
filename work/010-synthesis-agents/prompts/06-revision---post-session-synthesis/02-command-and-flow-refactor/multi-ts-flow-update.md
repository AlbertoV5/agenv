Hello Agent!

You are working on the "Command and Flow Refactor" batch at the "Revision - Post-Session Synthesis" stage of the "Synthesis Agents" workstream.

This is your thread:

"Multi.ts Flow Update" (2)

## Thread Summary
Update multi.ts to use post-session synthesis instead of wrapper.

## Thread Details
- Working packages: `./packages/workstreams`
- In `multi-orchestrator.ts`:
- Update `buildThreadRunCommand()` to use `buildPostSynthesisCommand()` when synthesis is enabled
- Pass synthesis models separately from working models
- In `multi.ts`:
- Keep synthesis agent detection logic
- Update session capture to focus on working agent session
- Synthesis output capture remains the same (reads from temp file)
- The key change: working agent runs directly with TUI, synthesis runs after as a separate headless step
- Remove references to "synthesis wrapping working agent" in comments

Your tasks are:
- [ ] 06.02.02.01 Update `buildThreadRunCommand()` in multi-orchestrator.ts to use `buildPostSynthesisCommand()` when synthesis is enabled
- [ ] 06.02.02.02 Update session capture logic in handleSessionClose to focus on working agent session ID (synthesis session not stored)
- [ ] 06.02.02.03 Remove or update comments referencing "synthesis wrapping working agent" to reflect new post-session approach
- [ ] 06.02.02.04 Verify notifications still fire after synthesis completes (synthesis output available in temp file)
- [ ] 06.02.02.05 Add integration test or manual verification that working agent TUI is visible during execution

When listing tasks, use `work list --tasks --batch "06.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
