## Notes

- [ ] ENHANCE: Add prompt templates to top-level agent, defined in AGENTS.md, "use x skill, your role is of"

- [ ] ENHANCE: After PLAN.md is created, have "assistant" agent read it for you (TTS), include `work preview` command output + reference to plan so assistant synthesizes.

- [ ] BUG: Update the Reviewer skill to check for if threads are actually parallelizable. Update planner skill doc to reinforce that.

- [ ] NOTE: Tooling prompt, eg: ```Can you create a test script file in ./scripts so I can run `bun run ./scripts/check-github-*.ts` So I Can test auth, config, label, and issue?``` 

- [ ] ENHANCE: Keep track of the opencode sessions per thread so we are able to resume work on incomplete work or small fixes. So when we do `work fix` we have the option to go back to specific threads or create new stages.

- [ ] ENHANCE: Improve the tmux to auto kill tmux session when both opencode sessions end.
- [ ] BUG: Force `work approve stage` to validate that all batches and all threads of the stage are completed before moving onto it.
- [ ] ENHANCE: Rename `work multi --continue` to `work continue` and that it default sto batch level work

## Notes prompts

- Planner: `your role is of planner agent ... use the create workstream plans skill`
- Reviewer: `your role is of reviewer agent ... use the revieweing workstream plans skill`
- Planner `Plan is approved. Please generate the tasks and the prompts.`