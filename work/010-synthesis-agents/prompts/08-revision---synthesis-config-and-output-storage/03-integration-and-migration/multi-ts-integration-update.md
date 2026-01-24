Hello Agent!

You are working on the "Integration and Migration" batch at the "Revision - Synthesis Config and Output Storage" stage of the "Synthesis Agents" workstream.

This is your thread:

"Multi.ts Integration Update" (1)

## Thread Summary
Update multi.ts to use the new synthesis config module.

## Thread Details
- Working packages: `./packages/workstreams`
- In `multi.ts`:
- Replace `import { isSynthesisEnabled } from './notifications/config'` with synthesis module
- Update synthesis agent detection to use `getSynthesisAgentOverride()` if set
- After synthesis completes, call `setSynthesisOutput()` to store in threads.json
- In `handleSessionClose()`:
- Read synthesis output from temp file (existing behavior)
- Call `setSynthesisOutput(repoRoot, streamId, threadId, { sessionId, output, completedAt })`
- Update dry run output to show synthesis config source: "Synthesis config: work/synthesis.json"
- Update console logs for new config location

Your tasks are:
- [ ] 08.03.01.01 Replace import of `isSynthesisEnabled` from `notifications/config` with import from `synthesis/config`
- [ ] 08.03.01.02 Use `getSynthesisAgentOverride(repoRoot)` to check for agent name override in synthesis.json
- [ ] 08.03.01.03 In `handleSessionClose()`, call `setSynthesisOutput()` after reading synthesis from temp file
- [ ] 08.03.01.04 Pass synthesis sessionId, output text, and completedAt timestamp to `setSynthesisOutput()`
- [ ] 08.03.01.05 Update dry run output to show synthesis config source: "Synthesis config: work/synthesis.json"
- [ ] 08.03.01.06 Update console logs to reflect new config location

When listing tasks, use `work list --tasks --batch "08.03"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
