## Notes

- [ ] ENHANCE: Add command to summarize plan so the planner can call an "assistant" agent to summarize it and play tts?
- [ ] NOTE: Tooling prompt, eg: ```Can you create a test script file in ./scripts so I can run `bun run ./scripts/check-github-*.ts` So I Can test auth, config, label, and issue?``` 


- [ ] ENHANCE: Improve the tmux to auto kill tmux session when both opencode sessions end.

- [ ] ENHANCE: Keep track of the opencode sessions per thread so we are able to resume incomplete work or ask for small fixes to the agent responsible for the implementation. So when we do `work fix` we have the option to go back to specific threads or create new stages. I think we may need to rename the current `work fix` to `work add stage` which is a more sensible approach.

- [ ] ENHANCE: Create opencode plugin that will close the session after ~1 min of inactivity so we can auto close batched runs


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