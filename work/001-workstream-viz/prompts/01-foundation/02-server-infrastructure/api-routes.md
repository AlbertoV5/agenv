Hello Agent!

You are working on the "Server Infrastructure" batch at the "Foundation" stage of the "Workstream Viz" workstream.

This is the thread you are responsible for:

## Thread Summary
Define REST API endpoints for accessing workstream data.

## Thread Details
- `GET /api/workstreams` - List all workstreams with metadata
- `GET /api/workstreams/:id` - Get single workstream details
- `GET /api/workstreams/:id/tasks` - Get tasks for workstream
- `GET /api/workstreams/:id/progress` - Get progress summary
- `GET /api/workstreams/:id/plan` - Get parsed PLAN.md structure
- All responses return JSON

Your tasks are:
- [ ] 01.02.02.01 Create src/web/routes/api.ts with route definitions
- [ ] 01.02.02.02 Implement GET /api/workstreams endpoint (list all)
- [ ] 01.02.02.03 Implement GET /api/workstreams/:id endpoint (single workstream)
- [ ] 01.02.02.04 Implement GET /api/workstreams/:id/tasks endpoint
- [ ] 01.02.02.05 Implement GET /api/workstreams/:id/progress endpoint
- [ ] 01.02.02.06 Implement GET /api/workstreams/:id/plan endpoint

Your working directory for creating additional documentation or scripts (if any) is: `work/001-workstream-viz/files/stage-1/02-server-infrastructure/api-routes/`

Use the `implementing-workstreams` skill.
