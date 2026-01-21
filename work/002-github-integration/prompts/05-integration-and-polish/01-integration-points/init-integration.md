Hello Agent!

You are working on the "Integration Points" batch at the "Integration and Polish" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Create default github.json during `work init`.

## Thread Details
Modify `src/cli/init.ts`:
- After creating work/ directory, create `github.json`
- Use DEFAULT_GITHUB_CONFIG with enabled: false
- Log: "Created github.json (disabled by default)"

Your tasks are:
- [ ] 05.01.01.01 Modify init.ts to create default github.json with enabled: false
- [ ] 05.01.01.02 Log "Created github.json (disabled by default)" message

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-5/01-integration-points/init-integration/`

Use the `implementing-workstream-plans` skill.
When listing tasks, use `work list --tasks --batch "05.01"` to see tasks for this batch only.
