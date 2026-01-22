Hello Agent!

You are working on the "Data Layer" batch at the "Foundation" stage of the "Workstream Viz" workstream.

This is the thread you are responsible for:

## Thread Summary
Create service module that wraps existing lib functions for web API use.

## Thread Details
- Create `src/web/data-service.ts`
- `listWorkstreams()` - Load index and return formatted list
- `getWorkstream(id)` - Get single workstream with progress
- `getTasks(id)` - Get tasks with grouping by stage/batch/thread
- `getPlanStructure(id)` - Parse PLAN.md and return structure
- Handle errors gracefully, return appropriate error responses

Your tasks are:
- [ ] 01.03.01.01 Create src/web/data-service.ts module structure
- [ ] 01.03.01.02 Implement listWorkstreams() function
- [ ] 01.03.01.03 Implement getWorkstream(id) function with progress
- [ ] 01.03.01.04 Implement getTasks(id) function with stage/batch/thread grouping
- [ ] 01.03.01.05 Implement getPlanStructure(id) function

Your working directory for creating additional documentation or scripts (if any) is: `work/001-workstream-viz/files/stage-1/03-data-layer/data-service/`

Use the `implementing-workstreams` skill.
