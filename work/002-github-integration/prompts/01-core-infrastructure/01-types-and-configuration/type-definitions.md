Hello Agent!

You are working on the "Types and Configuration" batch at the "Core Infrastructure" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Create TypeScript interfaces for GitHub integration.

## Thread Details
Create `src/lib/github/types.ts` with:
- `GitHubConfig` - config stored in `work/github.json`
- `LabelConfig` - label prefix configuration
- `ThreadGitHubMeta` - issue metadata stored on tasks
- `WorkstreamGitHubMeta` - branch metadata on streams
- `GitHubAuth` - authentication token types
- `GitHubResult<T>` - result wrapper for API calls
- `DEFAULT_GITHUB_CONFIG` - default configuration values

Your tasks are:
- [ ] 01.01.01.01 Create src/lib/github/types.ts with GitHubConfig, LabelConfig, ThreadGitHubMeta, WorkstreamGitHubMeta interfaces
- [ ] 01.01.01.02 Add GitHubAuth type for PAT authentication
- [ ] 01.01.01.03 Add GitHubResult<T> type for API responses with success/error handling
- [ ] 01.01.01.04 Add GitHub API response types (GitHubIssue, GitHubLabel, GitHubBranch)
- [ ] 01.01.01.05 Export DEFAULT_GITHUB_CONFIG constant with sensible defaults
- [ ] 01.01.01.06 Create src/lib/github/index.ts to re-export all types

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-1/01-types-and-configuration/type-definitions/`

Use the `implementing-workstream-plans` skill.
When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.
