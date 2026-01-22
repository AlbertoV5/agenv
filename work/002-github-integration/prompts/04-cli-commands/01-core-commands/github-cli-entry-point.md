Hello Agent!

You are working on the "Core Commands" batch at the "CLI Commands" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Create main `work github` command router.

## Thread Details
Create `src/cli/github.ts` with:
- Subcommand router for: enable, disable, status, create-branch, create-issues, sync
- `enable` - enable GitHub integration, auto-detect repo
- `disable` - disable integration
- `status` - show config, auth status, repository
Update `bin/work.ts`:
- Add `github` to command switch statement
- Import and route to github.ts

Your tasks are:
- [ ] 04.01.01.01 Create src/cli/github.ts with subcommand router
- [ ] 04.01.01.02 Implement 'enable' subcommand with repo auto-detection
- [ ] 04.01.01.03 Implement 'disable' subcommand
- [ ] 04.01.01.04 Implement 'status' subcommand showing config and auth status
- [ ] 04.01.01.05 Add 'github' case to bin/work.ts command router

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-4/01-core-commands/github-cli-entry-point/`

Use the `implementing-workstreams` skill.
When listing tasks, use `work list --tasks --batch "04.01"` to see tasks for this batch only.
