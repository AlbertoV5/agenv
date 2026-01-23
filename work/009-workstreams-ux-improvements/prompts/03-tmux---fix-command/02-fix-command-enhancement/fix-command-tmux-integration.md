Hello Agent!

You are working on the "Fix Command Enhancement" batch at the "Tmux & Fix Command" stage of the "Workstreams UX Improvements" workstream.

This is your thread:

"Fix Command Tmux Integration" (1)

## Thread Summary
Update fix --retry to run the agent thread within a tmux session like multi does.

## Thread Details
- Working packages: `./packages/workstreams`
- Modify `src/cli/fix.ts`:
- In retry action (lines 310-409), instead of running opencode directly:
- Create a new tmux session with a descriptive name (e.g., `work-fix-{threadId}`)
- Run the opencode command within the tmux session
- Attach to the session so user sees output
- On detach (Ctrl-B D), process continues in background
- User can reattach later with `tmux attach -t work-fix-{threadId}`
- Reuse tmux helpers from `src/lib/tmux.ts`
- Update `--resume` to also work within tmux if a fix session exists
- Add `--no-tmux` flag to preserve old behavior (run in foreground)
- Update `tests/fix.test.ts` with tmux integration tests

Your tasks are:
- [ ] 03.02.01.01 Refactor fix --retry to create a new tmux session (work-fix-{threadId}) instead of running opencode directly
- [ ] 03.02.01.02 Run opencode command within the tmux session and attach user to it
- [ ] 03.02.01.03 Handle detach (Ctrl-B D) to let process continue in background with reattach instructions
- [ ] 03.02.01.04 Update --resume to work within tmux if a fix session exists
- [ ] 03.02.01.05 Add --no-tmux flag to preserve old foreground behavior
- [ ] 03.02.01.06 Add fix command tmux integration tests to fix.test.ts

When listing tasks, use `work list --tasks --batch "03.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
