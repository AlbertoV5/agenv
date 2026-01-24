Hello Agent!

You are working on the "Parser, Skill, and Session Capacity" batch at the "Foundation" stage of the "Synthesis Agents" workstream.

This is your thread:

"Double Session Listing" (3)

## Thread Summary
Double the session listing capacity from 10 to 20 to handle synthesis agent sessions alongside working agent sessions.

## Thread Details
- Working packages: `./packages/workstreams`
- In opencode.ts, find `--max-count 10` in `buildRunCommand()` and `buildRetryRunCommand()`
- Change to `--max-count 20`
- This ensures we can find the working agent session even when multiple synthesis sessions exist

Your tasks are:
- [ ] 01.02.03.01 Locate `--max-count 10` in `buildRunCommand()` function in opencode.ts and change to `--max-count 20`
- [ ] 01.02.03.02 Locate `--max-count 10` in `buildRetryRunCommand()` function in opencode.ts and change to `--max-count 20`
- [ ] 01.02.03.03 Run existing tests to verify the changes don't break session listing functionality

When listing tasks, use `work list --tasks --batch "01.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
