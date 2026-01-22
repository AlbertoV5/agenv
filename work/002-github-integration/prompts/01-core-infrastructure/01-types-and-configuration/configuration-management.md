Hello Agent!

You are working on the "Types and Configuration" batch at the "Core Infrastructure" stage of the "Github Integration" workstream.

This is the thread you are responsible for:

## Thread Summary
Manage `work/github.json` configuration file.

## Thread Details
Create `src/lib/github/config.ts` with:
- `getGitHubConfigPath(repoRoot)` - path to github.json
- `loadGitHubConfig(repoRoot)` - load and parse config
- `saveGitHubConfig(repoRoot, config)` - write config
- `isGitHubEnabled(repoRoot)` - check if enabled
- `enableGitHub(repoRoot)` - enable integration
- `disableGitHub(repoRoot)` - disable integration
- Auto-detect repository from git remote origin

Your tasks are:
- [ ] 01.01.02.01 Create src/lib/github/config.ts with getGitHubConfigPath function
- [ ] 01.01.02.02 Implement loadGitHubConfig to read and parse work/github.json
- [ ] 01.01.02.03 Implement saveGitHubConfig with atomic write
- [ ] 01.01.02.04 Implement isGitHubEnabled helper function
- [ ] 01.01.02.05 Implement enableGitHub that creates config with auto-detected repo
- [ ] 01.01.02.06 Implement disableGitHub to set enabled: false
- [ ] 01.01.02.07 Add detectRepository function using git remote origin

Your working directory for creating additional documentation or scripts (if any) is: `work/002-github-integration/files/stage-1/01-types-and-configuration/configuration-management/`

Use the `implementing-workstreams` skill.
When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.
