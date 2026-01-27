Hello Agent!

You are working on the "GitHub.json Structure" batch at the "GitHub Issues Per Stage" stage of the "Workstream Review Standardization" workstream.

This is your thread:

"GitHub.json File Format" (1)

## Thread Summary
Define and implement the github.json file structure for workstreams.

## Thread Details
- Working packages: `packages/workstreams/src/lib/github`
- New file: `packages/workstreams/src/lib/github/workstream-issues.ts`
- Structure:
```typescript
interface WorkstreamGitHub {
  version: string
  stream_id: string
  last_updated: string
  branch?: {
    name: string
    url: string
    created_at: string
  }
  stages: {
    [stageNumber: string]: {
      issue_number: number
      issue_url: string
      state: "open" | "closed"
      created_at: string
      closed_at?: string
    }
  }
}
```
- Create `loadGitHubJson()`, `saveGitHubJson()` functions
- Create during `work create` or `work github enable`

Your tasks are:
- [ ] 03.01.01.01 Create `packages/workstreams/src/lib/github/workstream-github.ts` with `WorkstreamGitHub` interface for the github.json structure
- [ ] 03.01.01.02 Implement `loadWorkstreamGitHub(repoRoot, streamId)` function to read github.json
- [ ] 03.01.01.03 Implement `saveWorkstreamGitHub(repoRoot, streamId, data)` function to write github.json
- [ ] 03.01.01.04 Implement `initWorkstreamGitHub(repoRoot, streamId)` to create initial github.json with empty stages
- [ ] 03.01.01.05 Add `getStageIssue(stageNumber)` and `setStageIssue(stageNumber, issue)` helper functions
- [ ] 03.01.01.06 Run `bun run typecheck` to verify no type errors

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
