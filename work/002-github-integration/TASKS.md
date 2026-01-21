# Tasks: github-integration

## Stage 01: Core Infrastructure

### Batch 01: Issue Lifecycle

#### Thread 01: Type Definitions
- [x] Task 01.01.01.01: Create src/lib/github/types.ts with GitHubConfig, LabelConfig, ThreadGitHubMeta, WorkstreamGitHubMeta interfaces
  > Report: Created types.ts with all required interfaces and config
- [x] Task 01.01.01.02: Add GitHubAuth type for PAT authentication
  > Report: Added GitHubAuth type
- [x] Task 01.01.01.03: Add GitHubResult<T> type for API responses with success/error handling
  > Report: Added GitHubResult generic type
- [x] Task 01.01.01.04: Add GitHub API response types (GitHubIssue, GitHubLabel, GitHubBranch)
  > Report: Added GitHub API response types
- [x] Task 01.01.01.05: Export DEFAULT_GITHUB_CONFIG constant with sensible defaults
  > Report: Exported DEFAULT_GITHUB_CONFIG
- [x] Task 01.01.01.06: Create src/lib/github/index.ts to re-export all types
  > Report: Created index.ts to export types

#### Thread 02: Configuration Management
- [x] Task 01.01.02.01: Create src/lib/github/config.ts with getGitHubConfigPath function
  > Report: Created src/lib/github/config.ts with getGitHubConfigPath
- [x] Task 01.01.02.02: Implement loadGitHubConfig to read and parse work/github.json
  > Report: Implemented loadGitHubConfig to read and parse work/github.json
- [x] Task 01.01.02.03: Implement saveGitHubConfig with atomic write
  > Report: Implemented saveGitHubConfig with atomic write
- [x] Task 01.01.02.04: Implement isGitHubEnabled helper function
  > Report: Implemented isGitHubEnabled helper function
- [x] Task 01.01.02.05: Implement enableGitHub that creates config with auto-detected repo
  > Report: Implemented enableGitHub with auto-detection
- [x] Task 01.01.02.06: Implement disableGitHub to set enabled: false
  > Report: Implemented disableGitHub
- [x] Task 01.01.02.07: Add detectRepository function using git remote origin
  > Report: Added detectRepository using git remote

### Batch 02: Workstream Completion

#### Thread 01: Authentication
- [x] Task 01.02.01.01: Create src/lib/github/auth.ts with getAuthFromEnv checking GITHUB_TOKEN and GH_TOKEN
  > Report: Created src/lib/github/auth.ts with getAuthFromEnv checking GITHUB_TOKEN and GH_TOKEN
- [x] Task 01.02.01.02: Implement getAuthFromGhCli using execSync to run 'gh auth token'
  > Report: Implemented getAuthFromGhCli using execSync to run 'gh auth token'
- [x] Task 01.02.01.03: Implement getGitHubAuth with priority order (env > gh cli)
  > Report: Implemented getGitHubAuth with priority order (env > gh cli)
- [x] Task 01.02.01.04: Implement validateAuth to test token against GitHub API
  > Report: Implemented validateAuth to test token against GitHub API
- [x] Task 01.02.01.05: Add error handling for missing/invalid authentication
  > Report: Added GitHubAuthError class and ensureGitHubAuth function to handle missing/invalid authentication

#### Thread 02: GitHub API Client
- [x] Task 01.02.02.01: Create src/lib/github/client.ts with GitHubClient class
  > Report: Created src/lib/github/client.ts with GitHubClient class
- [x] Task 01.02.02.02: Implement constructor taking auth and repository parameters
  > Report: Implemented constructor taking token and repository
- [x] Task 01.02.02.03: Add private fetch wrapper with auth headers and error handling
  > Report: Added private request method with auth headers and error handling
- [x] Task 01.02.02.04: Implement createIssue method (POST /repos/{owner}/{repo}/issues)
  > Report: Implemented createIssue method
- [x] Task 01.02.02.05: Implement updateIssue and closeIssue methods
  > Report: Implemented updateIssue and closeIssue methods
