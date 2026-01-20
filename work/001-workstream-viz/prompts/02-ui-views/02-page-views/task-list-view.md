Hello Agent frontend-speedster!

You are working on the "Page Views" batch at the "UI Views" stage of the "Workstream Viz" workstream.

This is the thread you are responsible for:

## Thread Summary
Create a flat task list view with filtering.

## Thread Details
- Create `src/web/views/tasks.tsx`
- Route: `GET /workstream/:id/tasks`
- Display: Table of all tasks for workstream
- Columns: ID, Name, Stage, Batch, Thread, Status, Updated
- Filter by status via query params: `?status=pending`
- Sort by ID (default) or updated_at

Your tasks are:
- [ ] 02.02.03.01 Create src/web/views/tasks.tsx
- [ ] 02.02.03.02 Implement task table (ID, Name, Stage, Batch, Thread, Status, Updated)
- [ ] 02.02.03.03 Add status filtering via ?status= query parameter
- [ ] 02.02.03.04 Wire up GET /workstream/:id/tasks route

Your working directory for creating additional documentation or scripts (if any) is: `work/001-workstream-viz/files/stage-2/02-page-views/task-list-view/`

Use the `implementing-workstream-plans` skill.
