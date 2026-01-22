Hello Agent!

You are working on the "Core Commands" batch at the "CLI Commands" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Add create-branch subcommand.

## Thread Details
In `src/cli/github.ts`:
- `create-branch` - create branch for current workstream
- `create-branch --stream "002-github-integration"` - specify stream
- `create-branch --from main` - specify base branch (default: main)
- After creation, checkout locally and show branch name

Your tasks are:
- [ ] 04.01.03.01 Implement 'create-branch' subcommand
- [ ] 04.01.03.02 Add --stream flag to specify workstream
- [ ] 04.01.03.03 Add --from flag to specify base branch (default: main)
- [ ] 04.01.03.04 Show branch name and checkout confirmation in output

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-4/01-core-commands/branch-commands/`

Use the `implementing-workstreams` skill.
When listing tasks, use `work list --tasks --batch "04.01"` to see tasks for this batch only.
