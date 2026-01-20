Hello Agent!

You are working on the "CLI Command" batch at the "CLI Integration" stage of the "Workstream Viz" workstream.

This is the thread you are responsible for:

## Thread Summary
Add `work serve` command to launch the web visualization server.

## Thread Details
- Create `src/cli/serve.ts`
- Options:
- `--port, -p` - Port number (default: 3456)
- `--open, -o` - Open browser automatically
- `--host` - Host to bind (default: localhost)
- Display: URL when server starts, Ctrl+C to stop message
- Register in `bin/work.ts` dispatcher

Your tasks are:
- [ ] 03.01.01.01 Create src/cli/serve.ts with command implementation
- [ ] 03.01.01.02 Implement --port, --open, --host CLI options
- [ ] 03.01.01.03 Register serve command in bin/work.ts dispatcher

Your working directory for creating additional documentation or scripts (if any) is: `work/001-workstream-viz/files/stage-3/01-cli-command/serve-command/`

Use the `implementing-workstream-plans` skill.
