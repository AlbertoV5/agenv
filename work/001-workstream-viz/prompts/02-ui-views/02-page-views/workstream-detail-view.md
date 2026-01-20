Hello Agent!

You are working on the "Page Views" batch at the "UI Views" stage of the "Workstream Viz" workstream.

This is the thread you are responsible for:

## Thread Summary
Create the detail page for a single workstream with full hierarchy.

## Thread Details
- Create `src/web/views/workstream.tsx`
- Route: `GET /workstream/:id`
- Display:
- Header with workstream name, status, approval info
- Progress summary (completed/total tasks)
- Collapsible stages with batches and threads
- Each thread shows its tasks with status indicators
- Use semantic HTML: details/summary for collapsible sections

Your tasks are:
- [ ] 02.02.02.01 Create src/web/views/workstream.tsx
- [ ] 02.02.02.02 Implement collapsible stages using details/summary elements
- [ ] 02.02.02.03 Display batches and threads with task status indicators
- [ ] 02.02.02.04 Wire up GET /workstream/:id route

Your working directory for creating additional documentation or scripts (if any) is: `work/001-workstream-viz/files/stage-2/02-page-views/workstream-detail-view/`

Use the `implementing-workstream-plans` skill.
