Hello Agent!

You are working on the "Template & Types" batch at the "REPORT.md Template System" stage of the "Workstream Review Standardization" workstream.

This is your thread:

"Docs Directory Structure" (2)

## Thread Summary
Add optional `docs/` directory to workstream structure for additional documentation.

## Thread Details
- Working packages: `packages/workstreams/src/lib`
- Create `docs/` directory during `work create`
- Add README.md in docs/ explaining its purpose
- Update workstream types to include docs path
- Mention in skills that agents can add extra documentation here

Your tasks are:
- [ ] 01.01.02.01 Update `work create` in `packages/workstreams/src/cli/create.ts` to create `docs/` directory in workstream folder
- [ ] 01.01.02.02 Create `docs/README.md` template explaining the directory purpose: "Additional documentation that doesn't fit REPORT.md structure"
- [ ] 01.01.02.03 Update StreamMetadata type if needed to track docs path
- [ ] 01.01.02.04 Run `bun run typecheck` to verify no type errors

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
