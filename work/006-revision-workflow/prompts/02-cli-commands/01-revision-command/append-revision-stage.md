Hello Agent!

You are working on the "Revision Command" batch at the "CLI Commands" stage of the "Revision Workflow" workstream.

This is your thread:

"Append Revision Stage" (2)

## Thread Summary
Create or modify stage append function to use "Revision -" prefix instead of "Fix -".

## Thread Details
- Working packages: `./packages/workstreams`
- Edit `src/lib/fix.ts` or create new function
- Add `appendRevisionStage(repoRoot, streamId, options): Result`
- Similar to `appendFixStage()` but:
- Uses "Revision - {name}" instead of "Fix - {name}"
- Template has clean structure (Definition, Constitution, Questions, Batches)
- No reference to "target stage" - revisions are independent additions

Your tasks are:
- [ ] 02.01.02.01 Add `appendRevisionStage(repoRoot, streamId, options)` function to `src/lib/fix.ts`
- [ ] 02.01.02.02 Create stage template with "Revision - {name}" prefix and clean structure (Definition, Constitution, Questions, Batches)
- [ ] 02.01.02.03 Append to PLAN.md at end (similar to appendFixStage but without targetStage reference)

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
