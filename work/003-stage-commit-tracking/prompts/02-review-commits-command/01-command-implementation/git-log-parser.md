Hello Agent!

You are working on the "Command Implementation" batch at the "Review Commits Command" stage of the "Stage Commit Tracking" workstream.

This is your thread:

"Git Log Parser" (1)

## Thread Summary
Implement git log parsing to extract commits with workstream trailers.

## Thread Details
- Working package: `./packages/workstreams`
- Create parsing functions in `src/lib/git/log.ts`:
- `parseGitLog(repoRoot, branchName)` - get all commits on branch
- `extractWorkstreamTrailers(commitMessage)` - parse trailers from message
- `groupCommitsByStage(commits, streamId)` - organize commits by stage
- `identifyHumanCommits(commits)` - find commits without workstream trailers
- Use `git log --format` with custom format to get SHA, message, author, date, files

Your tasks are:
- [ ] 02.01.01.01 Create src/lib/git/log.ts with parseGitLog function
- [ ] 02.01.01.02 Add extractWorkstreamTrailers function to parse commit trailers
- [ ] 02.01.01.03 Add groupCommitsByStage function to organize commits
- [ ] 02.01.01.04 Add identifyHumanCommits function to find non-workstream commits
- [ ] 02.01.01.05 Export functions from src/lib/git/index.ts

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
