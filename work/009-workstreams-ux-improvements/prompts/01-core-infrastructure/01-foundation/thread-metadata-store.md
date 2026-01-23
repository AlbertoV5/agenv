Hello Agent!

You are working on the "Foundation" batch at the "Core Infrastructure" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Thread Metadata Store" (2)

## Thread Summary
Create threads.json to store session history and github issue links, migrating this data out of tasks.json.

## Thread Details
- Working packages: `./packages/workstreams`
- Create `src/lib/threads.ts` with:
- `ThreadMetadata` interface: `{ threadId, sessions: SessionRecord[], githubIssue?, currentSessionId? }`
- `ThreadsStore` class for CRUD operations on threads.json
- `loadThreads(streamPath)`, `saveThreads(streamPath, data)`
- `getThreadMetadata(threadId)`, `updateThreadMetadata(threadId, data)`
- `migrateFromTasksJson(streamPath)` - One-time migration utility
- File locking using `proper-lockfile` (same pattern as tasks.ts)
- Update `src/lib/types.ts`:
- Add `ThreadsJson` schema type
- Add `ThreadMetadata` interface
- Create `tests/threads.test.ts` with:
- CRUD operation tests
- Migration tests
- Concurrent access tests

Your tasks are:
- [ ] 01.01.02.01 Define ThreadMetadata interface and ThreadsJson schema in types.ts
- [ ] 01.01.02.02 Create ThreadsStore class with CRUD operations (loadThreads, saveThreads, getThreadMetadata, updateThreadMetadata)
- [ ] 01.01.02.03 Implement file locking using proper-lockfile for concurrent access safety
- [ ] 01.01.02.04 Create migrateFromTasksJson utility to move sessions and github issues from tasks.json to threads.json
- [ ] 01.01.02.05 Write unit tests for threads.ts including CRUD, migration, and concurrent access tests

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
