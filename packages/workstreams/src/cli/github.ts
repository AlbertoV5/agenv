/**
 * CLI: GitHub Integration
 *
 * Manages GitHub integration for workstreams: enable, disable, status,
 * create-branch, create-issues, sync.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, resolveStreamId, getStream } from "../lib/index.ts"
import { readTasksFile, parseTaskId } from "../lib/tasks.ts"
import {
  loadGitHubConfig,
  enableGitHub,
  disableGitHub,
  isGitHubEnabled,
} from "../lib/github/config.ts"
import { getGitHubAuth, validateAuth, ensureGitHubAuth } from "../lib/github/auth.ts"
import { createWorkstreamBranch, formatBranchName } from "../lib/github/branches.ts"
import { createThreadIssue, storeThreadIssueMeta, type CreateThreadIssueInput } from "../lib/github/issues.ts"
import { ensureWorkstreamLabels } from "../lib/github/labels.ts"
import { syncIssueStates, type SyncIssueStatesResult } from "../lib/github/sync.ts"
import type { Task } from "../lib/types.ts"

type Subcommand = "enable" | "disable" | "status" | "create-branch" | "create-issues" | "sync"

const SUBCOMMANDS: Subcommand[] = ["enable", "disable", "status", "create-branch", "create-issues", "sync"]

function printHelp(): void {
  console.log(`
work github - GitHub integration management

Usage:
  work github <subcommand> [options]

Subcommands:
  enable        Enable GitHub integration (auto-detects repo)
  disable       Disable GitHub integration
  status        Show config and auth status
  create-branch Create workstream branch on GitHub
  create-issues Create issues for threads
  sync          Sync issue states with local task status

Run 'work github <subcommand> --help' for more information on a subcommand.
`)
}

function printEnableHelp(): void {
  console.log(`
work github enable - Enable GitHub integration

Usage:
  work github enable [options]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --help, -h       Show this help message

Description:
  Enables GitHub integration by auto-detecting the repository from the
  git remote 'origin'. Saves configuration to work/github.json.

Examples:
  # Enable GitHub integration
  work github enable
`)
}

function printDisableHelp(): void {
  console.log(`
work github disable - Disable GitHub integration

Usage:
  work github disable [options]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --help, -h       Show this help message

Description:
  Disables GitHub integration. Configuration is preserved but integration
  is marked as disabled.

Examples:
  # Disable GitHub integration
  work github disable
`)
}

function printStatusHelp(): void {
  console.log(`
work github status - Show GitHub integration status

Usage:
  work github status [options]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --help, -h       Show this help message

Description:
  Shows the current GitHub integration configuration, authentication
  status, and repository information.

Examples:
  # Show GitHub integration status
  work github status
`)
}

function printCreateIssuesHelp(): void {
  console.log(`
work github create-issues - Create GitHub issues for threads

Usage:
  work github create-issues [options]

Options:
  --stream, -s   Workstream ID or name (uses current if omitted)
  --batch, -b    Create issues for threads in batch (e.g., "01.01")
  --stage, -st   Create issues for all threads in stage (e.g., 1)
  --json, -j     Output as JSON
  --help, -h     Show this help message

Description:
  Creates GitHub issues for workstream threads. Each thread gets one issue
  that tracks all tasks within that thread.

  When no filter is specified, creates issues for all threads that don't
  already have an issue (pending threads).

Examples:
  # Create issues for a specific batch
  work github create-issues --batch "01.01"

  # Create issues for all threads in stage 1
  work github create-issues --stage 1

  # Create issues for all pending threads
  work github create-issues

  # Create issues for specific workstream
  work github create-issues --stream "002-github-integration" --stage 1
`)
}

function printCreateBranchHelp(): void {
  console.log(`
work github create-branch - Create workstream branch on GitHub

Usage:
  work github create-branch [options]

Options:
  --stream, -s   Workstream ID or name (uses current if omitted)
  --from, -f     Base branch to create from (default: main)
  --help, -h     Show this help message

Examples:
  # Create branch for current workstream
  work github create-branch

  # Create branch for specific workstream
  work github create-branch --stream "002-github-integration"

  # Create branch from specific base
  work github create-branch --from develop
`)
}

function printSyncHelp(): void {
  console.log(`
work github sync - Sync issue states with local task status

Usage:
  work github sync [options]

Options:
  --stream, -s   Workstream ID or name (uses current if omitted)
  --json, -j     Output as JSON
  --help, -h     Show this help message

Description:
  Synchronizes GitHub issue states with local task status. For completed
  threads with open issues, this command closes the issues and updates
  the github_issue.state in tasks.json.

  Reports: "Closed N issues, M unchanged"

Examples:
  # Sync all issue states for current workstream
  work github sync

  # Sync for specific workstream
  work github sync --stream "002-github-integration"

  # Output as JSON
  work github sync --json
`)
}

// ============================================
// THREAD INFO TYPES AND HELPERS
// ============================================

interface ThreadInfo {
  stageId: string
  stageName: string
  batchId: string
  batchName: string
  threadId: string
  threadName: string
  threadKey: string // stageId.batchId.threadId
  tasks: Task[]
}

/**
 * Group tasks by thread, returning thread info with all related tasks
 */
