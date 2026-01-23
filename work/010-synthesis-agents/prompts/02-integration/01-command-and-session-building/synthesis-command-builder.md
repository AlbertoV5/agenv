Hello Agent!

You are working on the "Command and Session Building" batch at the "Integration" stage of the "Synthesis Agents" workstream.

This is your thread:

"Synthesis Command Builder" (1)

## Thread Summary
Create function to build the synthesis agent command that wraps the working agent execution.

## Thread Details
- Working packages: `./packages/workstreams`
- Add `buildSynthesisRunCommand()` to opencode.ts that wraps `buildRetryRunCommand()` internally
- The synthesis command:
1. Generates unique tracking IDs for both synthesis and working agents
2. Runs opencode with the synthesis agent's model
3. The prompt tells synthesis agent to run the working agent command
4. After working agent completes, synthesis agent summarizes
5. Synthesis output is written to a temp file for capture
- The working agent's original command (from buildRetryRunCommand) becomes part of the synthesis prompt
- Track both session IDs in separate temp files
- Use streamId prefix for temp files: `/tmp/workstream-{streamId}-{threadId}-synthesis.txt`
**Error Handling:**
- If synthesis agent fails, still capture working agent session ID if available
- If working agent crashes, synthesis agent should note this in summary
- If synthesis output file is empty/missing, log warning but don't fail the thread

Your tasks are:
- [ ] 02.01.01.01 Add `getSynthesisOutputPath(streamId: string, threadId: string)` helper function returning `/tmp/workstream-{streamId}-{threadId}-synthesis.txt`
- [ ] 02.01.01.02 Create `buildSynthesisRunCommand()` function that internally calls `buildRetryRunCommand()` and wraps it with synthesis agent execution
- [ ] 02.01.01.03 Generate unique tracking IDs for both synthesis and working agents within the command builder
- [ ] 02.01.01.04 Construct the synthesis prompt that instructs the synthesis agent to run the working agent command, wait for completion, then summarize
- [ ] 02.01.01.05 Add error handling for synthesis agent failure that still captures working agent session ID if available

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
