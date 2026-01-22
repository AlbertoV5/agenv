Hello Agent!

You are working on the "Agents Command Update" batch at the "TASKS.md Agent Assignment Support" stage of the "Streamlined Workflow" workstream.

This is your thread:

"AGENTS.md Deprecation" (2)

## Thread Summary
Remove AGENTS.md support from the codebase and update references.

## Thread Details
- Working packages:
- `./packages/workstreams/src/lib/agents.ts` - deprecate/remove
- `./packages/workstreams/src/cli/agents.ts` - remove AGENTS.md commands
- Remove `--add` and `--remove` flags that modify AGENTS.md
- Update any code that falls back to AGENTS.md
- Keep the file `agents.ts` but gut the AGENTS.md-specific functions

Your tasks are:
- [ ] 01.02.02.01 Remove --add flag implementation from agents CLI
- [ ] 01.02.02.02 Remove --remove flag implementation from agents CLI
- [ ] 01.02.02.03 Remove AGENTS.md file operations from src/lib/agents.ts
- [ ] 01.02.02.04 Update any imports that reference AGENTS.md functions
- [ ] 01.02.02.05 Keep agents.ts file but mark functions as deprecated with comments

When listing tasks, use `work list --tasks --batch "01.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