- [x] Task 01.02.02.06: Implement getIssue method
  > Report: Implemented getIssue method
- [x] Task 01.02.02.07: Implement createLabel method
  > Report: Implemented createLabel method
- [x] Task 01.02.02.08: Implement ensureLabels to create labels if missing
  > Report: Implemented ensureLabels method
- [x] Task 01.02.02.09: Implement createBranch using refs API
  > Report: Implemented createBranch method
- [x] Task 01.02.02.10: Implement getBranch method
  > Report: Implemented getBranch method
- [x] Task 01.02.02.11: Add createGitHubClient factory function
  > Report: Implemented createGitHubClient factory function

## Stage 02: Issue Management

### Batch 01: Issue Lifecycle

#### Thread 01: Issue Creation
- [x] Task 02.01.01.01: Create src/lib/github/issues.ts with formatIssueTitle function
  > Report: Created src/lib/github/issues.ts with formatIssueTitle function and added unit test.
- [x] Task 02.01.01.02: Implement formatIssueBody with thread summary, details, and workstream context
  > Report: Implemented formatIssueBody and CreateThreadIssueInput with tests.
- [x] Task 02.01.01.03: Implement createThreadIssue that creates issue and returns ThreadGitHubMeta
  > Report: Implemented createThreadIssue with mocking test.
- [x] Task 02.01.01.04: Implement closeThreadIssue to close an issue by number
  > Report: Implemented closeThreadIssue with test.
- [x] Task 02.01.01.05: Implement storeThreadIssueMeta to save issue metadata to tasks.json
  > Report: Implemented storeThreadIssueMeta and added field to Task interface.

#### Thread 02: Label Management
- [x] Task 02.01.02.01: Create src/lib/github/labels.ts with formatLabel function
  > Report: Created src/lib/github/labels.ts with formatLabel function.
- [x] Task 02.01.02.02: Implement getThreadLabels returning workstream/stage/batch labels
  > Report: Implemented getThreadLabels returning workstream/stage/batch labels.
- [x] Task 02.01.02.03: Define label colors (workstream=purple, stage=blue, batch=green)
  > Report: Defined label colors in types.ts: workstream=purple, stage=blue, batch=green.
- [x] Task 02.01.02.04: Implement ensureWorkstreamLabels to create all needed labels
  > Report: Refactored ensureWorkstreamLabels to use GitHubClient and ensured all labels are created.

### Batch 02: Workstream Completion

#### Thread 01: Task Metadata Extension
- [x] Task 02.02.01.01: Add github_issue optional field to Task interface in types.ts
  > Report: Verified that github_issue field exists in Task interface in types.ts
- [x] Task 02.02.01.02: Add getTaskGitHubMeta helper to tasks.ts
  > Report: Added getTaskGitHubMeta helper to tasks.ts
- [x] Task 02.02.01.03: Add setTaskGitHubMeta helper to tasks.ts
  > Report: Added setTaskGitHubMeta helper to tasks.ts
- [x] Task 02.02.01.04: Ensure github_issue field is preserved in task read/write operations
  > Report: Verified preservation of github_issue field with manual test.

#### Thread 02: Stream Metadata Extension
- [x] Task 02.02.02.01: Add github optional field to StreamMetadata interface in types.ts
  > Report: Added github optional field to StreamMetadata interface
- [x] Task 02.02.02.02: Add setStreamGitHubMeta helper to index.ts
  > Report: Added setStreamGitHubMeta helper to index.ts
- [x] Task 02.02.02.03: Ensure github field is preserved in stream operations
  > Report: Verified preservation of github field in stream operations via tests and code analysis. Fixed malformed tasks.ts file.

## Stage 03: Branch Management

### Batch 01: Issue Lifecycle

#### Thread 01: Branch Creation and Checkout
- [x] Task 03.01.01.01: Create src/lib/github/branches.ts with formatBranchName function
  > Report: Created branches.ts with formatBranchName function that uses GitHubConfig.branch_prefix
