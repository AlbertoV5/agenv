Hello Agent!

You are working on the "Documentation Updates" batch at the "Documentation and Skill Updates" stage of the "Streamlined Workflow" workstream.

This is your thread:

"README Update" (1)

## Thread Summary
Update packages/workstreams/README.md with the new streamlined workflow.

## Thread Details
- Working package: `./packages/workstreams/README.md`
- New "Quick Start" section showing the 5-step flow:
1. `work create --name "feature" --stages N`
2. Fill PLAN.md → `work approve plan` (auto-generates TASKS.md)
3. Fill TASKS.md with tasks and agents → `work approve tasks` (auto-generates tasks.json + prompts)
4. `work status` / `work tree` to verify
5. `work start` to begin execution
- Move `work tasks generate`, `work tasks serialize`, `work prompts` to "Manual Commands" section
- Update the workflow diagram/table
- Add note about agent assignment syntax in TASKS.md

Your tasks are:
- [ ] 04.01.01.01 Rewrite Quick Start section with new 5-step workflow
- [ ] 04.01.01.02 Add TASKS.md agent assignment syntax documentation
- [ ] 04.01.01.03 Create "Manual Commands" section for work tasks generate/serialize
- [ ] 04.01.01.04 Update Workstream Lifecycle table with new flow
- [ ] 04.01.01.05 Add examples showing @agent:name syntax in TASKS.md

When listing tasks, use `work list --tasks --batch "04.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
