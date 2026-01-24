# Tasks: migrate-github-issues-to-threads

## Stage 01: Core Migration

### Batch 01: Storage Layer Updates

#### Thread 01: Issue Storage Functions @agent:systems-engineer
- [ ] Task 01.01.01.01: Update `storeThreadIssueMeta()` in `packages/workstreams/src/lib/github/issues.ts` to call `setThreadGitHubIssue()` from threads.ts instead of modifying task.github_issue
- [ ] Task 01.01.01.02: Extract threadId from taskId parameter using `extractThreadIdFromTaskId()` utility
- [ ] Task 01.01.01.03: Ensure thread metadata entry is created if it doesn't exist (use `getOrCreateThreadMetadata()` or similar pattern)
- [ ] Task 01.01.01.04: Remove the direct task.github_issue assignment and writeTasksFile call from storeThreadIssueMeta

#### Thread 02: Sync Operations @agent:systems-engineer
- [ ] Task 01.01.02.01: Update `closeThreadIssuesForCompletedThreads()` in sync.ts to read issue data from threads.json via `getThreadGitHubIssue()` instead of task.github_issue
- [ ] Task 01.01.02.02: Update `reopenIssuesForIncompleteThreads()` in sync.ts to read from threads.json
- [ ] Task 01.01.02.03: After closing/reopening issues, update the state in threads.json via `setThreadGitHubIssue()` with the new state
- [ ] Task 01.01.02.04: Remove any remaining reads from task.github_issue in sync.ts

## Stage 02: Cleanup & Verification

### Batch 01: Cleanup & Testing

#### Thread 01: Remove Task-Level Issue Storage @agent:systems-engineer
- [ ] Task 02.01.01.01: Remove `github_issue` field from Task interface in `packages/workstreams/src/lib/types.ts`
- [ ] Task 02.01.01.02: Update `discoverThreadsInBatch()` in tasks.ts to read githubIssue from threads.json instead of first task's github_issue
- [ ] Task 02.01.01.03: Search for and update any other code that reads `task.github_issue` (grep for "github_issue" and ".github_issue")
- [ ] Task 02.01.01.04: Run typecheck to verify no remaining references to task.github_issue

#### Thread 02: Add Migration Command @agent:systems-engineer
- [ ] Task 02.01.02.01: Add `migrate-issues` subcommand to the github CLI in `packages/workstreams/src/cli/github.ts`
- [ ] Task 02.01.02.02: Implement command logic: read tasks.json, find tasks with github_issue, group by threadId
- [ ] Task 02.01.02.03: For each thread with issues, call `setThreadGitHubIssue()` to write to threads.json
- [ ] Task 02.01.02.04: Add --dry-run flag to preview what would be migrated without making changes

#### Thread 03: Tests @agent:code-reviewer
- [ ] Task 02.01.03.01: Add unit test for `storeThreadIssueMeta()` verifying it writes to threads.json (not tasks.json)
- [ ] Task 02.01.03.02: Add unit test for `getThreadGitHubIssue()` verifying it returns correct data from threads.json
- [ ] Task 02.01.03.03: Add integration test for sync operations verifying they read/write from threads.json
- [ ] Task 02.01.03.04: Run full test suite and fix any failures related to the migration
