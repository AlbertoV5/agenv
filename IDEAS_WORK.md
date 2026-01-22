## Notes

- [ ] ENHANCE: Add command to summarize plan so the planner can call an "assistant" agent to summarize it and play tts?
- [ ] NOTE: Tooling prompt, eg: ```Can you create a test script file in ./scripts so I can run `bun run ./scripts/check-github-*.ts` So I Can test auth, config, label, and issue?``` 

- [ ] ENHANCE: Improve the tmux to auto kill tmux session when both opencode sessions end.
- [ ] ENHANCE: Improve add stage flow so all tasks generate and tasks serialize process are handled by a command. Something like the work approve plan, but call it work revision or something like that which will be more inline with the existing `work fix` command, where work fix is for small fixes and work revision is for adding new stages. Let's reframe "fix stages" to "revision stages" and have the command automate the generate and serialize tasks. I think we need to have a new type / update the data structure so we support "revisions" to a workstream, these will make it so we need to `work approve revision x`, which will do the same thing as `work approve tasks` in terms of automating tasks. But the revision should follow: User asks for revision, agent creates revision, user reviews revision and approves it, agent updates tasks with revision stage tasks, user approves tasks (they are serialized, prompts generated, all automated), then user can run `work continue` to work on that next stage.

- [~] ENHANCE: Keep track of the opencode sessions per thread so we are able to resume incomplete work or ask for small fixes to the agent responsible for the implementation. So when we do `work fix` we have the option to go back to specific threads or create new stages. I think we may need to rename the current `work fix` to `work add stage` which is a more sensible approach.

- [ ] ENHANCE: Create opencode plugin that will close the session after ~1 min of inactivity so we can auto close batched runs.
- [ ] ENHANCE: Add parallel sync mechanism so agents know of filed being worked on at the same time.


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