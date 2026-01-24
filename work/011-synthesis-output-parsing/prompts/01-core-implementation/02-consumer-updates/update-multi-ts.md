Hello Agent!

You are working on the "Consumer Updates" batch at the "Core Implementation" stage of the "Synthesis Output Parsing" workstream.

This is your thread:

"Update multi.ts" (1)

## Thread Summary
Update `handleSessionClose()` in `multi.ts` to use the new JSONL parser instead of reading the `.txt` file directly.

## Thread Details
- Working package: `./packages/workstreams`
- Modify `packages/workstreams/src/cli/multi.ts`:
- Import `parseSynthesisOutputFile` from `../lib/synthesis/output.ts`
- Import `getSynthesisLogPath` from `../lib/opencode.ts`
- In `handleSessionClose()` (around line 450-464):
  - Replace `getSynthesisOutputPath` with reading the `.json` file (JSONL)
  - Call `parseSynthesisOutputFile(jsonPath, logPath)` to parse
  - Use `parseResult.text` as the synthesis output
  - Log warning if `parseResult.success` is false
- Update cleanup to handle new file paths

Your tasks are:
- [ ] 01.02.01.01 Import `parseSynthesisOutputFile` from synthesis/output.ts and `getSynthesisLogPath` from opencode.ts
- [ ] 01.02.01.02 Update `handleSessionClose()` to use `parseSynthesisOutputFile()` instead of reading `.txt` directly
- [ ] 01.02.01.03 Add warning log when `parseResult.success` is false, referencing the log file path

When listing tasks, use `work list --tasks --batch "01.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
