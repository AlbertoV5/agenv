## Notes

- ENHANCE: Add prompt templates to top-level agent, defined in AGENTS.md, "use x skill, your role is of"

- [ ] ENHANCE: After PLAN.md is created, have "assistant" agent read it for you (TTS), include `work preview` command output + reference to plan so assistant synthesizes.
  
- [ ] BUG: Update the Reviewer skill to include to check for if threads are actually parallelizable. Update planner skill doc to reinforce that.

- [ ] ENHANCE: Tooling prompt, eg: ```Can you create a test script file in ./scripts so I can run `bun run ./scripts/check-github-*.ts` So I Can test auth, config, label, and issue?``` 

- [ ] ENHANCE: Integrate constant documentation agent that will document tooling and the latest status (apart from the regular docs one).

## Notes prompts

- Planner: `your role is of planner agent ... use the create workstream plans skill`
- Reviewer: `your role is of reviewer agent ... use the revieweing workstream plans skill`
- Planner `Plan is approved. Please generate the tasks and the prompts.`