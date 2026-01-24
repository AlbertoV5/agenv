Hello Agent!

You are working on the "Parser and Shell Updates" batch at the "Core Implementation" stage of the "Synthesis Output Parsing" workstream.

This is your thread:

"Create JSONL Parser Module" (1)

## Thread Summary
Create the new `synthesis/output.ts` module that parses JSONL output from `opencode run --format json`.

## Thread Details
- Working package: `./packages/workstreams`
- Create `packages/workstreams/src/lib/synthesis/output.ts` with:
- Type definitions for JSONL events (`JsonlTextEvent`, `JsonlStepEvent`, etc.)
- `parseSynthesisJsonl(content: string): SynthesisParseResult` - Parse JSONL string
- `parseSynthesisOutputFile(filePath: string, logPath?: string): SynthesisParseResult` - Read and parse file with logging
- `SynthesisParseResult` interface with `text`, `logs`, and `success` fields
- Update `packages/workstreams/src/lib/synthesis/index.ts` to export new functions
- JSONL format to parse:
```jsonl
{"type":"step_start",...}
{"type":"text","part":{"text":"THE_SYNTHESIS_OUTPUT"}}
{"type":"step_finish",...}
```
- Extract all `type: "text"` events and concatenate their `.part.text` values

Your tasks are:
- [ ] 01.01.01.01 Create `packages/workstreams/src/lib/synthesis/output.ts` with JSONL parsing types and functions
- [ ] 01.01.01.02 Implement `parseSynthesisJsonl(content: string)` to extract text from JSONL lines with `type: "text"`
- [ ] 01.01.01.03 Implement `parseSynthesisOutputFile(filePath, logPath?)` to read file and parse with debug logging
- [ ] 01.01.01.04 Update `packages/workstreams/src/lib/synthesis/index.ts` to export new functions

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
