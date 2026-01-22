Hello Agent!

You are working on the "Session Capture" batch at the "Session Tracking Infrastructure" stage of the "Session Tracking" workstream.

This is your thread:

"Execute Command Integration" (1)

## Thread Summary
Update `work execute` to capture and persist session IDs.

## Thread Details
- Working package: `./packages/workstreams`
- Modify `src/cli/execute.ts`:
1. Before spawning opencode, generate or capture session ID
2. Create SessionRecord with status 'running'
3. Update task in tasks.json with currentSessionId
4. On completion, update SessionRecord status and exitCode
5. Clear currentSessionId, keep session in history array
- Handle both TUI mode and piped mode
- Consider: opencode may need flag to output session ID

Your tasks are:
- [ ] 01.02.01.01 Generate unique session ID before spawning opencode process
- [ ] 01.02.01.02 Create SessionRecord with 'running' status and persist to tasks.json
- [ ] 01.02.01.03 Update SessionRecord on process completion with exit code and status
- [ ] 01.02.01.04 Handle both TUI and piped execution modes for session tracking
- [ ] 01.02.01.05 Clear currentSessionId and move session to history array on completion

When listing tasks, use `work list --tasks --batch "01.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
