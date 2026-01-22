Hello Agent!

You are working on the "Authentication and Client" batch at the "Core Infrastructure" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Create wrapper for GitHub REST API.

## Thread Details
Create `src/lib/github/client.ts` with:
- `GitHubClient` class constructor(auth, repository)
- `createIssue(title, body, labels)` - POST /repos/{owner}/{repo}/issues
- `updateIssue(number, updates)` - PATCH /repos/{owner}/{repo}/issues/{number}
- `closeIssue(number)` - close via updateIssue
- `getIssue(number)` - GET /repos/{owner}/{repo}/issues/{number}
- `createLabel(name, color, description)` - POST /repos/{owner}/{repo}/labels
- `ensureLabels(labels)` - create labels if missing
- `createBranch(name, fromRef)` - create via refs API
- `getBranch(name)` - GET /repos/{owner}/{repo}/branches/{branch}
- Error handling, rate limit awareness

Your tasks are:
- [ ] 01.02.02.01 Create src/lib/github/client.ts with GitHubClient class
- [ ] 01.02.02.02 Implement constructor taking auth and repository parameters
- [ ] 01.02.02.03 Add private fetch wrapper with auth headers and error handling
- [ ] 01.02.02.04 Implement createIssue method (POST /repos/{owner}/{repo}/issues)
- [ ] 01.02.02.05 Implement updateIssue and closeIssue methods
- [ ] 01.02.02.06 Implement getIssue method
- [ ] 01.02.02.07 Implement createLabel method
- [ ] 01.02.02.08 Implement ensureLabels to create labels if missing
- [ ] 01.02.02.09 Implement createBranch using refs API
- [ ] 01.02.02.10 Implement getBranch method
- [ ] 01.02.02.11 Add createGitHubClient factory function

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-1/02-authentication-and-client/github-api-client/`

Use the `implementing-workstreams` skill.
When listing tasks, use `work list --tasks --batch "01.02"` to see tasks for this batch only.
