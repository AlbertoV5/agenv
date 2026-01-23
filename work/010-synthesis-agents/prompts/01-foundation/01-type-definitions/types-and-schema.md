Hello Agent!

You are working on the "Type Definitions" batch at the "Foundation" stage of the "Synthesis Agents" workstream.

This is your thread:

"Types and Schema" (1)

## Thread Summary
Extend type definitions to support synthesis agents in agents.yaml and synthesis output in threads.json.

## Thread Details
- Working packages: `./packages/workstreams`
- Add to types.ts:
- `SynthesisAgentDefinitionYaml` interface (similar to `AgentDefinitionYaml` but for synthesis)
- Extend `AgentsConfigYaml` to include optional `synthesis_agents?: SynthesisAgentDefinitionYaml[]`
- Add `synthesisOutput?: string` field to `ThreadMetadata` for storing synthesis summaries
- Add `workingAgentSessionId?: string` to `ThreadMetadata` to track the working agent's opencode session (distinct from `opencodeSessionId` which tracks the outer/synthesis session)
**Session ID Clarification:**
- `opencodeSessionId`: The opencode session ID of the outermost agent (synthesis agent when enabled, otherwise working agent)
- `workingAgentSessionId`: The opencode session ID of the working agent specifically (only set when synthesis is enabled)
- `currentSessionId`: Internal session tracking ID (not an opencode session)
- For `work fix --resume`, we use `workingAgentSessionId` when available, falling back to `opencodeSessionId`

Your tasks are:
- [ ] 01.01.01.01 Add `SynthesisAgentDefinitionYaml` interface to types.ts with fields matching `AgentDefinitionYaml` structure (name, description, best_for, models)
- [ ] 01.01.01.02 Extend `AgentsConfigYaml` interface to include optional `synthesis_agents?: SynthesisAgentDefinitionYaml[]` field
- [ ] 01.01.01.03 Add `synthesisOutput?: string` field to `ThreadMetadata` interface for storing synthesis summaries
- [ ] 01.01.01.04 Add `workingAgentSessionId?: string` field to `ThreadMetadata` to track the working agent's opencode session separately from the outer synthesis session
- [ ] 01.01.01.05 Add JSDoc comments explaining the distinction between `opencodeSessionId` (outermost agent), `workingAgentSessionId` (inner working agent), and `currentSessionId` (internal tracking)

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
