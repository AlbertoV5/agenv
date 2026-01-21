Hello Agent!

You are working on the "Core Commands" batch at the "CLI Commands" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Add create-issues subcommand.

## Thread Details
In `src/cli/github.ts`:
- `create-issues --batch "01.01"` - create issues for batch threads
- `create-issues --stage 1` - create issues for all threads in stage
- `create-issues` (no args) - create issues for all pending threads
- Show created issue URLs in output

Your tasks are:
- [ ] 04.01.02.01 Implement 'create-issues' subcommand with --batch flag
- [ ] 04.01.02.02 Add --stage flag support for creating issues for entire stage
- [ ] 04.01.02.03 Add no-args mode to create issues for all pending threads
- [ ] 04.01.02.04 Display created issue URLs in output

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-4/01-core-commands/issue-commands/`

Use the `implementing-workstream-plans` skill.
When listing tasks, use `work list --tasks --batch "04.01"` to see tasks for this batch only.
