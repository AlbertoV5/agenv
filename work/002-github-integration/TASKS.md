# Tasks: github-integration

## Stage 01: Core Infrastructure

### Batch 01: Types and Configuration

#### Thread 01: Type Definitions
- [ ] Task 01.01.01.01: Create src/lib/github/types.ts with GitHubConfig, LabelConfig, ThreadGitHubMeta, WorkstreamGitHubMeta interfaces
- [ ] Task 01.01.01.02: Add GitHubAuth type for PAT authentication
- [ ] Task 01.01.01.03: Add GitHubResult<T> type for API responses with success/error handling
- [ ] Task 01.01.01.04: Add GitHub API response types (GitHubIssue, GitHubLabel, GitHubBranch)
- [ ] Task 01.01.01.05: Export DEFAULT_GITHUB_CONFIG constant with sensible defaults
- [ ] Task 01.01.01.06: Create src/lib/github/index.ts to re-export all types

#### Thread 02: Configuration Management
- [ ] Task 01.01.02.01: Create src/lib/github/config.ts with getGitHubConfigPath function
- [ ] Task 01.01.02.02: Implement loadGitHubConfig to read and parse work/github.json
- [ ] Task 01.01.02.03: Implement saveGitHubConfig with atomic write
- [ ] Task 01.01.02.04: Implement isGitHubEnabled helper function
- [ ] Task 01.01.02.05: Implement enableGitHub that creates config with auto-detected repo
- [ ] Task 01.01.02.06: Implement disableGitHub to set enabled: false
- [ ] Task 01.01.02.07: Add detectRepository function using git remote origin

### Batch 02: Authentication and Client

#### Thread 01: Authentication
- [ ] Task 01.02.01.01: Create src/lib/github/auth.ts with getAuthFromEnv checking GITHUB_TOKEN and GH_TOKEN
- [ ] Task 01.02.01.02: Implement getAuthFromGhCli using execSync to run 'gh auth token'
- [ ] Task 01.02.01.03: Implement getGitHubAuth with priority order (env > gh cli)
- [ ] Task 01.02.01.04: Implement validateAuth to test token against GitHub API
- [ ] Task 01.02.01.05: Add error handling for missing/invalid authentication

#### Thread 02: GitHub API Client
- [ ] Task 01.02.02.01: Create src/lib/github/client.ts with GitHubClient class
- [ ] Task 01.02.02.02: Implement constructor taking auth and repository parameters
- [ ] Task 01.02.02.03: Add private fetch wrapper with auth headers and error handling
- [ ] Task 01.02.02.04: Implement createIssue method (POST /repos/{owner}/{repo}/issues)
- [ ] Task 01.02.02.05: Implement updateIssue and closeIssue methods
- [ ] Task 01.02.02.06: Implement getIssue method
- [ ] Task 01.02.02.07: Implement createLabel method
- [ ] Task 01.02.02.08: Implement ensureLabels to create labels if missing
- [ ] Task 01.02.02.09: Implement createBranch using refs API
- [ ] Task 01.02.02.10: Implement getBranch method
- [ ] Task 01.02.02.11: Add createGitHubClient factory function

## Stage 02: Issue Management

### Batch 01: Issue Operations

#### Thread 01: Issue Creation
- [ ] Task 02.01.01.01: Create src/lib/github/issues.ts with formatIssueTitle function
- [ ] Task 02.01.01.02: Implement formatIssueBody with thread summary, details, and workstream context
- [ ] Task 02.01.01.03: Implement createThreadIssue that creates issue and returns ThreadGitHubMeta
- [ ] Task 02.01.01.04: Implement closeThreadIssue to close an issue by number
- [ ] Task 02.01.01.05: Implement storeThreadIssueMeta to save issue metadata to tasks.json

#### Thread 02: Label Management
- [ ] Task 02.01.02.01: Create src/lib/github/labels.ts with formatLabel function
- [ ] Task 02.01.02.02: Implement getThreadLabels returning workstream/stage/batch labels
- [ ] Task 02.01.02.03: Define label colors (workstream=purple, stage=blue, batch=green)
- [ ] Task 02.01.02.04: Implement ensureWorkstreamLabels to create all needed labels

### Batch 02: Metadata Storage

#### Thread 01: Task Metadata Extension
- [ ] Task 02.02.01.01: Add github_issue optional field to Task interface in types.ts
- [ ] Task 02.02.01.02: Add getTaskGitHubMeta helper to tasks.ts
- [ ] Task 02.02.01.03: Add setTaskGitHubMeta helper to tasks.ts
- [ ] Task 02.02.01.04: Ensure github_issue field is preserved in task read/write operations

