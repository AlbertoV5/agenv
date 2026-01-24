Hello Agent!

You are working on the "Multi Integration" batch at the "Integration" stage of the "Synthesis Agents" workstream.

This is your thread:

"Synthesis Output Storage" (2)

## Thread Summary
Capture and store synthesis output in threads.json after thread completion.

## Thread Details
- Working packages: `./packages/workstreams`
- In multi.ts handleSessionClose():
1. Read synthesis output from temp file (uses streamId prefix: `/tmp/workstream-{streamId}-{threadId}-synthesis.txt`)
2. Call updateThreadMetadataLocked with synthesisOutput
3. Log warning if synthesis output is empty/missing but continue normally
- Add temp file path helper: `getSynthesisOutputPath(streamId, threadId)` in opencode.ts
- Add cleanup for synthesis output temp files in marker-polling.ts
**Error Handling:**
- Missing synthesis file: Log warning, set synthesisOutput to null
- Empty synthesis file: Log warning, set synthesisOutput to empty string
- Malformed content: Store as-is (synthesis agent responsible for format)

Your tasks are:
- [ ] 02.02.02.01 Modify `handleSessionClose()` in multi.ts to read synthesis output from temp file using `getSynthesisOutputPath()`
- [ ] 02.02.02.02 Call `updateThreadMetadataLocked()` with synthesisOutput field after reading the temp file
- [ ] 02.02.02.03 Add warning logging for empty or missing synthesis output files without failing the thread
- [ ] 02.02.02.04 Add cleanup logic for synthesis output temp files in marker-polling.ts

When listing tasks, use `work list --tasks --batch "02.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
