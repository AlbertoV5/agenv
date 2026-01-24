Hello Agent!

You are working on the "Threads.json Synthesis Output" batch at the "Revision - Synthesis Config and Output Storage" stage of the "Synthesis Agents" workstream.

This is your thread:

"Thread Synthesis Storage" (1)

## Thread Summary
Add functions to store and retrieve synthesis output in threads.json.

## Thread Details
- Working packages: `./packages/workstreams`
- Update `packages/workstreams/src/lib/threads.ts`:
- `setSynthesisOutput(repoRoot, streamId, threadId, synthesis: ThreadSynthesis): void`
- `getSynthesisOutput(repoRoot, streamId, threadId): ThreadSynthesis | null`
- The `setSynthesisOutput` function should:
1. Load existing threads.json
2. Find the matching thread
3. Set/update the `synthesis` field
4. Write back with proper locking
- Handle missing thread gracefully (log warning)
- Add unit tests for synthesis output storage/retrieval
- Ensure backward compatibility: old threads.json without synthesis field still works

Your tasks are:
- [ ] 08.02.01.01 Add `setSynthesisOutput(repoRoot, streamId, threadId, synthesis: ThreadSynthesis)` to `threads.ts`
- [ ] 08.02.01.02 Add `getSynthesisOutput(repoRoot, streamId, threadId): ThreadSynthesis | null` to `threads.ts`
- [ ] 08.02.01.03 Ensure `setSynthesisOutput` uses proper file locking (consistent with other thread functions)
- [ ] 08.02.01.04 Handle missing thread gracefully in both functions (log warning, return null for get)
- [ ] 08.02.01.05 Ensure backward compatibility: old threads.json without synthesis field still loads correctly
- [ ] 08.02.01.06 Add unit tests for synthesis output storage and retrieval

When listing tasks, use `work list --tasks --batch "08.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