- [x] Task 03.01.01.02: Implement createWorkstreamBranch using GitHub refs API
  > Report: Implemented createWorkstreamBranch using GitHubClient.createBranch which calls GitHub refs API
- [x] Task 03.01.01.03: Add local git checkout after remote branch creation (git fetch + git checkout)
  > Report: Added checkoutBranchLocally helper that runs git fetch origin and git checkout using execSync
- [x] Task 03.01.01.04: Implement workstreamBranchExists check
  > Report: Implemented workstreamBranchExists using GitHubClient.getBranch, returns false on 404
- [x] Task 03.01.01.05: Implement storeWorkstreamBranchMeta to save branch to index.json
  > Report: Implemented storeWorkstreamBranchMeta to save branch to stream.github.branch in index.json

## Stage 04: CLI Commands

### Batch 01: Issue Lifecycle

#### Thread 01: GitHub CLI Entry Point
- [x] Task 04.01.01.01: Create src/cli/github.ts with subcommand router
  > Report: Subcommand router already existed with create-branch implemented. Added enable, disable, status subcommands and stubs for create-issues and sync.
- [x] Task 04.01.01.02: Implement 'enable' subcommand with repo auto-detection
  > Report: Implemented enableCommand() which calls enableGitHub() from config.ts, auto-detects repo from git remote origin.
- [x] Task 04.01.01.03: Implement 'disable' subcommand
  > Report: Implemented disableCommand() which calls disableGitHub() from config.ts.
- [x] Task 04.01.01.04: Implement 'status' subcommand showing config and auth status
  > Report: Implemented statusCommand() showing enabled status, repository, branch prefix, auth status/source, and label configuration.
- [x] Task 04.01.01.05: Add 'github' case to bin/work.ts command router
  > Report: Already implemented - github command was already added to bin/work.ts SUBCOMMANDS and help text.

#### Thread 02: Issue Commands
- [x] Task 04.01.02.01: Implement 'create-issues' subcommand with --batch flag
  > Report: Implemented create-issues subcommand with --batch flag in src/cli/github.ts. Added parseCreateIssuesArgs, createIssuesCommand, ThreadInfo interface, and helper functions for grouping/filtering threads.
- [x] Task 04.01.02.02: Add --stage flag support for creating issues for entire stage
  > Report: The --stage flag was implemented as part of 04.01.02.01. It filters threads by stage number via filterThreadsByStage function.
- [x] Task 04.01.02.03: Add no-args mode to create issues for all pending threads
  > Report: No-args mode implemented as part of 04.01.02.01. When no filter is specified, filterPendingThreads is used to create issues for all threads that don't have issues yet.
- [x] Task 04.01.02.04: Display created issue URLs in output
  > Report: Issue URLs displayed in output: for text output shows URL under each thread, for JSON output includes issueUrl in created array. Implemented in createIssuesCommand.

#### Thread 03: Branch Commands
- [x] Task 04.01.03.01: Implement 'create-branch' subcommand
  > Report: Created src/cli/github.ts with create-branch subcommand and router infrastructure. Added github command to bin/work.ts.
- [x] Task 04.01.03.02: Add --stream flag to specify workstream
  > Report: Implemented --stream/-s flag to specify workstream ID for branch creation.
- [x] Task 04.01.03.03: Add --from flag to specify base branch (default: main)
  > Report: Implemented --from/-f flag to specify base branch (uses default detection when omitted).
- [x] Task 04.01.03.04: Show branch name and checkout confirmation in output
  > Report: Output shows branch name, SHA, URL, and checkout confirmation message.

### Batch 02: Workstream Completion

#### Thread 01: Approve Hook
- [x] Task 04.02.01.01: Create src/lib/github/sync.ts with createIssuesForWorkstream function
  > Report: Created src/lib/github/sync.ts with createIssuesForWorkstream function, isThreadComplete helper, and checkAndCloseThreadIssue function. Added auto_create_issues field to GitHubConfig type.
