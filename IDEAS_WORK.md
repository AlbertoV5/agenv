## Notes

- [ ] ENHANCE: Add command to summarize plan so the planner can call an "assistant" agent to summarize it and play tts?
- [ ] NOTE: Tooling prompt, eg: ```Can you create a test script file in ./scripts so I can run `bun run ./scripts/check-github-*.ts` So I Can test auth, config, label, and issue?``` 

- [~] ENHANCE: Improve the `fix` command to be less complex, and to run the fix in tmux process so we dont pollute the main terminal logs.
- [ ] ENHANCE: Create opencode plugin that will close the session after ~1 min of inactivity so we can auto close batched runs.


## Notes prompts

- Planner: `... use the planning workstreams skill`
- Reviewer: `... use the revieweing workstreams skill`


## Flow

- prompt planner
- approve plan
- approve tasks
- start workstream
- continue work
- approve stage
- continue work
- approve stage