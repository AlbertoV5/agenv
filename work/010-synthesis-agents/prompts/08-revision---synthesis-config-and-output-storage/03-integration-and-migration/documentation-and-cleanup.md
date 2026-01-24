Hello Agent!

You are working on the "Integration and Migration" batch at the "Revision - Synthesis Config and Output Storage" stage of the "Synthesis Agents" workstream.

This is your thread:

"Documentation and Cleanup" (3)

## Thread Summary
Update documentation and clean up old synthesis config from notifications.

## Thread Details
- Working packages: `./packages/workstreams`
- Remove `synthesis?: SynthesisConfig` from `NotificationsConfig` interface
- Remove synthesis section from default `notifications.json` template
- Update README synthesis documentation:
- Document `work/synthesis.json` configuration
- Document threads.json synthesis output structure
- Update examples
- Add JSDoc comments to all new functions and interfaces
- Add migration note: if upgrading, create `synthesis.json` and remove synthesis from `notifications.json`

Your tasks are:
- [ ] 08.03.03.01 Remove `synthesis?: SynthesisConfig` field from `NotificationsConfig` interface
- [ ] 08.03.03.02 Remove synthesis section from default `notifications.json` template in init command
- [ ] 08.03.03.03 Update packages/workstreams/README.md to document `work/synthesis.json` configuration
- [ ] 08.03.03.04 Document threads.json synthesis output structure in README
- [ ] 08.03.03.05 Add JSDoc comments to all new functions and interfaces in synthesis module
- [ ] 08.03.03.06 Add migration note to README: if upgrading, create synthesis.json and remove synthesis from notifications.json
- [ ] 08.03.03.07 Remove synthesis-related imports from `notifications/config.ts` if any remain

When listing tasks, use `work list --tasks --batch "08.03"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
