Hello Agent!

You are working on the "Command Implementation" batch at the "Review Commits Command" stage of the "Stage Commit Tracking" workstream.

This is your thread:

"CLI Command" (2)

## Thread Summary
Implement the `work review commits` CLI command with output formatting.

## Thread Details
- Working package: `./packages/workstreams`
- Create `packages/workstreams/src/cli/review-commits.ts`:
- Parse args: `--stream`, `--stage`, `--json`, `--files`
- Default to current workstream
- Call git log parser functions
- Format output grouped by stage
- Output format (human-readable):
```
Workstream: 003-stage-commit-tracking
Branch: workstream/003-stage-commit-tracking

## Stage 01: Setup

### Stage Approval Commit
- abc123 [2026-01-22] Stage 01: Setup approved
  Files: src/lib/foo.ts, packages/workstreams/src/cli/bar.ts (+150, -20)

### Implementation Commits
- def456 [2026-01-22] Add foo module
  Files: src/lib/foo.ts (+100, -0)
- ghi789 [2026-01-22] Add bar command
  Files: packages/workstreams/src/cli/bar.ts (+50, -20)

### Human Commits (manual/external)
- jkl012 [2026-01-22] Quick fix for typo
  Files: README.md (+1, -1)

## Stage 02: Testing
...
```
- Register in `bin/work.ts` as `"review-commits": reviewCommitsMain`

Your tasks are:
- [ ] 02.01.02.01 Create src/cli/review-commits.ts with CLI argument parsing
- [ ] 02.01.02.02 Implement formatCommitOutput for human-readable display
- [ ] 02.01.02.03 Add JSON output mode for machine parsing
- [ ] 02.01.02.04 Register review-commits command in bin/work.ts

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
