Hello Agent!

You are working on the "Workstream Completion" batch at the "Issue Lifecycle and Workstream Completion" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

"Git Operations" (2)

## Thread Summary
Auto-add, commit, and push changes on completion.

## Thread Details
In `src/cli/complete.ts`:
- Add `--commit` flag (default: true, use `--no-commit` to skip)
- Run `git add -A` to stage all changes
- Run `git commit -m "Completed workstream: {stream-name}"`
- Include stream ID and summary in commit body
- Run `git push origin {branch-name}`
- Handle already-pushed case gracefully
- Show pushed commit SHA

Your tasks are:
- [ ] 06.02.02.01 Add --commit flag (default true) and --no-commit option
- [ ] 06.02.02.02 Implement git add -A to stage all changes
- [ ] 06.02.02.03 Implement git commit with "Completed workstream: {name}" message
- [ ] 06.02.02.04 Implement git push origin {branch-name}
- [ ] 06.02.02.05 Handle already-pushed case gracefully (nothing to push)
- [ ] 06.02.02.06 Show pushed commit SHA in output

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-6/02-workstream-completion/git-operations/`

Use the `implementing-workstream-plans` skill.
When listing tasks, use `work list --tasks --batch "06.02"` to see tasks for this batch only.
