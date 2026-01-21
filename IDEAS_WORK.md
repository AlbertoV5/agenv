## Notes

- FEAT: Add review command, `review plan` for printing the current plan's PLAN.md and `review tasks` for printing the current plan's TASKS.md
```
$ work context --json
   2 {
   3   "stream": "002-github-integration",
   4   "plan_path": "work/002-github-integration/PLAN.md",
   5   "tasks_path": "work/002-github-integration/tasks.json",
   6   "status": "pending",
   7   "blockers": 0  // Calculated count of [ ] in PLAN.md
   8 }
```


```
work review 
   * work review plan: Outputs the full PLAN.md content.
   * work review tasks: Outputs the tasks (even if empty, it confirms the state).
   * Improvement: Add a --summary flag to review plan that just lists the Stage and
     Batch definitions without the thread details, for a quick high-level check.
```

```
work validate plan
  I used consolidate --dry-run and grep to ensure safety. A dedicated validation command
  would be better.

   * work validate plan:
       * Checks PLAN structure (schema).
       * Crucially: Scans for open questions [ ] and reports them explicitly.
       * Verifies that referenced files (inputs) exist.
```

```
work check plan
  A dedicated command to find "todo" items or questions.
   * Returns a list of all un-checked boxes in PLAN.md with their line
     numbers. This replaces my need to grep.

Remove the `work consolidate`. Also update all places in the docs and tests to use `work check plan` instead of work consolidate.
```


- ENHANCE: Add prompt templates to top-level agent, defined in AGENTS.md, "use x skill, your role is of"

- [~] FEAT: Add "tree" view command, showing number of batches per stages and number of threads per batch, and number of tasks per thread.

- [~] ENHANCE: Make it so the implementing skills agent only lists tasks for the current stage.

- [~] BUG: When creating a fix stage, the planner agent geenerates a new TASKS.md file which doesn't have the "report" field, so when serializing back to tasks.json, we lose the report.

- [ ] ENHANCE: After PLAN.md is created, have "assistant" agent read it for you (TTS), include `work preview` command output + reference to plan so assistant synthesizes.

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