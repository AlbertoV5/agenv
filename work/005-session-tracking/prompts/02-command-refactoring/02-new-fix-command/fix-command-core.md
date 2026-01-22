Hello Agent!

You are working on the "New Fix Command" batch at the "Command Refactoring" stage of the "Session Tracking" workstream.

This is your thread:

"Fix Command Core" (1)

## Thread Summary
Implement core logic for the new `work fix` command.

## Thread Details
- Working package: `./packages/workstreams`
- Create new `src/cli/fix.ts` with resume logic:
1. List threads with incomplete/failed status
2. Show session history for each problematic thread
3. Implement resume logic using stored session ID
4. Implement retry logic (same agent, different model)
5. Implement agent swap logic (different agent entirely)
6. Fall back to `work add-stage` if user wants new stage
- Options:
```
work fix                    # Interactive mode
work fix --thread "01.01.02" --resume    # Resume specific session
work fix --thread "01.01.02" --retry     # Retry with same agent
work fix --thread "01.01.02" --agent X   # Retry with different agent
work fix --new-stage                     # Alias for work add-stage
```

Your tasks are:
- [ ] 02.02.01.01 Create new fix.ts with logic to find incomplete/failed threads
- [ ] 02.02.01.02 Implement --resume flag to resume specific thread session
- [ ] 02.02.01.03 Implement --retry flag to retry thread with same agent
- [ ] 02.02.01.04 Implement --agent flag to retry with different agent
- [ ] 02.02.01.05 Implement --new-stage flag as alias to add-stage command
- [ ] 02.02.01.06 Add opencode session resume integration using stored session ID

When listing tasks, use `work list --tasks --batch "02.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
