Hello Agent!

You are working on the "Authentication and Client" batch at the "Core Infrastructure" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Handle GitHub PAT authentication with multiple sources.

## Thread Details
Create `src/lib/github/auth.ts` with:
- `getGitHubAuth()` - get auth from available sources
- `getAuthFromEnv()` - check GITHUB_TOKEN, GH_TOKEN
- `getAuthFromGhCli()` - run `gh auth token` as fallback
- `validateAuth(auth)` - test token validity via API
- Priority: GITHUB_TOKEN > GH_TOKEN > gh CLI

Your tasks are:
- [ ] 01.02.01.01 Create src/lib/github/auth.ts with getAuthFromEnv checking GITHUB_TOKEN and GH_TOKEN
- [ ] 01.02.01.02 Implement getAuthFromGhCli using execSync to run 'gh auth token'
- [ ] 01.02.01.03 Implement getGitHubAuth with priority order (env > gh cli)
- [ ] 01.02.01.04 Implement validateAuth to test token against GitHub API
- [ ] 01.02.01.05 Add error handling for missing/invalid authentication

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-1/02-authentication-and-client/authentication/`

Use the `implementing-workstream-plans` skill.
When listing tasks, use `work list --tasks --batch "01.02"` to see tasks for this batch only.