function groupTasksByThread(tasks: Task[]): Map<string, ThreadInfo> {
  const threads = new Map<string, ThreadInfo>()

  for (const task of tasks) {
    const { stage, batch, thread } = parseTaskId(task.id)
    const stageId = stage.toString().padStart(2, "0")
    const batchId = batch.toString().padStart(2, "0")
    const threadId = thread.toString().padStart(2, "0")
    const threadKey = `${stageId}.${batchId}.${threadId}`

    if (!threads.has(threadKey)) {
      threads.set(threadKey, {
        stageId,
        stageName: task.stage_name,
        batchId,
        batchName: task.batch_name,
        threadId,
        threadName: task.thread_name,
        threadKey,
        tasks: [],
      })
    }

    threads.get(threadKey)!.tasks.push(task)
  }

  return threads
}

/**
 * Filter threads by batch ID (e.g., "01.01")
 */
function filterThreadsByBatch(threads: Map<string, ThreadInfo>, batchFilter: string): Map<string, ThreadInfo> {
  const filtered = new Map<string, ThreadInfo>()
  
  for (const [key, info] of threads) {
    const batchKey = `${info.stageId}.${info.batchId}`
    if (batchKey === batchFilter) {
      filtered.set(key, info)
    }
  }

  return filtered
}

/**
 * Filter threads by stage number
 */
function filterThreadsByStage(threads: Map<string, ThreadInfo>, stageNum: number): Map<string, ThreadInfo> {
  const filtered = new Map<string, ThreadInfo>()
  const stageId = stageNum.toString().padStart(2, "0")
  
  for (const [key, info] of threads) {
    if (info.stageId === stageId) {
      filtered.set(key, info)
    }
  }

  return filtered
}

/**
 * Filter threads that don't already have issues (pending threads)
 */
function filterPendingThreads(threads: Map<string, ThreadInfo>): Map<string, ThreadInfo> {
  const filtered = new Map<string, ThreadInfo>()
  
  for (const [key, info] of threads) {
    // A thread is "pending" if none of its tasks have a GitHub issue
    const hasIssue = info.tasks.some(t => t.github_issue?.number)
    if (!hasIssue) {
      filtered.set(key, info)
    }
  }

  return filtered
}

interface CreateIssuesResult {
  created: { threadKey: string; threadName: string; issueUrl: string; issueNumber: number }[]
  skipped: { threadKey: string; threadName: string; reason: string }[]
  failed: { threadKey: string; threadName: string; error: string }[]
}

/**
 * Create issues for the given threads
 */
