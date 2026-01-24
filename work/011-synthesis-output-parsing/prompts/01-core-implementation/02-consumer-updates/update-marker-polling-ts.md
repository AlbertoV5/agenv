Hello Agent!

You are working on the "Consumer Updates" batch at the "Core Implementation" stage of the "Synthesis Output Parsing" workstream.

This is your thread:

"Update marker-polling.ts" (2)

## Thread Summary
Update `pollMarkerFiles()` in `marker-polling.ts` to use the new JSONL parser for reading synthesis output.

## Thread Details
- Working package: `./packages/workstreams`
- Modify `packages/workstreams/src/lib/marker-polling.ts`:
- Import `parseSynthesisOutputFile` from `./synthesis/output.ts`
- Import `getSynthesisLogPath` from `./opencode.ts`
- In `pollMarkerFiles()` (around line 135-146):
  - Change from reading `.txt` file to parsing `.json` file
  - Use `parseSynthesisOutputFile()` to get synthesis text
- In `cleanupSynthesisFiles()`:
  - Add cleanup for `.log` files
  - Update to clean up `.json` files instead of `.txt` files
- Add `getSynthesisJsonPath` helper or use the existing path with `.json` extension

Your tasks are:
- [ ] 01.02.02.01 Import `parseSynthesisOutputFile` from synthesis/output.ts and `getSynthesisLogPath` from opencode.ts
- [ ] 01.02.02.02 Update `pollMarkerFiles()` to parse `.json` file instead of reading `.txt` file
- [ ] 01.02.02.03 Update `cleanupSynthesisFiles()` to clean up `.json` and `.log` files instead of `.txt`

When listing tasks, use `work list --tasks --batch "01.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
