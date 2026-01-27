Hello Agent!

You are working on the "Complete Command Validation" batch at the "Revision - Report Validation on Complete" stage of the "Workstream Review Standardization" workstream.

This is your thread:

"Add Report Check to Complete" (1)

## Thread Summary
Update `work complete` to require a valid REPORT.md before marking workstream as complete.

## Thread Details
- Working packages: `packages/workstreams/src/cli`
- In `complete.ts`, add check for REPORT.md existence
- Use `validateReport()` from report-template.ts to check content
- If missing/invalid, show error with instructions to run `work report init`
- Add `--force` flag to bypass validation (with warning)
- Update help text to document the requirement

Your tasks are:
- [ ] 05.01.01.01 In `packages/workstreams/src/cli/complete.ts`, add check for REPORT.md existence before completing workstream
- [ ] 05.01.01.02 Import and use `validateReport()` from report-template.ts to check REPORT.md has required sections filled
- [ ] 05.01.01.03 If REPORT.md is missing, show error message with instructions to run `work report init`
- [ ] 05.01.01.04 If REPORT.md validation fails, show specific errors about which sections need content
- [ ] 05.01.01.05 Add `--force` flag to bypass REPORT.md validation (with warning that report is incomplete)
- [ ] 05.01.01.06 Update help text in complete.ts to document REPORT.md requirement and --force flag
- [ ] 05.01.01.07 Run `bun run typecheck` and test `work complete` with and without valid REPORT.md

When listing tasks, use `work list --tasks --batch "05.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
