Hello Agent!

You are working on the "Approval Flow Modification" batch at the "Auto-Generate TASKS.md on Plan Approval" stage of the "Streamlined Workflow" workstream.

This is your thread:

"Plan Approval Integration" (1)

## Thread Summary
Integrate TASKS.md generation into the plan approval flow.

## Thread Details
- Working packages:
- `./packages/workstreams/src/cli/approve.ts`
- `./packages/workstreams/src/lib/approval.ts`
- After `approvePlan()` succeeds, call `generateTasksMd()`
- Import necessary functions from tasks-md.ts
- Output: "Plan approved. TASKS.md generated at work/{streamId}/TASKS.md"
- Handle edge cases:
- TASKS.md already exists → overwrite with warning
- Generation fails → still approve plan but warn user

Your tasks are:
- [ ] 02.01.01.01 Import generateTasksMd function in approve.ts CLI
- [ ] 02.01.01.02 Add TASKS.md generation call after successful plan approval
- [ ] 02.01.01.03 Check for existing TASKS.md and warn if overwriting
- [ ] 02.01.01.04 Update success message to indicate TASKS.md was generated
- [ ] 02.01.01.05 Handle generation failure gracefully (approve plan, warn about TASKS.md)
- [ ] 02.01.01.06 Add integration test for plan approval with auto-generation

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
