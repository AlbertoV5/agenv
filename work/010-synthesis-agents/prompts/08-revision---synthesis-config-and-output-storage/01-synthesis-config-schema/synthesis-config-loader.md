Hello Agent!

You are working on the "Synthesis Config Schema" batch at the "Revision - Synthesis Config and Output Storage" stage of the "Synthesis Agents" workstream.

This is your thread:

"Synthesis Config Loader" (2)

## Thread Summary
Create config loader for synthesis.json.

## Thread Details
- Working packages: `./packages/workstreams`
- Create `packages/workstreams/src/lib/synthesis/config.ts`:
- `getDefaultSynthesisConfig(): SynthesisConfig` - Returns `{ enabled: false }`
- `loadSynthesisConfig(repoRoot: string): SynthesisConfig` - Loads from `work/synthesis.json`
- `isSynthesisEnabled(repoRoot: string): boolean` - Returns `config.enabled`
- `getSynthesisAgentOverride(repoRoot: string): string | undefined` - Returns `config.agent`
- Handle missing file: return default config (synthesis disabled)
- Handle malformed JSON: log warning, return default config
- Add unit tests for config loading
- Remove synthesis-related code from `notifications/config.ts`

Your tasks are:
- [ ] 08.01.02.01 Create `packages/workstreams/src/lib/synthesis/config.ts` with `getDefaultSynthesisConfig()` returning `{ enabled: false }`
- [ ] 08.01.02.02 Add `loadSynthesisConfig(repoRoot: string): SynthesisConfig` that reads from `work/synthesis.json`
- [ ] 08.01.02.03 Add `isSynthesisEnabled(repoRoot: string): boolean` that returns `config.enabled`
- [ ] 08.01.02.04 Add `getSynthesisAgentOverride(repoRoot: string): string | undefined` that returns `config.agent`
- [ ] 08.01.02.05 Handle missing file gracefully (return default config, synthesis disabled)
- [ ] 08.01.02.06 Handle malformed JSON (log warning, return default config)
- [ ] 08.01.02.07 Add unit tests for config loading, isSynthesisEnabled, and error cases

When listing tasks, use `work list --tasks --batch "08.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
