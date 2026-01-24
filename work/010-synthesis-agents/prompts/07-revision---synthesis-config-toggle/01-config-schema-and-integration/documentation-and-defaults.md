Hello Agent!

You are working on the "Config Schema and Integration" batch at the "Revision - Synthesis Config Toggle" stage of the "Synthesis Agents" workstream.

This is your thread:

"Documentation and Defaults" (3)

## Thread Summary
Update documentation and default config files.

## Thread Details
- Working packages: `./packages/workstreams`
- Update `work init` to create notifications.json with synthesis section:
```json
{
  "enabled": true,
  "synthesis": {
    "enabled": false
  },
  "providers": { ... },
  "events": { ... }
}
```
- Update `work notifications` command to show synthesis status
- Add synthesis configuration section to README
- Update JSDoc comments for new functions and interfaces

Your tasks are:
- [ ] 07.01.03.01 Update `work init` command to create notifications.json with `synthesis: { enabled: false }` section
- [ ] 07.01.03.02 Update `work notifications` command output to display synthesis configuration status
- [ ] 07.01.03.03 Add synthesis configuration section to packages/workstreams/README.md explaining the enable toggle
- [ ] 07.01.03.04 Add JSDoc comments to `SynthesisConfig` interface and `isSynthesisEnabled()` function
- [ ] 07.01.03.05 Update root README.md with note about synthesis being opt-in via notifications.json

When listing tasks, use `work list --tasks --batch "07.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
