Hello Agent!

You are working on the "Template & Types" batch at the "REPORT.md Template System" stage of the "Workstream Review Standardization" workstream.

This is your thread:

"REPORT.md Template Design" (1)

## Thread Summary
Define the REPORT.md template structure and create the generator function.

## Thread Details
- Working packages: `packages/workstreams/src/lib`
- Template structure:
```markdown
# Report: {Workstream Name}

> **Stream ID:** {id} | **Reported:** {date}

## Summary
<!-- High-level summary of what was achieved -->

## Accomplishments

### Stage 01: {Stage Name}
<!-- What was accomplished in this stage -->

#### Key Changes
- {description}

## File References

| File | Changes |
|------|---------|
| `path/to/file.ts` | Description of changes |

## Issues & Blockers
<!-- Any issues encountered, bugs found, or blockers hit -->

## Next Steps
<!-- Recommended follow-up work -->
```
- Create `generateReportTemplate()` function
- Add type definitions for report sections

Your tasks are:
- [ ] 01.01.01.01 Create ReportTemplate interface in `packages/workstreams/src/lib/types.ts` with sections: summary, accomplishments (by stage), fileReferences, issues, nextSteps
- [ ] 01.01.01.02 Create `packages/workstreams/src/lib/report-template.ts` with `generateReportTemplate(streamId)` function that creates REPORT.md skeleton from workstream metadata
- [ ] 01.01.01.03 Add `parseReport()` function to parse existing REPORT.md and extract sections for validation
- [ ] 01.01.01.04 Add `validateReport()` function to check that required sections have content (not just placeholders)
- [ ] 01.01.01.05 Run `bun run typecheck` to verify no type errors

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
