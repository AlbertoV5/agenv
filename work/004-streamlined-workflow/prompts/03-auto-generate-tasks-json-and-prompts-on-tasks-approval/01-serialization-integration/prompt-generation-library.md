Hello Agent!

You are working on the "Serialization Integration" batch at the "Auto-Generate tasks.json and Prompts on Tasks Approval" stage of the "Streamlined Workflow" workstream.

This is your thread:

"Prompt Generation Library" (2)

## Thread Summary
Ensure prompt generation can be called programmatically from approval flow.

## Thread Details
- Working package: `./packages/workstreams/src/lib/prompts.ts`
- Ensure `generateAllPrompts(repoRoot, streamId)` function exists and is exported
- Should generate prompts for all threads in the workstream
- Return success/failure status and list of generated files

Your tasks are:
- [ ] 03.01.02.01 Create generateAllPrompts(repoRoot, streamId) function in prompts.ts
- [ ] 03.01.02.02 Return GeneratePromptsResult with success status and file list
- [ ] 03.01.02.03 Iterate all threads from tasks.json and generate prompt for each
- [ ] 03.01.02.04 Export generateAllPrompts from library index
- [ ] 03.01.02.05 Add unit tests for generateAllPrompts function

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
