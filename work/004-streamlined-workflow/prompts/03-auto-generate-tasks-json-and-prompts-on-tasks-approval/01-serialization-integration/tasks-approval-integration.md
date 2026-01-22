Hello Agent!

You are working on the "Serialization Integration" batch at the "Auto-Generate tasks.json and Prompts on Tasks Approval" stage of the "Streamlined Workflow" workstream.

This is your thread:

"Tasks Approval Integration" (1)

## Thread Summary
Integrate tasks.json serialization and prompt generation into tasks approval.

## Thread Details
- Working packages:
- `./packages/workstreams/src/cli/approve.ts`
- `./packages/workstreams/src/lib/approval.ts`
- After tasks validation passes:
1. Call `serializeTasksMd()` to create tasks.json
2. Call `generateAllPrompts()` to create prompt files
3. Delete TASKS.md
- Update success message: "Tasks approved. tasks.json and prompts generated."
- Handle edge cases:
- Serialization fails → don't approve, show error
- Prompt generation fails → still approve but warn (tasks.json is the critical artifact)

Your tasks are:
- [ ] 03.01.01.01 Import serializeTasksMd and prompt generation in approve.ts
- [ ] 03.01.01.02 Add serialization call after successful tasks validation
- [ ] 03.01.01.03 Add prompt generation call after successful serialization
- [ ] 03.01.01.04 Delete TASKS.md after successful serialization
- [ ] 03.01.01.05 Update success message to list generated artifacts
- [ ] 03.01.01.06 Handle serialization failure (block approval, show error)
- [ ] 03.01.01.07 Handle prompt generation failure (approve but warn)
- [ ] 03.01.01.08 Add integration test for tasks approval with auto-generation

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
