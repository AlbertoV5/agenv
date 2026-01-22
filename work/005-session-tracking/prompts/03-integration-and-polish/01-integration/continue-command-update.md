Hello Agent!

You are working on the "Integration" batch at the "Integration and Polish" stage of the "Session Tracking" workstream.

This is your thread:

"Continue Command Update" (1)

## Thread Summary
Update `work continue` to be session-aware and offer fix options.

## Thread Details
- Working package: `./packages/workstreams`
- Modify `src/cli/continue.ts`:
1. Check for incomplete/failed threads with session history
2. Display summary: "Found 2 incomplete threads from previous run"
3. Offer options: Continue (skip failed), Fix first, Abort
4. If "Fix first", delegate to `work fix` interactive mode
- Improve status reporting to show session context

Your tasks are:
- [ ] 03.01.01.01 Add check for incomplete/failed threads with session history
- [ ] 03.01.01.02 Display summary of found issues before continuing
- [ ] 03.01.01.03 Add interactive prompt: Continue (skip failed), Fix first, Abort
- [ ] 03.01.01.04 Delegate to work fix when user selects "Fix first" option

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
