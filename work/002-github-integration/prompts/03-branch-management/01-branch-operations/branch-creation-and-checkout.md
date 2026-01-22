Hello Agent!

You are working on the "Branch Operations" batch at the "Branch Management" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Create workstream branch on GitHub and checkout locally.

## Thread Details
Create `src/lib/github/branches.ts` with:
- `formatBranchName(config, streamId)` - e.g., `workstream/002-github-integration`
- `createWorkstreamBranch(repoRoot, streamId, fromRef?)`
- Get default branch SHA via API
- Create ref via POST /repos/{owner}/{repo}/git/refs
- Run `git fetch origin` then `git checkout {branch}`
- `workstreamBranchExists(repoRoot, streamId)` - check if exists
- `storeWorkstreamBranchMeta(repoRoot, streamId, branchName)` - save to index.json
- Use `child_process.execSync` for git commands

Your tasks are:
- [ ] 03.01.01.01 Create src/lib/github/branches.ts with formatBranchName function
- [ ] 03.01.01.02 Implement createWorkstreamBranch using GitHub refs API
- [ ] 03.01.01.03 Add local git checkout after remote branch creation (git fetch + git checkout)
- [ ] 03.01.01.04 Implement workstreamBranchExists check
- [ ] 03.01.01.05 Implement storeWorkstreamBranchMeta to save branch to index.json

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-3/01-branch-operations/branch-creation-and-checkout/`

Use the `implementing-workstreams` skill.
When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.
