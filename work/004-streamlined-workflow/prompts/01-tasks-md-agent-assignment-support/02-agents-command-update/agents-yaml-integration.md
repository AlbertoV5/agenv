Hello Agent!

You are working on the "Agents Command Update" batch at the "TASKS.md Agent Assignment Support" stage of the "Streamlined Workflow" workstream.

This is your thread:

"Agents YAML Integration" (1)

## Thread Summary
Modify `work agents` CLI to read from agents.yaml and provide formatted output.

## Thread Details
- Working package: `./packages/workstreams/src/cli/agents.ts`
- Remove AGENTS.md reading logic
- Read from agents.yaml using existing `loadAgentsYaml()` function
- Output format should be suitable for planner agents:
```
Available Agents:

- backend-expert
  Description: Specializes in database schema design...
  Best for: Database setup, migration scripts...
  Models: anthropic/claude-opus, anthropic/claude-sonnet-4
```
- Add `--json` flag for machine-readable output

Your tasks are:
- [ ] 01.02.01.01 Update work agents CLI to use loadAgentsYaml() instead of loadAgents()
- [ ] 01.02.01.02 Format agent output with name, description, best_for, and models list
- [ ] 01.02.01.03 Add --json flag for machine-readable output
- [ ] 01.02.01.04 Handle missing agents.yaml gracefully with helpful error message
- [ ] 01.02.01.05 Add unit tests for new agents command output

When listing tasks, use `work list --tasks --batch "01.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
