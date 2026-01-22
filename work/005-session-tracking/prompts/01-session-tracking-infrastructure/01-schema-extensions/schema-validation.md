Hello Agent!

You are working on the "Schema Extensions" batch at the "Session Tracking Infrastructure" stage of the "Session Tracking" workstream.

This is your thread:

"Schema Validation" (2)

## Thread Summary
Update JSON schema validation to handle new session fields.

## Thread Details
- Working package: `./packages/workstreams`
- Update `src/lib/tasks.ts` validation functions
- Add migration logic for existing tasks.json files (add empty sessions array)
- Ensure `work validate` handles new schema gracefully

Your tasks are:
- [ ] 01.01.02.01 Update task validation functions to handle optional sessions array
- [ ] 01.01.02.02 Add migration helper to add empty sessions array to existing tasks
- [ ] 01.01.02.03 Update tasks.json read/write functions to preserve session data
- [ ] 01.01.02.04 Add validation for SessionRecord structure integrity

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
