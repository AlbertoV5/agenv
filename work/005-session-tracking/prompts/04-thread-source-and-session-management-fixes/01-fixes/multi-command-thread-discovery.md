Hello Agent!

You are working on the "Fixes" batch at the "Thread Source and Session Management Fixes" stage of the "Session Tracking" workstream.

This is your thread:

"Multi Command Thread Discovery" (1)

## Thread Summary
Update `work multi` to read thread list from `tasks.json` instead of PLAN.md.

## Thread Details
- Working package: `./packages/workstreams`
- Modify `src/cli/multi.ts`:
1. Replace `findBatch()` logic that reads from parsed PLAN.md
2. Add function to discover threads from tasks.json by grouping tasks by thread ID
3. Extract unique threads from task IDs matching pattern `SS.BB.TT.*`
4. Get thread metadata (name, agent) from first task in each thread
5. Keep prompt path resolution (still needs stage/batch/thread names for file paths)
- This ensures dynamically added tasks/threads are included in batch execution

Your tasks are:
- [ ] 04.01.01.01 Add function to discover threads from tasks.json by grouping tasks by thread ID
- [ ] 04.01.01.02 Extract unique threads from task IDs matching pattern SS.BB.TT.*
- [ ] 04.01.01.03 Get thread metadata (name, agent) from first task in each thread
- [ ] 04.01.01.04 Replace findBatch() logic in multi.ts to use tasks.json thread discovery
- [ ] 04.01.01.05 Keep prompt path resolution using stage/batch/thread names from task metadata

When listing tasks, use `work list --tasks --batch "04.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
