## Notes

- Make so TASKS.md doesn't include index, just `- [ ] Task description`
- Add review command, `review plan` for printing the current plan's PLAN.md and `review tasks` for printing the current plan's TASKS.md
- Add prompt templates to top-level agent, defined in AGENTS.md, "use x skill, your role is of"

- Add "tree" view command, showing number of batches per stages and number of threads per batch, and number of tasks per thread.


## Human Workflow notes

- PLAN: Ask for feature and to create plan (iterate).
- REVIEW: Ask to review and edit PLAN.md and to ask questions if any (iterate).
- PLAN: Ask for TASKS.md generation.
- REVIEW: Ask to revew and edit TASKS.md if any (iterate).
- PLAN: Ask for TASKS.md serialization and assignements.
- USER: Review tasks.
- PLAN: Ask for prompts generation.