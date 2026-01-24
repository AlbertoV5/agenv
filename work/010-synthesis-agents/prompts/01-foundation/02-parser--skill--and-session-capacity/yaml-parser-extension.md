Hello Agent!

You are working on the "Parser, Skill, and Session Capacity" batch at the "Foundation" stage of the "Synthesis Agents" workstream.

This is your thread:

"YAML Parser Extension" (1)

## Thread Summary
Extend agents-yaml.ts to parse the new `synthesis_agents` section.

## Thread Details
- Working packages: `./packages/workstreams`
- Extend `parseAgentsYaml()` to handle `synthesis_agents` array
- Add `getSynthesisAgent()` function to get a synthesis agent by name
- Add `getDefaultSynthesisAgent()` to get first synthesis agent or null
- Validate synthesis agent models same as regular agents
**Example agents.yaml schema:**
```yaml
agents:
  - name: default
    description: General-purpose implementation agent.
    best_for: Standard development tasks.
    models: [anthropic/claude-sonnet-4-5]

synthesis_agents:
  - name: batch-synthesizer
    description: Summarizes working agent outputs after completion.
    best_for: Generating concise summaries of completed work.
    models: [anthropic/claude-sonnet-4-5]
```

Your tasks are:
- [ ] 01.02.01.01 Extend `parseAgentsYaml()` function in agents-yaml.ts to parse the `synthesis_agents` array from agents.yaml
- [ ] 01.02.01.02 Add `getSynthesisAgent(name: string)` function to retrieve a synthesis agent by name, returning null if not found
- [ ] 01.02.01.03 Add `getDefaultSynthesisAgent()` function to return the first synthesis agent from config or null if none defined
- [ ] 01.02.01.04 Apply the same model validation logic used for regular agents to synthesis agent models

When listing tasks, use `work list --tasks --batch "01.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
