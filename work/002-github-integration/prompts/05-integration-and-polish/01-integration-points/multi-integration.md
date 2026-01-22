Hello Agent!

You are working on the "Integration Points" batch at the "Integration and Polish" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Show issue URLs in `work multi` output.

## Thread Details
Modify `src/cli/multi.ts`:
- When displaying thread info, check for github_issue
- If present, show: `Issue: https://github.com/owner/repo/issues/N`
- In tmux pane title, include issue number if available

Your tasks are:
- [ ] 05.01.02.01 Modify multi.ts to check for github_issue on threads
- [ ] 05.01.02.02 Display issue URL in thread info output
- [ ] 05.01.02.03 Include issue number in tmux pane title if available

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-5/01-integration-points/multi-integration/`

Use the `implementing-workstreams` skill.
When listing tasks, use `work list --tasks --batch "05.01"` to see tasks for this batch only.
