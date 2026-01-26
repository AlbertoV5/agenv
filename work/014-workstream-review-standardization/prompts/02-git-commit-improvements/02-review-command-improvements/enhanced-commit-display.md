Hello Agent!

You are working on the "Review Command Improvements" batch at the "Git Commit Improvements" stage of the "Workstream Review Standardization" workstream.

This is your thread:

"Enhanced Commit Display" (1)

## Thread Summary
Improve commit display with stage names and better formatting.

## Thread Details
- Working packages: `packages/workstreams/src/cli`
- Update `formatCommitOutput()` in `review.ts`
- Use Stage-Name from trailers when available
- Add file change summaries (added/modified/deleted counts)
- Group files by type or directory for readability

Your tasks are:
- [ ] 02.02.01.01 Update `formatCommitOutput()` in `review.ts` to display Stage-Name from trailers when available
- [ ] 02.02.01.02 Add file change summary showing counts of added/modified/deleted files per commit
- [ ] 02.02.01.03 Improve formatting by grouping files by directory or extension for readability
- [ ] 02.02.01.04 Run `bun run typecheck` and manually test `work review commits` output

When listing tasks, use `work list --tasks --batch "02.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
