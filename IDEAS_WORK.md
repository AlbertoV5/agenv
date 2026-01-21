## Notes

- FEAT: Add review command, `review plan` for printing the current plan's PLAN.md and `review tasks` for printing the current plan's TASKS.md
- ENHANCE: Add prompt templates to top-level agent, defined in AGENTS.md, "use x skill, your role is of"

- [~] FEAT: Add "tree" view command, showing number of batches per stages and number of threads per batch, and number of tasks per thread.

- [~] ENHANCE: Make it so the implementing skills agent only lists tasks for the current stage.

- [~] BUG: When creating a fix stage, the planner agent geenerates a new TASKS.md file which doesn't have the "report" field, so when serializing back to tasks.json, we lose the report.


## Human Workflow notes

- PLAN: Ask for feature and to create plan (iterate).
- REVIEW: Ask to review and edit PLAN.md and to ask questions if any (iterate).
- PLAN: Ask for TASKS.md generation.
- REVIEW: Ask to revew and edit TASKS.md if any (iterate).
- PLAN: Ask for TASKS.md serialization and assignements.
- USER: Review tasks.
- PLAN: Ask for prompts generation.