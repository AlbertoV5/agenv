## Notes

- [x] FEAT: Add review command, `review plan` for printing the current plan's PLAN.md and `review tasks` for printing the current plan's TASKS.md

- ENHANCE: Add prompt templates to top-level agent, defined in AGENTS.md, "use x skill, your role is of"

- [~] FEAT: Add "tree" view command, showing number of batches per stages and number of threads per batch, and number of tasks per thread.

- [~] ENHANCE: Make it so the implementing skills agent only lists tasks for the current stage.

- [~] BUG: When creating a fix stage, the planner agent geenerates a new TASKS.md file which doesn't have the "report" field, so when serializing back to tasks.json, we lose the report.

- [ ] ENHANCE: After PLAN.md is created, have "assistant" agent read it for you (TTS), include `work preview` command output + reference to plan so assistant synthesizes.
  
- [ ] ENHANCE: We need to make it so the opencode sessions remain open after agent is finished to write instructions. Use `--title` and set thread name + uid for easy retrieval.

- [ ] BUG: Update the Reviewer skill to include to check for if threads are actually parallelizable. Update planner skill doc to reinforce that.
  
- [ ] ENHANCE: Tooling prompt, eg: ```Can you create a test script file in ./scripts so I can run `bun run ./scripts/check-github-*.ts` So I Can test auth, config, label, and issue?``` 

- [ ] ENHANCE: Integrate constant documentation agent that will document tooling and the latest status (apart from the regular docs one).

## Human Workflow notes

- PLAN: Ask for feature and to create plan (iterate).
- REVIEW: Ask to review and edit PLAN.md and to ask questions if any (iterate).

- PLAN: Ask for TASKS.md generation.
- REVIEW: Ask to revew and edit TASKS.md if any (iterate).

- PLAN: Ask for TASKS.md serialization and assignements.
- USER: Review tasks.
- PLAN: Ask for prompts generation.


## Notes prompts

- Planner: `your role is of planner agent ... use the create workstream plans skill`
- Reviewer: `your role is of reviewer agent ... use the revieweing workstream plans skill`
- Planner `Plan is approved. Please generate the tasks and the prompts.`