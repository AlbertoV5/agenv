# Tasks: stage-commit-tracking

## Stage 01: Auto-Commit on Stage Approval

### Batch 01: Core Implementation

#### Thread 01: Commit Library
- [ ] Task 01.01.01.01: Create src/lib/github/commits.ts with formatStageCommitMessage function
- [ ] Task 01.01.01.02: Add createStageApprovalCommit function with git add and commit logic
- [ ] Task 01.01.01.03: Add hasUncommittedChanges helper function
- [ ] Task 01.01.01.04: Export functions from src/lib/github/index.ts

#### Thread 02: Approval Integration
- [ ] Task 01.01.02.01: Add commit_sha field to StageApproval type in src/lib/types.ts
- [ ] Task 01.01.02.02: Add auto_commit_on_approval to GitHubConfig type in src/lib/github/types.ts
- [ ] Task 01.01.02.03: Update DEFAULT_GITHUB_CONFIG with auto_commit_on_approval default true
- [ ] Task 01.01.02.04: Modify approve.ts to call createStageApprovalCommit after stage approval
- [ ] Task 01.01.02.05: Store commit SHA in stage approval metadata

## Stage 02: Review Commits Command

### Batch 01: Command Implementation

#### Thread 01: Git Log Parser
- [ ] Task 02.01.01.01: Create src/lib/git/log.ts with parseGitLog function
- [ ] Task 02.01.01.02: Add extractWorkstreamTrailers function to parse commit trailers
- [ ] Task 02.01.01.03: Add groupCommitsByStage function to organize commits
- [ ] Task 02.01.01.04: Add identifyHumanCommits function to find non-workstream commits
- [ ] Task 02.01.01.05: Export functions from src/lib/git/index.ts

#### Thread 02: CLI Command
- [ ] Task 02.01.02.01: Create src/cli/review-commits.ts with CLI argument parsing
- [ ] Task 02.01.02.02: Implement formatCommitOutput for human-readable display
- [ ] Task 02.01.02.03: Add JSON output mode for machine parsing
- [ ] Task 02.01.02.04: Register review-commits command in bin/work.ts

## Stage 03: Documentation and Skill Update

### Batch 01: Documentation

#### Thread 01: README Update
- [ ] Task 03.01.01.01: Add Stage Approval Commits section to README under GitHub Integration
- [ ] Task 03.01.01.02: Document commit message format with trailers
- [ ] Task 03.01.01.03: Add work review commits CLI reference section
- [ ] Task 03.01.01.04: Add configuration documentation for auto_commit_on_approval

#### Thread 02: Skill Update
- [ ] Task 03.01.02.01: Add Review Stage Commits section to evaluating-workstreams SKILL.md
- [ ] Task 03.01.02.02: Update evaluation workflow to include commit review steps