- [x] Task 04.02.01.02: Modify approve.ts to check if GitHub is enabled after approval
  > Report: Modified approve.ts to check if GitHub is enabled after approval and call handleGitHubIssueCreation helper function.
- [x] Task 04.02.01.03: Call ensureWorkstreamLabels and createThreadIssue for each thread
  > Report: Added handleGitHubIssueCreation helper that calls ensureWorkstreamLabels and createIssuesForWorkstream (which calls createThreadIssue for each thread). Results are logged in both JSON and text modes.
- [x] Task 04.02.01.04: Handle errors gracefully without failing approval
  > Report: Error handling implemented: handleGitHubIssueCreation wraps all GitHub calls in try/catch, never throws, and logs warnings instead of failing the approval. Both JSON and non-JSON modes handle errors gracefully.

#### Thread 02: Update Hook
- [x] Task 04.02.02.01: Add isThreadComplete helper to sync.ts
  > Report: Added isThreadComplete function to sync.ts that checks if all tasks in a thread are completed
- [x] Task 04.02.02.02: Add checkAndCloseThreadIssue function to sync.ts
  > Report: Added checkAndCloseThreadIssue async function to sync.ts that closes GitHub issue when thread is complete
- [x] Task 04.02.02.03: Modify update.ts to call checkAndCloseThreadIssue after status changes to completed
  > Report: Modified update.ts to call checkAndCloseThreadIssue after task status changes to completed (fire-and-forget pattern)
- [x] Task 04.02.02.04: Update github_issue.state to 'closed' in tasks.json
  > Report: github_issue.state update to 'closed' already implemented in checkAndCloseThreadIssue function (lines 280-290 of sync.ts)

#### Thread 03: Sync Command
- [x] Task 04.02.03.01: Implement 'sync' subcommand in github.ts
  > Report: Implemented sync subcommand in github.ts with parseSyncArgs and syncCommand functions
- [x] Task 04.02.03.02: Add syncIssueStates function to sync.ts
  > Report: Added syncIssueStates function and supporting types (SyncIssueStatesResult, ThreadSyncInfo) to sync.ts
- [x] Task 04.02.03.03: Close issues for completed threads, report changes
  > Report: syncIssueStates closes issues for completed threads, updates github_issue.state in tasks.json, reports Closed N issues, M unchanged
- [x] Task 04.02.03.04: Add --stream flag support
  > Report: Added --stream/-s flag support to sync command for specifying workstream ID

## Stage 05: Integration and Polish

### Batch 01: Issue Lifecycle

#### Thread 01: Init Integration
- [x] Task 05.01.01.01: Modify init.ts to create default github.json with enabled: false
  > Report: Modified init.ts to import github config functions and create github.json with DEFAULT_GITHUB_CONFIG (enabled: false) after work/ directory creation
- [x] Task 05.01.01.02: Log "Created github.json (disabled by default)" message
  > Report: Added console.log message 'Creating github.json (disabled by default)...' during init process

#### Thread 02: Multi Integration
- [x] Task 05.01.02.01: Modify multi.ts to check for github_issue on threads
  > Report: Modified ThreadInfo interface to include githubIssue field and updated collectThreadInfo to fetch github_issue data from tasks
- [x] Task 05.01.02.02: Display issue URL in thread info output
  > Report: Added issue URL display in dry-run thread details section when github_issue is present
- [x] Task 05.01.02.03: Include issue number in tmux pane title if available
  > Report: Created buildPaneTitle helper and updated all buildRunCommand calls to include issue number in tmux pane titles

### Batch 02: Workstream Completion

#### Thread 01: README Update
- [x] Task 05.02.01.01: Add "GitHub Integration" section to packages/workstreams/README.md
  > Report: Added comprehensive GitHub Integration section to packages/workstreams/README.md covering all features
- [x] Task 05.02.01.02: Document setup (PAT, environment variable)
  > Report: Documented setup instructions including PAT authentication methods and enable command
- [x] Task 05.02.01.03: Document CLI commands (enable, disable, status, create-branch, create-issues, sync)
  > Report: Documented all CLI commands: enable, disable, status, create-branch, create-issues, sync with examples
