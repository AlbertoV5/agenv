Hello Agent!

You are working on the "Issue Operations" batch at the "Issue Management" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Manage GitHub labels for workstream filtering.

## Thread Details
Create `src/lib/github/labels.ts` with:
- `getThreadLabels(config, streamName, stageId, stageName, batchId, batchName)`
- Returns: `["workstream:name", "stage:01-name", "batch:01.01-name"]`
- `formatLabel(prefix, value)` - format label name
- `ensureWorkstreamLabels(repoRoot, streamId)` - create all labels
- Label colors: workstream=purple, stage=blue, batch=green

Your tasks are:
- [ ] 02.01.02.01 Create src/lib/github/labels.ts with formatLabel function
- [ ] 02.01.02.02 Implement getThreadLabels returning workstream/stage/batch labels
- [ ] 02.01.02.03 Define label colors (workstream=purple, stage=blue, batch=green)
- [ ] 02.01.02.04 Implement ensureWorkstreamLabels to create all needed labels

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-2/01-issue-operations/label-management/`

Use the `implementing-workstream-plans` skill.
When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.
