Hello Agent!

You are working on the "Config Schema and Integration" batch at the "Revision - Synthesis Config Toggle" stage of the "Synthesis Agents" workstream.

This is your thread:

"Synthesis Config Schema" (1)

## Thread Summary
Add synthesis configuration to NotificationsConfig and create helper function.

## Thread Details
- Working packages: `./packages/workstreams`
- Add `SynthesisConfig` interface to `notifications/types.ts`:
```typescript
interface SynthesisConfig {
  enabled: boolean
  agent?: string  // Optional: override default synthesis agent name
}
```
- Add `synthesis?: SynthesisConfig` field to `NotificationsConfig` interface
- Update `getDefaultNotificationsConfig()` to include `synthesis: { enabled: false }`
- Update `loadNotificationsConfig()` to merge synthesis config with defaults
- Create `isSynthesisEnabled(repoRoot: string): boolean` function in `notifications/config.ts`:
- Loads notifications config
- Returns `config.synthesis?.enabled ?? false`
- Add unit tests for synthesis config loading and isSynthesisEnabled

Your tasks are:
- [ ] 07.01.01.01 Add `SynthesisConfig` interface to `notifications/types.ts` with `enabled: boolean` and optional `agent?: string` fields
- [ ] 07.01.01.02 Add `synthesis?: SynthesisConfig` field to existing `NotificationsConfig` interface
- [ ] 07.01.01.03 Update `getDefaultNotificationsConfig()` in `notifications/config.ts` to include `synthesis: { enabled: false }`
- [ ] 07.01.01.04 Update `loadNotificationsConfig()` to merge synthesis config with defaults (handle missing synthesis section)
- [ ] 07.01.01.05 Create `isSynthesisEnabled(repoRoot: string): boolean` function that loads config and returns `config.synthesis?.enabled ?? false`
- [ ] 07.01.01.06 Add unit tests for synthesis config loading and `isSynthesisEnabled()` function

When listing tasks, use `work list --tasks --batch "07.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
