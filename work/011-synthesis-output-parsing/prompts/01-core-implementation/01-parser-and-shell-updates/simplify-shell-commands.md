Hello Agent!

You are working on the "Parser and Shell Updates" batch at the "Core Implementation" stage of the "Synthesis Output Parsing" workstream.

This is your thread:

"Simplify Shell Commands" (2)

## Thread Summary
Update `opencode.ts` to remove jq-based parsing and add path helper functions for the new file structure.

## Thread Details
- Working package: `./packages/workstreams`
- Modify `packages/workstreams/src/lib/opencode.ts`:
- Add `getSynthesisLogPath(streamId, threadId)` function returning `/tmp/workstream-{streamId}-{threadId}-synthesis.log`
- Update `buildPostSynthesisCommand()` to:
  - Remove the jq extraction code (lines ~862-868)
  - Remove the `.txt` output file (no longer needed)
  - Keep the `.json` file as the raw JSONL output
  - Add simple logging: echo timestamp and file size to log path
- The completion marker should still be written after synthesis finishes
- The `.json` file will now contain raw JSONL that TypeScript parses

Your tasks are:
- [ ] 01.01.02.01 Add `getSynthesisLogPath(streamId, threadId)` function to `opencode.ts`
- [ ] 01.01.02.02 Remove jq extraction code from `buildPostSynthesisCommand()` (lines ~862-868)
- [ ] 01.01.02.03 Remove `.txt` output file references, keep only `.json` for raw JSONL
- [ ] 01.01.02.04 Add shell logging (timestamp, file size) to the synthesis log path

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
