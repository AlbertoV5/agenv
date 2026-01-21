Hello Agent!

You are working on the "Metadata Storage" batch at the "Issue Management" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Add github field to StreamMetadata interface.

## Thread Details
Modify `src/lib/types.ts`:
```typescript
interface StreamMetadata {
  // ... existing fields ...
  github?: {
    branch?: string
  }
}
```
Update `src/lib/index.ts`:
- Handle github field in stream operations
- Add `setStreamGitHubMeta(repoRoot, streamId, meta)`

Your tasks are:
- [ ] 02.02.02.01 Add github optional field to StreamMetadata interface in types.ts
- [ ] 02.02.02.02 Add setStreamGitHubMeta helper to index.ts
- [ ] 02.02.02.03 Ensure github field is preserved in stream operations

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-2/02-metadata-storage/stream-metadata-extension/`

Use the `implementing-workstream-plans` skill.
When listing tasks, use `work list --tasks --batch "02.02"` to see tasks for this batch only.
