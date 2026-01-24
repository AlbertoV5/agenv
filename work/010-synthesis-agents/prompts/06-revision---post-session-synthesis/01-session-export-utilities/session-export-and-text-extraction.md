Hello Agent!

You are working on the "Session Export Utilities" batch at the "Revision - Post-Session Synthesis" stage of the "Synthesis Agents" workstream.

This is your thread:

"Session Export and Text Extraction" (1)

## Thread Summary
Create functions to export opencode sessions and extract text messages for synthesis context.

## Thread Details
- Working packages: `./packages/workstreams`
- Create `session-export.ts` in `packages/workstreams/src/lib/`:
- `exportSession(sessionId: string): Promise<SessionExport>` - Runs `opencode export <id>` and parses JSON
- `extractTextMessages(exportData: SessionExport): string` - Extracts only assistant text parts
- `SessionExport` interface matching the export JSON structure (info, messages, parts)
- `MessagePart` interface with type discrimination for text/tool/step-start/step-finish/patch
- Focus on extracting `type: "text"` parts from assistant messages only
- Concatenate text parts in order with newlines between messages
- Handle edge cases: empty sessions, sessions with no text parts, malformed JSON
**Export JSON Structure (from t.json analysis):**
```typescript
interface SessionExport {
  info: { id: string; title: string; summary: { additions: number; deletions: number; files: number } }
  messages: Array<{
    info: { id: string; role: "user" | "assistant"; /* ... */ }
    parts: Array<
      | { type: "text"; text: string }
      | { type: "tool"; tool: string; state: { input: object; output: string } }
      | { type: "step-start" | "step-finish" | "patch"; /* ... */ }
    >
  }>
}
```

Your tasks are:
- [ ] 06.01.01.01 Create `session-export.ts` file in `packages/workstreams/src/lib/` with `SessionExport` interface matching opencode export JSON structure (info, messages, parts)
- [ ] 06.01.01.02 Add `MessagePart` type with discriminated union for text, tool, step-start, step-finish, and patch part types
- [ ] 06.01.01.03 Implement `exportSession(sessionId: string): Promise<SessionExport>` function that runs `opencode export <id>` and parses the JSON output
- [ ] 06.01.01.04 Implement `extractTextMessages(exportData: SessionExport): string` function that extracts only `type: "text"` parts from assistant messages, concatenating with newlines
- [ ] 06.01.01.05 Handle edge cases in extractTextMessages: empty sessions, sessions with no text parts, malformed JSON - return empty string on failure
- [ ] 06.01.01.06 Add unit tests for session export and text extraction functions

When listing tasks, use `work list --tasks --batch "06.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