#### Thread 02: Stream Metadata Extension
- [ ] Task 02.02.02.01: Add github optional field to StreamMetadata interface in types.ts
- [ ] Task 02.02.02.02: Add setStreamGitHubMeta helper to index.ts
- [ ] Task 02.02.02.03: Ensure github field is preserved in stream operations

## Stage 03: Branch Management

### Batch 01: Branch Operations

#### Thread 01: Branch Creation and Checkout
- [ ] Task 03.01.01.01: Create src/lib/github/branches.ts with formatBranchName function
- [ ] Task 03.01.01.02: Implement createWorkstreamBranch using GitHub refs API
- [ ] Task 03.01.01.03: Add local git checkout after remote branch creation (git fetch + git checkout)
- [ ] Task 03.01.01.04: Implement workstreamBranchExists check
- [ ] Task 03.01.01.05: Implement storeWorkstreamBranchMeta to save branch to index.json

## Stage 04: CLI Commands

### Batch 01: Core Commands

#### Thread 01: GitHub CLI Entry Point
- [ ] Task 04.01.01.01: Create src/cli/github.ts with subcommand router
- [ ] Task 04.01.01.02: Implement 'enable' subcommand with repo auto-detection
- [ ] Task 04.01.01.03: Implement 'disable' subcommand
- [ ] Task 04.01.01.04: Implement 'status' subcommand showing config and auth status
- [ ] Task 04.01.01.05: Add 'github' case to bin/work.ts command router

#### Thread 02: Issue Commands
- [ ] Task 04.01.02.01: Implement 'create-issues' subcommand with --batch flag
- [ ] Task 04.01.02.02: Add --stage flag support for creating issues for entire stage
- [ ] Task 04.01.02.03: Add no-args mode to create issues for all pending threads
- [ ] Task 04.01.02.04: Display created issue URLs in output

#### Thread 03: Branch Commands
- [ ] Task 04.01.03.01: Implement 'create-branch' subcommand
- [ ] Task 04.01.03.02: Add --stream flag to specify workstream
- [ ] Task 04.01.03.03: Add --from flag to specify base branch (default: main)
- [ ] Task 04.01.03.04: Show branch name and checkout confirmation in output

### Batch 02: Automation Hooks

#### Thread 01: Approve Hook
- [ ] Task 04.02.01.01: Create src/lib/github/sync.ts with createIssuesForWorkstream function
- [ ] Task 04.02.01.02: Modify approve.ts to check if GitHub is enabled after approval
- [ ] Task 04.02.01.03: Call ensureWorkstreamLabels and createThreadIssue for each thread
- [ ] Task 04.02.01.04: Handle errors gracefully without failing approval

#### Thread 02: Update Hook
- [ ] Task 04.02.02.01: Add isThreadComplete helper to sync.ts
- [ ] Task 04.02.02.02: Add checkAndCloseThreadIssue function to sync.ts
- [ ] Task 04.02.02.03: Modify update.ts to call checkAndCloseThreadIssue after status changes to completed
- [ ] Task 04.02.02.04: Update github_issue.state to 'closed' in tasks.json

#### Thread 03: Sync Command
- [ ] Task 04.02.03.01: Implement 'sync' subcommand in github.ts
- [ ] Task 04.02.03.02: Add syncIssueStates function to sync.ts
- [ ] Task 04.02.03.03: Close issues for completed threads, report changes
- [ ] Task 04.02.03.04: Add --stream flag support

## Stage 05: Integration and Polish

### Batch 01: Integration Points

#### Thread 01: Init Integration
- [ ] Task 05.01.01.01: Modify init.ts to create default github.json with enabled: false
- [ ] Task 05.01.01.02: Log "Created github.json (disabled by default)" message

#### Thread 02: Multi Integration
- [ ] Task 05.01.02.01: Modify multi.ts to check for github_issue on threads
- [ ] Task 05.01.02.02: Display issue URL in thread info output
- [ ] Task 05.01.02.03: Include issue number in tmux pane title if available

### Batch 02: Documentation

#### Thread 01: README Update
- [ ] Task 05.02.01.01: Add "GitHub Integration" section to packages/workstreams/README.md
- [ ] Task 05.02.01.02: Document setup (PAT, environment variable)
- [ ] Task 05.02.01.03: Document CLI commands (enable, disable, status, create-branch, create-issues, sync)
- [ ] Task 05.02.01.04: Document automation triggers and label conventions
