Hello Agent!

You are working on the "Tmux Improvements" batch at the "Tmux & Fix Command" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Tmux Test Scripts" (2)

## Thread Summary
Create preview scripts in ./scripts/ for manual tmux testing with small models.

## Thread Details
- Working packages: `./packages/workstreams`
- Create `scripts/preview-multi.ts`:
- Accept `--threads N` argument (default 4)
- Create mock prompts like "Say hello and exit" or "List files in current directory"
- Run `work multi` equivalent with claude-3-5-haiku-latest model
- Allow testing grid behavior without full workstream setup
- Create `scripts/preview-grid.ts`:
- Standalone 2x2 grid tester
- Create tmux session with 4 panes running simple commands
- Verify layout visually
- Create `scripts/preview-fix.ts`:
- Test fix command retry flow
- Create mock failed thread, run fix --retry
- Add instructions to `scripts/README.md` for running preview scripts
- Scripts should be runnable with `bun run scripts/preview-*.ts`

Your tasks are:
- [ ] 03.01.02.01 Create scripts/preview-multi.ts that runs mock prompts with claude-3-5-haiku-latest and configurable thread count
- [ ] 03.01.02.02 Create scripts/preview-grid.ts as standalone 2x2 grid tester with simple commands
- [ ] 03.01.02.03 Create scripts/preview-fix.ts to test fix command retry flow with mock failed thread
- [ ] 03.01.02.04 Add scripts/README.md with instructions for running preview scripts

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
