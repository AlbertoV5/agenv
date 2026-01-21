#!/usr/bin/env bun
/**
 * Test GitHub sync functionality
 * Usage: bun run ./scripts/check-github-sync.ts
 *
 * Tests the sync functions directly without using the CLI
 */

import { getGitHubAuth } from "../packages/workstreams/src/lib/github/auth.ts"
import { loadGitHubConfig, isGitHubEnabled } from "../packages/workstreams/src/lib/github/config.ts"
import {
  isThreadComplete,
  checkAndCloseThreadIssue,
  syncIssueStates,
  createIssuesForWorkstream,
} from "../packages/workstreams/src/lib/github/sync.ts"
import { loadIndex } from "../packages/workstreams/src/lib/index.ts"
import { readTasksFile, parseTaskId } from "../packages/workstreams/src/lib/tasks.ts"

const repoRoot = process.cwd()

interface ThreadSummary {
  threadKey: string
  threadName: string
  taskCount: number
  completedCount: number
  isComplete: boolean
  hasIssue: boolean
  issueNumber?: number
  issueState?: string
}

function getThreadSummaries(repoRoot: string, streamId: string): ThreadSummary[] {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return []

  const threads = new Map<string, ThreadSummary>()

  for (const task of tasksFile.tasks) {
    const { stage, batch, thread } = parseTaskId(task.id)
    const stageId = stage.toString().padStart(2, "0")
    const batchId = batch.toString().padStart(2, "0")
    const threadId = thread.toString().padStart(2, "0")
    const threadKey = `${stageId}.${batchId}.${threadId}`

    if (!threads.has(threadKey)) {
      threads.set(threadKey, {
        threadKey,
        threadName: task.thread_name,
        taskCount: 0,
        completedCount: 0,
        isComplete: false,
        hasIssue: false,
      })
    }

    const summary = threads.get(threadKey)!
    summary.taskCount++
    if (task.status === "completed" || task.status === "cancelled") {
      summary.completedCount++
    }
    if (task.github_issue) {
      summary.hasIssue = true
      summary.issueNumber = task.github_issue.number
      summary.issueState = task.github_issue.state
    }
  }

  // Calculate isComplete
  for (const summary of threads.values()) {
    summary.isComplete = summary.completedCount === summary.taskCount
  }

  return Array.from(threads.values()).sort((a, b) => a.threadKey.localeCompare(b.threadKey))
}

