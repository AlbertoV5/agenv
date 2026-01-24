Hello Agent!

You are working on the "Synthesis Config Schema" batch at the "Revision - Synthesis Config and Output Storage" stage of the "Synthesis Agents" workstream.

This is your thread:

"Synthesis Types and Schema" (1)

## Thread Summary
Create synthesis configuration types in a dedicated module.

## Thread Details
- Working packages: `./packages/workstreams`
- Create `packages/workstreams/src/lib/synthesis/types.ts`:
```typescript
export interface SynthesisConfig {
  /** Enable/disable synthesis agents globally */
  enabled: boolean
  /** Override default synthesis agent name from agents.yaml */
  agent?: string
  /** Output storage settings */
  output?: SynthesisOutputConfig
}

export interface SynthesisOutputConfig {
  /** Store synthesis output in threads.json (default: true) */
  store_in_threads?: boolean
}

export interface ThreadSynthesis {
  /** The synthesis agent's opencode session ID */
  sessionId: string
  /** The synthesis output text */
  output: string
  /** When synthesis completed */
  completedAt: string
}
```
- Re-export from `synthesis/index.ts`
- Remove `SynthesisConfig` from `notifications/types.ts`
- Update `ThreadMetadata` in `types.ts` to include `synthesis?: ThreadSynthesis`

Your tasks are:
- [ ] 08.01.01.01 Create `packages/workstreams/src/lib/synthesis/types.ts` with `SynthesisConfig` interface (enabled, agent?, output?)
- [ ] 08.01.01.02 Add `SynthesisOutputConfig` interface with `store_in_threads?: boolean` field
- [ ] 08.01.01.03 Add `ThreadSynthesis` interface with `sessionId`, `output`, and `completedAt` fields
- [ ] 08.01.01.04 Create `packages/workstreams/src/lib/synthesis/index.ts` barrel export for the module
- [ ] 08.01.01.05 Remove `SynthesisConfig` from `notifications/types.ts` (move to synthesis module)
- [ ] 08.01.01.06 Update `ThreadMetadata` in `types.ts` to include optional `synthesis?: ThreadSynthesis` field

When listing tasks, use `work list --tasks --batch "08.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
