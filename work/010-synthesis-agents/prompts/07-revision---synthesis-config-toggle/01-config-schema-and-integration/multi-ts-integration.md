Hello Agent!

You are working on the "Config Schema and Integration" batch at the "Revision - Synthesis Config Toggle" stage of the "Synthesis Agents" workstream.

This is your thread:

"Multi.ts Integration" (2)

## Thread Summary
Update multi.ts to check synthesis enabled before using synthesis flow.

## Thread Details
- Working packages: `./packages/workstreams`
- Import `isSynthesisEnabled` from notifications config
- In multi.ts `main()`:
- Call `isSynthesisEnabled(repoRoot)` before loading synthesis agent
- Only call `getDefaultSynthesisAgent()` if synthesis is enabled
- If synthesis disabled, set `synthesisAgent = null` regardless of agents.yaml
- Update dry run output to show "Synthesis: disabled" when not enabled
- Update console log: "Synthesis enabled: {agent name}" or "Synthesis disabled (config)"
- Ensure backward compatibility: if no notifications.json exists, synthesis defaults to disabled

Your tasks are:
- [ ] 07.01.02.01 Import `isSynthesisEnabled` from `notifications/config.ts` in multi.ts
- [ ] 07.01.02.02 Call `isSynthesisEnabled(repoRoot)` in multi.ts `main()` before loading synthesis agent from agents.yaml
- [ ] 07.01.02.03 Only call `getDefaultSynthesisAgent()` if `isSynthesisEnabled()` returns true, otherwise set `synthesisAgent = null`
- [ ] 07.01.02.04 Update console log to show "Synthesis: disabled (config)" when synthesis is disabled, or "Synthesis enabled: {agent}" when enabled
- [ ] 07.01.02.05 Update dry run output to show synthesis status based on config check

When listing tasks, use `work list --tasks --batch "07.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