async function createIssuesForThreads(
  repoRoot: string,
  streamId: string,
  streamName: string,
  threads: Map<string, ThreadInfo>
): Promise<CreateIssuesResult> {
  const result: CreateIssuesResult = {
    created: [],
    skipped: [],
    failed: [],
  }

  // Ensure labels exist first
  await ensureWorkstreamLabels(repoRoot, streamId)

  for (const [threadKey, info] of threads) {
    // Skip if already has an issue
    const existingIssue = info.tasks.find(t => t.github_issue?.number)
    if (existingIssue) {
      result.skipped.push({
        threadKey,
        threadName: info.threadName,
        reason: `Already has issue #${existingIssue.github_issue!.number}`,
      })
      continue
    }

    // Create the issue
    try {
      // Build issue body from first task's name or thread name
      const firstTask = info.tasks[0]
      const summary = firstTask?.name || info.threadName
      const taskList = info.tasks.map(t => `- [ ] ${t.id}: ${t.name}`).join("\n")
      const details = `## Tasks\n\n${taskList}`

      const input: CreateThreadIssueInput = {
        summary,
        details,
        streamId,
        streamName,
        stageId: info.stageId,
        stageName: info.stageName,
        batchId: info.batchId,
        batchName: info.batchName,
        threadId: info.threadId,
        threadName: info.threadName,
      }

      const meta = await createThreadIssue(repoRoot, input)
      
      if (meta && meta.issue_number && meta.issue_url) {
        // Store the issue metadata on the first task of the thread
        if (firstTask) {
          storeThreadIssueMeta(repoRoot, streamId, firstTask.id, meta)
        }

        result.created.push({
          threadKey,
          threadName: info.threadName,
          issueUrl: meta.issue_url,
          issueNumber: meta.issue_number,
        })
      } else {
        result.skipped.push({
          threadKey,
          threadName: info.threadName,
          reason: "GitHub integration not enabled or configured",
        })
      }
    } catch (error) {
      result.failed.push({
        threadKey,
        threadName: info.threadName,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return result
}

// ============================================
// CREATE-BRANCH ARGS
// ============================================

interface CreateBranchArgs {
  repoRoot?: string
  streamId?: string
  fromRef?: string
}

function parseCreateBranchArgs(argv: string[]): CreateBranchArgs | null {
  const args = argv.slice(3) // Skip: bun, work-github, create-branch
  const parsed: CreateBranchArgs = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case "--repo-root":
      case "-r":
        if (!next) {
          console.error("Error: --repo-root requires a value")
          return null
        }
        parsed.repoRoot = next
        i++
        break

      case "--stream":
      case "-s":
        if (!next) {
          console.error("Error: --stream requires a value")
          return null
        }
        parsed.streamId = next
        i++
        break

      case "--from":
      case "-f":
        if (!next) {
          console.error("Error: --from requires a value")
          return null
        }
        parsed.fromRef = next
        i++
        break

      case "--help":
      case "-h":
        printCreateBranchHelp()
        process.exit(0)
    }
  }

  return parsed
}

async function createBranchCommand(argv: string[]): Promise<void> {
  const cliArgs = parseCreateBranchArgs(argv)
  if (!cliArgs) {
    console.error("\nRun 'work github create-branch --help' for usage information.")
    process.exit(1)
  }

  // Auto-detect repo root if not provided
  let repoRoot: string
  try {
    repoRoot = cliArgs.repoRoot ?? getRepoRoot()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  // Check if GitHub is enabled
  const enabled = await isGitHubEnabled(repoRoot)
  if (!enabled) {
    console.error("Error: GitHub integration is not enabled.")
    console.error("Run 'work github enable' first.")
    process.exit(1)
  }

  // Load index and resolve stream
  let index
  try {
    index = loadIndex(repoRoot)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  const resolvedStreamId = resolveStreamId(index, cliArgs.streamId)
  if (!resolvedStreamId) {
    console.error("Error: No workstream specified and no current workstream set.")
    console.error("Use --stream to specify a workstream, or run 'work current --set <stream>'")
    process.exit(1)
  }

  // Find the stream
  const stream = index.streams.find(
    (s) => s.id === resolvedStreamId || s.name === resolvedStreamId
  )
  if (!stream) {
    console.error(`Error: Workstream "${resolvedStreamId}" not found`)
    process.exit(1)
  }

  // Check if branch already exists in metadata
  if (stream.github?.branch) {
    console.log(`Branch already exists: ${stream.github.branch}`)
    console.log("To checkout, run:")
    console.log(`  git checkout ${stream.github.branch}`)
    return
  }

  // Create the branch
  console.log(`Creating branch for workstream: ${stream.id}`)
  if (cliArgs.fromRef) {
    console.log(`Base branch: ${cliArgs.fromRef}`)
  }

  try {
    const result = await createWorkstreamBranch(repoRoot, stream.id, cliArgs.fromRef)
    
    console.log("")
    console.log("Branch created and checked out successfully!")
    console.log("")
    console.log(`  Branch: ${result.branchName}`)
    console.log(`  SHA:    ${result.sha.substring(0, 7)}`)
    console.log(`  URL:    ${result.url}`)
    console.log("")
    console.log("You are now on the workstream branch.")
  } catch (e) {
    const error = e as Error
    console.error(`Error creating branch: ${error.message}`)
    process.exit(1)
  }
}

// ============================================
// CREATE-ISSUES COMMAND
// ============================================

interface CreateIssuesArgs {
  repoRoot?: string
  streamId?: string
  batch?: string
  stage?: number
  json: boolean
}

function parseCreateIssuesArgs(argv: string[]): CreateIssuesArgs | null {
  const args = argv.slice(3) // Skip: bun, work-github, create-issues
  const parsed: CreateIssuesArgs = { json: false }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case "--repo-root":
      case "-r":
        if (!next) {
          console.error("Error: --repo-root requires a value")
          return null
        }
        parsed.repoRoot = next
        i++
        break

      case "--stream":
      case "-s":
        if (!next) {
          console.error("Error: --stream requires a value")
          return null
        }
        parsed.streamId = next
        i++
        break

      case "--batch":
      case "-b":
        if (!next) {
          console.error("Error: --batch requires a value")
          return null
        }
        parsed.batch = next
        i++
        break

      case "--stage":
      case "-st":
        if (!next) {
          console.error("Error: --stage requires a value")
          return null
        }
        parsed.stage = parseInt(next, 10)
        if (isNaN(parsed.stage)) {
          console.error("Error: --stage must be a number")
          return null
        }
        i++
        break

      case "--json":
      case "-j":
        parsed.json = true
        break

      case "--help":
      case "-h":
        printCreateIssuesHelp()
        process.exit(0)
    }
  }

  return parsed
}

async function createIssuesCommand(argv: string[]): Promise<void> {
  const cliArgs = parseCreateIssuesArgs(argv)
  if (!cliArgs) {
    console.error("\nRun 'work github create-issues --help' for usage information.")
    process.exit(1)
  }

  // Auto-detect repo root if not provided
  let repoRoot: string
  try {
    repoRoot = cliArgs.repoRoot ?? getRepoRoot()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  // Check if GitHub is enabled
  const enabled = await isGitHubEnabled(repoRoot)
  if (!enabled) {
    console.error("Error: GitHub integration is not enabled")
    console.error("Run 'work github enable' to enable it")
    process.exit(1)
  }

  // Ensure auth is available
  try {
    await ensureGitHubAuth()
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`)
    process.exit(1)
  }

  // Load index and get stream
  let index
  try {
    index = loadIndex(repoRoot)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  const resolvedStreamId = resolveStreamId(index, cliArgs.streamId)
  if (!resolvedStreamId) {
    console.error("Error: No workstream specified and no current workstream set.")
    console.error("Use --stream to specify a workstream, or run 'work current --set <stream>'")
    process.exit(1)
  }

  const stream = getStream(index, resolvedStreamId)

  // Load tasks
  const tasksFile = readTasksFile(repoRoot, stream.id)
  if (!tasksFile || tasksFile.tasks.length === 0) {
    console.error("Error: No tasks found for workstream")
    process.exit(1)
  }

  // Group tasks by thread
  let threads = groupTasksByThread(tasksFile.tasks)

  // Apply filters based on args
  if (cliArgs.batch) {
    threads = filterThreadsByBatch(threads, cliArgs.batch)
    if (threads.size === 0) {
      console.error(`Error: No threads found for batch "${cliArgs.batch}"`)
      process.exit(1)
    }
  } else if (cliArgs.stage !== undefined) {
    threads = filterThreadsByStage(threads, cliArgs.stage)
    if (threads.size === 0) {
      console.error(`Error: No threads found for stage ${cliArgs.stage}`)
      process.exit(1)
    }
  } else {
    // No filter specified - create issues for all pending threads
    threads = filterPendingThreads(threads)
    if (threads.size === 0) {
      if (cliArgs.json) {
        console.log(JSON.stringify({ message: "All threads already have issues" }, null, 2))
      } else {
        console.log("All threads already have issues")
      }
      return
    }
  }

  // Create issues
  const result = await createIssuesForThreads(repoRoot, stream.id, stream.name, threads)

  // Output results
  if (cliArgs.json) {
    console.log(JSON.stringify({
      streamId: stream.id,
      streamName: stream.name,
      ...result,
    }, null, 2))
  } else {
    if (result.created.length > 0) {
      console.log(`Created ${result.created.length} issue(s):`)
      for (const item of result.created) {
        console.log(`  [${item.threadKey}] ${item.threadName}`)
        console.log(`    ${item.issueUrl}`)
      }
    }

    if (result.skipped.length > 0) {
      console.log(`\nSkipped ${result.skipped.length} thread(s):`)
      for (const item of result.skipped) {
        console.log(`  [${item.threadKey}] ${item.threadName}: ${item.reason}`)
      }
    }

    if (result.failed.length > 0) {
      console.log(`\nFailed ${result.failed.length} thread(s):`)
      for (const item of result.failed) {
        console.log(`  [${item.threadKey}] ${item.threadName}: ${item.error}`)
      }
    }

    if (result.created.length === 0 && result.skipped.length === 0 && result.failed.length === 0) {
      console.log("No threads to process")
    }
  }
}

// ============================================
// SUBCOMMAND: enable
// ============================================

interface EnableDisableStatusArgs {
  repoRoot?: string
}

function parseSimpleArgs(argv: string[], commandIndex: number): EnableDisableStatusArgs | null {
  const args = argv.slice(commandIndex + 1)
  const parsed: EnableDisableStatusArgs = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case "--repo-root":
      case "-r":
        if (!next) {
          console.error("Error: --repo-root requires a value")
          return null
        }
        parsed.repoRoot = next
        i++
        break

      case "--help":
      case "-h":
        return null // Signal to show help
    }
  }

  return parsed
}

async function enableCommand(argv: string[]): Promise<void> {
  const args = argv.slice(2)
  if (args.includes("--help") || args.includes("-h")) {
    printEnableHelp()
    process.exit(0)
  }

  const cliArgs = parseSimpleArgs(argv, 2)
  
  // Auto-detect repo root if not provided
  let repoRoot: string
  try {
    repoRoot = cliArgs?.repoRoot ?? getRepoRoot()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  console.log("Enabling GitHub integration...")

  try {
    await enableGitHub(repoRoot)
    const config = await loadGitHubConfig(repoRoot)
    console.log(`GitHub integration enabled for ${config.owner}/${config.repo}`)
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`)
    process.exit(1)
  }
}

// ============================================
// SUBCOMMAND: disable
// ============================================

async function disableCommand(argv: string[]): Promise<void> {
  const args = argv.slice(2)
  if (args.includes("--help") || args.includes("-h")) {
    printDisableHelp()
    process.exit(0)
  }

  const cliArgs = parseSimpleArgs(argv, 2)
  
  // Auto-detect repo root if not provided
  let repoRoot: string
  try {
    repoRoot = cliArgs?.repoRoot ?? getRepoRoot()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  console.log("Disabling GitHub integration...")

  try {
    await disableGitHub(repoRoot)
    console.log("GitHub integration disabled")
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`)
    process.exit(1)
  }
}

// ============================================
// SUBCOMMAND: status
// ============================================

async function statusCommand(argv: string[]): Promise<void> {
  const args = argv.slice(2)
  if (args.includes("--help") || args.includes("-h")) {
    printStatusHelp()
    process.exit(0)
  }

  const cliArgs = parseSimpleArgs(argv, 2)
  
  // Auto-detect repo root if not provided
  let repoRoot: string
  try {
    repoRoot = cliArgs?.repoRoot ?? getRepoRoot()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  const config = await loadGitHubConfig(repoRoot)

  console.log("GitHub Integration Status")
  console.log("=".repeat(40))
  console.log()

  // Enabled status
  console.log(`Enabled:       ${config.enabled ? "Yes" : "No"}`)

  // Repository
  if (config.owner && config.repo) {
    console.log(`Repository:    ${config.owner}/${config.repo}`)
  } else {
    console.log("Repository:    Not configured")
  }

  // Branch prefix
  console.log(`Branch Prefix: ${config.branch_prefix}`)
  console.log()

  // Authentication status
  console.log("Authentication:")
  const token = getGitHubAuth()
  if (token) {
    const isValid = await validateAuth(token)
    const source = process.env.GITHUB_TOKEN
      ? "GITHUB_TOKEN"
      : process.env.GH_TOKEN
        ? "GH_TOKEN"
        : "gh CLI"
    console.log(`  Source:      ${source}`)
    console.log(`  Valid:       ${isValid ? "Yes" : "No"}`)
  } else {
    console.log("  Status:      Not authenticated")
    console.log("  Hint:        Set GITHUB_TOKEN, GH_TOKEN, or run 'gh auth login'")
  }

  console.log()

  // Label configuration
  console.log("Label Configuration:")
  console.log(`  Workstream:  ${config.label_config.workstream.prefix} (color: #${config.label_config.workstream.color})`)
  console.log(`  Stage:       ${config.label_config.stage.prefix} (color: #${config.label_config.stage.color})`)
  console.log(`  Batch:       ${config.label_config.batch.prefix} (color: #${config.label_config.batch.color})`)
  console.log(`  Thread:      ${config.label_config.thread.prefix} (color: #${config.label_config.thread.color})`)
}

// ============================================
// SUBCOMMAND: sync
// ============================================

interface SyncArgs {
  repoRoot?: string
  streamId?: string
  json: boolean
}

function parseSyncArgs(argv: string[]): SyncArgs | null {
  const args = argv.slice(3) // Skip: bun, work-github, sync
  const parsed: SyncArgs = { json: false }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case "--repo-root":
      case "-r":
        if (!next) {
          console.error("Error: --repo-root requires a value")
          return null
        }
        parsed.repoRoot = next
        i++
        break

      case "--stream":
      case "-s":
        if (!next) {
          console.error("Error: --stream requires a value")
          return null
        }
        parsed.streamId = next
        i++
        break

      case "--json":
      case "-j":
        parsed.json = true
        break

      case "--help":
      case "-h":
        printSyncHelp()
        process.exit(0)
    }
  }

  return parsed
}

async function syncCommand(argv: string[]): Promise<void> {
  const cliArgs = parseSyncArgs(argv)
  if (!cliArgs) {
    console.error("\nRun 'work github sync --help' for usage information.")
    process.exit(1)
  }

  // Auto-detect repo root if not provided
  let repoRoot: string
  try {
    repoRoot = cliArgs.repoRoot ?? getRepoRoot()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  // Check if GitHub is enabled
  const enabled = await isGitHubEnabled(repoRoot)
  if (!enabled) {
    console.error("Error: GitHub integration is not enabled")
    console.error("Run 'work github enable' to enable it")
    process.exit(1)
  }

  // Ensure auth is available
  try {
    await ensureGitHubAuth()
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`)
    process.exit(1)
  }

  // Load index and get stream
  let index
  try {
    index = loadIndex(repoRoot)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  const resolvedStreamId = resolveStreamId(index, cliArgs.streamId)
  if (!resolvedStreamId) {
    console.error("Error: No workstream specified and no current workstream set.")
    console.error("Use --stream to specify a workstream, or run 'work current --set <stream>'")
    process.exit(1)
  }

  const stream = getStream(index, resolvedStreamId)

  // Sync issue states
  if (!cliArgs.json) {
    console.log(`Syncing issue states for workstream: ${stream.id}`)
    console.log("")
  }

  let result: SyncIssueStatesResult
  try {
    result = await syncIssueStates(repoRoot, stream.id)
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`)
    process.exit(1)
  }

  // Output results
  if (cliArgs.json) {
    console.log(JSON.stringify({
      streamId: stream.id,
      streamName: stream.name,
      ...result,
    }, null, 2))
  } else {
    // Report closed issues
    if (result.closed.length > 0) {
      console.log(`Closed ${result.closed.length} issue(s):`)
      for (const item of result.closed) {
        console.log(`  [${item.threadKey}] ${item.threadName}`)
        console.log(`    #${item.issueNumber}: ${item.issueUrl}`)
      }
      console.log("")
    }

    // Report unchanged issues
    if (result.unchanged.length > 0) {
      console.log(`Unchanged ${result.unchanged.length} issue(s):`)
      for (const item of result.unchanged) {
        console.log(`  [${item.threadKey}] ${item.threadName}: ${item.reason}`)
      }
      console.log("")
    }

    // Report errors
    if (result.errors.length > 0) {
      console.log(`Errors ${result.errors.length}:`)
      for (const item of result.errors) {
        console.log(`  [${item.threadKey}] ${item.threadName}: ${item.error}`)
      }
      console.log("")
    }

    // Summary
    const closedCount = result.closed.length
    const unchangedCount = result.unchanged.length
    const errorCount = result.errors.length

    if (closedCount === 0 && unchangedCount === 0 && errorCount === 0) {
      console.log("No issues to sync (no threads have associated GitHub issues)")
    } else {
      console.log(`Summary: Closed ${closedCount} issues, ${unchangedCount} unchanged`)
      if (errorCount > 0) {
        console.log(`  ${errorCount} error(s) occurred`)
      }
    }
  }
}

// ============================================
// MAIN
// ============================================

export function main(argv: string[] = process.argv): void {
  const args = argv.slice(2)

  if (args.length === 0) {
    printHelp()
    process.exit(0)
  }

  const firstArg = args[0]

  if (firstArg === "--help" || firstArg === "-h") {
    printHelp()
    process.exit(0)
  }

  if (!SUBCOMMANDS.includes(firstArg as Subcommand)) {
    console.error(`Error: Unknown subcommand "${firstArg}"`)
    console.error("\nAvailable subcommands: " + SUBCOMMANDS.join(", "))
    console.error("\nRun 'work github --help' for usage information.")
    process.exit(1)
  }

  const subcommand = firstArg as Subcommand

  switch (subcommand) {
    case "enable":
      enableCommand(argv)
      break

    case "disable":
      disableCommand(argv)
      break

    case "status":
      statusCommand(argv)
      break

    case "create-branch":
      createBranchCommand(argv)
      break

    case "create-issues":
      createIssuesCommand(argv)
      break

    case "sync":
      syncCommand(argv)
      break
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