- [x] Task 05.02.01.04: Document automation triggers and label conventions
  > Report: Documented automation triggers (auto-create after approve, auto-close on completion) and label conventions with color codes

## Stage 06: Issue Lifecycle and Workstream Completion

### Batch 01: Issue Lifecycle

#### Thread 01: Update Issue Body on Completion
- [ ] Task 06.01.01.01: Add formatCompletedIssueBody function to issues.ts that formats tasks with checkmarks
- [ ] Task 06.01.01.02: Include task report as blockquote when present (e.g. > Report: ...)
- [ ] Task 06.01.01.03: Mark cancelled tasks with *(cancelled)* indicator
- [ ] Task 06.01.01.04: Add updateThreadIssueBody function using client.updateIssue()
- [ ] Task 06.01.01.05: Call updateThreadIssueBody in checkAndCloseThreadIssue before closing
- [ ] Task 06.01.01.06: Call updateThreadIssueBody in syncIssueStates before closing

#### Thread 02: Apply Labels to Issues
- [ ] Task 06.01.02.01: Import getThreadLabels from labels.ts in issues.ts
- [ ] Task 06.01.02.02: Replace empty labels array with getThreadLabels call in createThreadIssue
- [ ] Task 06.01.02.03: Verify labels are attached by testing issue creation

#### Thread 03: Reopen Issues on Status Change
- [ ] Task 06.01.03.01: Add reopenIssue method to GitHubClient (updateIssue with state: "open")
- [ ] Task 06.01.03.02: Add reopenThreadIssue function to sync.ts
- [ ] Task 06.01.03.03: Add checkAndReopenThreadIssue function to sync.ts
- [ ] Task 06.01.03.04: Track previous task status in update.ts before applying changes
- [ ] Task 06.01.03.05: Call checkAndReopenThreadIssue when task changes from completed to in_progress/blocked
- [ ] Task 06.01.03.06: Update github_issue.state to "open" in tasks.json when reopened

### Batch 02: Workstream Completion

#### Thread 01: Complete Command Foundation
- [ ] Task 06.02.01.01: Create src/cli/complete.ts with command structure
- [ ] Task 06.02.01.02: Add approval check - verify all stages are approved
- [ ] Task 06.02.01.03: Add GitHub check - verify enabled and branch exists
- [ ] Task 06.02.01.04: Add branch check - verify on workstream branch
- [ ] Task 06.02.01.05: Display completion summary (tasks, branch, target)
- [ ] Task 06.02.01.06: Extend StreamMetadata.github with completed_at and pr_number fields
- [ ] Task 06.02.01.07: Add 'complete' case to bin/work.ts command router

#### Thread 02: Git Operations
- [ ] Task 06.02.02.01: Add --commit flag (default true) and --no-commit option
- [ ] Task 06.02.02.02: Implement git add -A to stage all changes
- [ ] Task 06.02.02.03: Implement git commit with "Completed workstream: {name}" message
- [ ] Task 06.02.02.04: Implement git push origin {branch-name}
- [ ] Task 06.02.02.05: Handle already-pushed case gracefully (nothing to push)
- [ ] Task 06.02.02.06: Show pushed commit SHA in output

#### Thread 03: PR Creation
- [ ] Task 06.02.03.01: Add --pr flag (default true) and --no-pr option
- [ ] Task 06.02.03.02: Add --target option for PR target branch
- [ ] Task 06.02.03.03: Add --draft flag for draft PR
- [ ] Task 06.02.03.04: Add default_pr_target field to GitHubConfig type
- [ ] Task 06.02.03.05: Add createPullRequest method to GitHubClient
- [ ] Task 06.02.03.06: Format PR title as [{stream-id}] {stream-name}
- [ ] Task 06.02.03.07: Format PR body with summary, PLAN.md link, task counts
- [ ] Task 06.02.03.08: Store PR number in stream.github.pr_number
- [ ] Task 06.02.03.09: Show PR URL in output
