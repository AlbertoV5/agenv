Hello Agent!

You are working on the "Workstream Completion" batch at the "Issue Lifecycle and Workstream Completion" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

"PR Creation" (3)

## Thread Summary
Create pull request to target branch with configurable defaults.

## Thread Details
In `src/cli/complete.ts`:
- Add `--pr` flag (default: true, use `--no-pr` to skip)
- Add `--target <branch>` option for PR target (default from config or "main")
- Add `--draft` flag for draft PR
In `src/lib/github/config.ts`:
- Add `default_pr_target?: string` to GitHubConfig
PR creation:
- Use GitHub API POST /repos/{owner}/{repo}/pulls
- Title: `[{stream-id}] {stream-name}`
- Body: Include summary, link to PLAN.md, task counts
- If no `--target` and no config default, prompt user to select
In `src/lib/github/client.ts`:
- Add `createPullRequest(title, body, head, base, draft?)` method
Output:
- Show PR URL
- Store PR number in stream metadata

Your tasks are:
- [ ] 06.02.03.01 Add --pr flag (default true) and --no-pr option
- [ ] 06.02.03.02 Add --target option for PR target branch
- [ ] 06.02.03.03 Add --draft flag for draft PR
- [ ] 06.02.03.04 Add default_pr_target field to GitHubConfig type
- [ ] 06.02.03.05 Add createPullRequest method to GitHubClient
- [ ] 06.02.03.06 Format PR title as [{stream-id}] {stream-name}
- [ ] 06.02.03.07 Format PR body with summary, PLAN.md link, task counts
- [ ] 06.02.03.08 Store PR number in stream.github.pr_number
- [ ] 06.02.03.09 Show PR URL in output

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-6/02-workstream-completion/pr-creation/`

Use the `implementing-workstream-plans` skill.
When listing tasks, use `work list --tasks --batch "06.02"` to see tasks for this batch only.
