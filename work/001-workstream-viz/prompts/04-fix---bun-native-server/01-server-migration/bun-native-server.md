Hello Agent!

You are working on the "Server Migration" batch at the "Fix - bun-native-server" stage of the "Workstream Viz" workstream.

This is the thread you are responsible for:

## Thread Summary
Replace @hono/node-server with Bun.serve() for native Bun HTTP serving.

## Thread Details
- Update `src/web/server.ts`:
- Remove `@hono/node-server` import
- Use `Bun.serve({ fetch: app.fetch, port, hostname })`
- Update ServerType to use Bun's Server type
- Adjust graceful shutdown for Bun.serve API
- Remove `@hono/node-server` from package.json dependencies
- Test in Chrome to verify fix

Your tasks are:
- [ ] 04.01.01.01 Remove @hono/node-server import from server.ts
- [ ] 04.01.01.02 Replace serve() with Bun.serve() using app.fetch handler
- [ ] 04.01.01.03 Update ServerType to Bun's Server type
- [ ] 04.01.01.04 Adjust graceful shutdown for Bun.serve API
- [ ] 04.01.01.05 Remove @hono/node-server from package.json
- [ ] 04.01.01.06 Test in Chrome to verify fix

Your working directory for creating additional documentation or scripts (if any) is: `work/001-workstream-viz/files/stage-4/01-server-migration/bun-native-server/`

Use the `implementing-workstream-plans` skill.
