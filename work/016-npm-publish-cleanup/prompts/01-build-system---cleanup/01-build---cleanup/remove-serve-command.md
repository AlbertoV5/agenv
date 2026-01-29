Hello Agent!

You are working on the "Build & Cleanup" batch at the "Build System & Cleanup" stage of the "Npm Publish Cleanup" workstream.

This is your thread:

"Remove Serve Command" (2)

## Thread Summary
Remove the web visualization feature and its React dependency.

## Thread Details
- Working packages: `./packages/workstreams`
- Delete `src/cli/serve.ts`
- Remove serve from `bin/work.ts` command registry
- Remove React-related dependencies from package.json (`hono`, JSX runtime if any)
- Update any imports that reference serve

Your tasks are:
- [ ] 01.01.02.01 Delete src/cli/serve.ts file
- [ ] 01.01.02.02 Remove serve import and registration from bin/work.ts
- [ ] 01.01.02.03 Remove serve from COMMAND_DESCRIPTIONS in bin/work.ts
- [ ] 01.01.02.04 Remove hono and any JSX/React dependencies from package.json

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
