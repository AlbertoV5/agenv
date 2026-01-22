Hello Agent!

You are working on the "Automation Hooks" batch at the "CLI Commands" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Manual sync command for issue states.

## Thread Details
In `src/cli/github.ts`:
- `sync` - sync all issue states for current workstream
- `sync --stream "002-..."` - specify stream
- Close issues for completed threads, log changes
- Report: "Closed N issues, M unchanged"

Your tasks are:
- [ ] 04.02.03.01 Implement 'sync' subcommand in github.ts
- [ ] 04.02.03.02 Add syncIssueStates function to sync.ts
- [ ] 04.02.03.03 Close issues for completed threads, report changes
- [ ] 04.02.03.04 Add --stream flag support

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-4/02-automation-hooks/sync-command/`

Use the `implementing-workstreams` skill.
When listing tasks, use `work list --tasks --batch "04.02"` to see tasks for this batch only.
