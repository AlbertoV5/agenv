Hello Agent!

You are working on the "Multi Integration" batch at the "Integration" stage of the "Synthesis Agents" workstream.

This is your thread:

"Multi Orchestrator Update" (1)

## Thread Summary
Update multi.ts and multi-orchestrator.ts to use synthesis agents when available.

## Thread Details
- Working packages: `./packages/workstreams`
- In multi.ts main():
1. Load synthesis agent config (getDefaultSynthesisAgent)
2. If synthesis agent exists, use buildSynthesisRunCommand instead of buildRetryRunCommand
3. Pass both working agent models and synthesis agent model to command builder
- In collectThreadInfoFromTasks():
- Add optional synthesisAgentName and synthesisModels to ThreadInfo
- Update setupTmuxSession to handle synthesis commands
- Ensure session close handler captures working agent session ID for threads.json

Your tasks are:
- [ ] 02.02.01.01 Load synthesis agent config using `getDefaultSynthesisAgent()` in multi.ts main function
- [ ] 02.02.01.02 Add conditional logic to use `buildSynthesisRunCommand()` instead of `buildRetryRunCommand()` when synthesis agent exists
- [ ] 02.02.01.03 Extend `ThreadInfo` interface in collectThreadInfoFromTasks to include optional `synthesisAgentName` and `synthesisModels` fields
- [ ] 02.02.01.04 Update `setupTmuxSession()` to handle synthesis-wrapped commands
- [ ] 02.02.01.05 Verify session close handler correctly stores working agent session ID to threads.json

When listing tasks, use `work list --tasks --batch "02.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
