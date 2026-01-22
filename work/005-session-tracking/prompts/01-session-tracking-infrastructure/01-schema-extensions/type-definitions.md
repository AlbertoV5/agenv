Hello Agent!

You are working on the "Schema Extensions" batch at the "Session Tracking Infrastructure" stage of the "Session Tracking" workstream.

This is your thread:

"Type Definitions" (1)

## Thread Summary
Update TypeScript types to include session tracking fields.

## Thread Details
- Working package: `./packages/workstreams`
- Update `src/types/tasks.ts` to add session tracking:
```typescript
interface SessionRecord {
  sessionId: string
  agentName: string
  model: string
  startedAt: string  // ISO timestamp
  completedAt?: string
  status: 'running' | 'completed' | 'failed' | 'interrupted'
  exitCode?: number
}

interface Task {
  // ... existing fields
  sessions?: SessionRecord[]  // Array to track retries
  currentSessionId?: string   // Active session for resume
}
```
- Ensure backwards compatibility with existing tasks.json files

Your tasks are:
- [ ] 01.01.01.01 Create SessionRecord interface with sessionId, agentName, model, startedAt, completedAt, status, and exitCode fields
- [ ] 01.01.01.02 Extend Task interface with sessions array and currentSessionId fields
- [ ] 01.01.01.03 Add SessionStatus type union for 'running' | 'completed' | 'failed' | 'interrupted'
- [ ] 01.01.01.04 Export new types from tasks.ts module

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