async function main() {
  console.log("=== GitHub Sync Test ===\n")

  // Check prerequisites
  const token = getGitHubAuth()
  if (!token) {
    console.log("❌ No GitHub authentication found!")
    process.exit(1)
  }
  console.log("✅ Authentication found")

  const enabled = await isGitHubEnabled(repoRoot)
  if (!enabled) {
    console.log("❌ GitHub integration is not enabled!")
    console.log("   Run: work github enable")
    process.exit(1)
  }
  console.log("✅ GitHub integration enabled")

  const config = await loadGitHubConfig(repoRoot)
  console.log(`✅ Repository: ${config.owner}/${config.repo}`)

  // Get current workstream
  const index = loadIndex(repoRoot)
  const currentStreamId = index.current_stream
  if (!currentStreamId) {
    console.log("\n❌ No current workstream set")
    console.log("   Run: work current --set <stream-id>")
    process.exit(1)
  }

  const stream = index.streams.find(s => s.id === currentStreamId)
  if (!stream) {
    console.log(`\n❌ Workstream "${currentStreamId}" not found`)
    process.exit(1)
  }

  console.log(`\n--- Workstream: ${stream.id} ---`)

  // Get thread summaries
  const summaries = getThreadSummaries(repoRoot, stream.id)
  if (summaries.length === 0) {
    console.log("No tasks found")
    process.exit(0)
  }

  // Display thread status
  console.log("\n--- Thread Status ---")
  console.log("Key       | Complete | Issue     | State")
  console.log("----------|----------|-----------|-------")

  let threadsWithIssues = 0
  let completedWithOpenIssues = 0

  for (const s of summaries) {
    const complete = s.isComplete ? "✅" : "❌"
    const issue = s.hasIssue ? `#${s.issueNumber?.toString().padStart(3)}` : "  -  "
    const state = s.issueState || "-"
    console.log(`${s.threadKey}  | ${complete} ${s.completedCount}/${s.taskCount}    | ${issue}     | ${state}`)

    if (s.hasIssue) threadsWithIssues++
    if (s.isComplete && s.hasIssue && s.issueState === "open") {
      completedWithOpenIssues++
    }
  }

  console.log("")
  console.log(`Total threads: ${summaries.length}`)
  console.log(`Threads with issues: ${threadsWithIssues}`)
  console.log(`Completed with open issues: ${completedWithOpenIssues}`)

  // Parse command
  const arg = process.argv[2]

  if (arg === "--check-thread") {
    const threadKey = process.argv[3]
    if (!threadKey) {
      console.log("\n❌ Please provide thread key: --check-thread <stageId.batchId.threadId>")
      process.exit(1)
    }

    const [stageId, batchId, threadId] = threadKey.split(".")
    if (!stageId || !batchId || !threadId) {
      console.log("\n❌ Invalid thread key format. Use: 01.01.01")
      process.exit(1)
    }

    console.log(`\n--- Checking Thread ${threadKey} ---`)
    const complete = isThreadComplete(repoRoot, stream.id, stageId, batchId, threadId)
    console.log(`Thread complete: ${complete ? "Yes" : "No"}`)
  } else if (arg === "--dry-run") {
    console.log("\n--- Sync Dry Run ---")
    console.log("Would sync the following:")

    for (const s of summaries) {
      if (s.isComplete && s.hasIssue && s.issueState === "open") {
        console.log(`  Close #${s.issueNumber}: [${s.threadKey}] ${s.threadName}`)
      }
    }

    if (completedWithOpenIssues === 0) {
      console.log("  (nothing to sync)")
    }
  } else if (arg === "--sync") {
    if (completedWithOpenIssues === 0) {
      console.log("\n✅ Nothing to sync - no completed threads with open issues")
      process.exit(0)
    }

    console.log(`\n--- Running Sync ---`)
    console.log(`Will close ${completedWithOpenIssues} issue(s)`)
    console.log("\n⚠️  This will close real GitHub issues!")
    console.log("   Press Ctrl+C within 5 seconds to cancel...")

    await new Promise(resolve => setTimeout(resolve, 5000))

    try {
      const result = await syncIssueStates(repoRoot, stream.id)
      console.log("\n✅ Sync completed!")
      console.log(`   Closed: ${result.closed.length}`)
      console.log(`   Unchanged: ${result.unchanged.length}`)
      console.log(`   Errors: ${result.errors.length}`)

      if (result.closed.length > 0) {
        console.log("\nClosed issues:")
        for (const item of result.closed) {
          console.log(`   #${item.issueNumber}: [${item.threadKey}] ${item.threadName}`)
        }
      }

      if (result.errors.length > 0) {
        console.log("\nErrors:")
        for (const item of result.errors) {
          console.log(`   #${item.issueNumber}: ${item.error}`)
        }
      }
    } catch (e) {
      console.log("\n❌ Sync failed:", (e as Error).message)
    }
  } else if (arg === "--create-all") {
    console.log("\n--- Create Issues for All Threads ---")
    console.log("\n⚠️  This will create real GitHub issues!")
    console.log("   Press Ctrl+C within 5 seconds to cancel...")

    await new Promise(resolve => setTimeout(resolve, 5000))

    try {
      const result = await createIssuesForWorkstream(repoRoot, stream.id)
      console.log("\n✅ Issue creation completed!")
      console.log(`   Created: ${result.created.length}`)
      console.log(`   Skipped: ${result.skipped.length}`)
      console.log(`   Errors: ${result.errors.length}`)

      if (result.created.length > 0) {
        console.log("\nCreated issues:")
        for (const item of result.created) {
          console.log(`   #${item.issueNumber}: [${item.threadId}] ${item.threadName}`)
          console.log(`      ${item.issueUrl}`)
        }
      }
    } catch (e) {
      console.log("\n❌ Failed:", (e as Error).message)
    }
  } else {
    console.log("\n--- Commands ---")
    console.log("  --check-thread <key>  Check if a thread is complete (e.g., 01.01.01)")
    console.log("  --dry-run             Show what sync would do without executing")
    console.log("  --sync                Sync issue states (closes completed threads' issues)")
    console.log("  --create-all          Create issues for all threads without issues")
    console.log("")
    console.log("Note: --sync and --create-all have a 5-second delay before execution")
  }
}

main().catch(console.error)
