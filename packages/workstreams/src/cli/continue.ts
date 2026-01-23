/**
 * CLI: Continue (Session-aware)
 *
 * Checks for incomplete/failed threads with session history before continuing.
 * Offers options to fix failed threads or continue with the next batch.
 */

import { main as multiMain } from "./multi.ts"
import { main as fixMain } from "./fix.ts"
import { getRepoRoot, getWorkDir } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { readTasksFile } from "../lib/tasks.ts"
import { findNextIncompleteBatch } from "./multi.ts"
import {
  createReadlineInterface,
  buildThreadStatuses,
  displayThreadStatusTable,
} from "../lib/interactive.ts"

function printHelp(): void {
  console.log(`
work continue - Continue execution with session awareness

Usage:
  work continue [options]

Description:
  Finds the next incomplete batch and checks for any incomplete/failed threads
  with session history. Offers options to:
  - Continue (skip failed threads)
  - Fix first (interactive fix mode)
  - Abort

  If no issues are found, proceeds directly to execute the next batch.

Options:
  --port, -p       OpenCode server port (default: 4096)
  --dry-run        Show commands without executing
  --no-server      Skip starting opencode serve
  --repo-root, -r  Repository root
  --stream, -s     Workstream ID or name (uses current if not specified)
  --help, -h       Show this help message

Examples:
  work continue
  work continue --dry-run
`)
}

/**
 * Find incomplete or failed threads with session history from the next batch
 */
function findIncompleteThreadsInBatch(tasks: any[], batchId: string): string[] {
  const threadMap = new Map<string, any[]>()
  
  // Group tasks by thread within the specified batch
  for (const task of tasks) {
    const parts = task.id.split(".")
    if (parts.length >= 3) {
      const taskBatchId = `${parts[0]}.${parts[1]}`
      if (taskBatchId !== batchId) continue
      
      const threadId = `${parts[0]}.${parts[1]}.${parts[2]}`
      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, [])
      }
      threadMap.get(threadId)!.push(task)
    }
  }
  
  // Filter to incomplete or failed threads with session history
  const incompleteThreads: string[] = []
  for (const [threadId, threadTasks] of threadMap.entries()) {
    const allCompleted = threadTasks.every(t => t.status === "completed" || t.status === "cancelled")
    const hasSessionHistory = threadTasks.some(t => t.sessions && t.sessions.length > 0)
    
    if (!allCompleted && hasSessionHistory) {
      incompleteThreads.push(threadId)
    }
  }
  
  return incompleteThreads.sort()
}

export async function main(argv: string[] = process.argv): Promise<void> {
  // Check for help
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp()
    process.exit(0)
  }

  // Auto-detect repo root if not provided
  let repoRoot: string
  try {
    repoRoot = getRepoRoot()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  let index
  try {
    index = loadIndex(repoRoot)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  // Get stream ID from args or use current
  const streamIdArg = argv.find((arg, i) => 
    (arg === "--stream" || arg === "-s") && argv[i + 1]
  )
  const streamId = streamIdArg ? argv[argv.indexOf(streamIdArg) + 1] : undefined

  let stream
  try {
    stream = getResolvedStream(index, streamId)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  // Load tasks and find next incomplete batch
  const tasksFile = readTasksFile(repoRoot, stream.id)
  if (!tasksFile) {
    console.error(`Error: No tasks found for stream ${stream.id}`)
    process.exit(1)
  }

  const nextBatch = findNextIncompleteBatch(tasksFile.tasks)
  if (!nextBatch) {
    console.log("All batches are complete! Nothing to continue.")
    process.exit(0)
  }

  // Check for incomplete/failed threads with session history in the next batch
  const incompleteThreads = findIncompleteThreadsInBatch(tasksFile.tasks, nextBatch)
  
  if (incompleteThreads.length > 0) {
    // Display summary of issues
    console.log(`\nFound ${incompleteThreads.length} incomplete/failed thread(s) with session history in batch ${nextBatch}:\n`)
    
    const threadStatuses = buildThreadStatuses(tasksFile.tasks, incompleteThreads)
    displayThreadStatusTable(threadStatuses)
    
    // Offer interactive prompt
    const rl = createReadlineInterface()
    
    try {
      console.log("Options:")
      console.log("  1. Continue (skip failed threads)")
      console.log("  2. Fix first (interactive fix mode)")
      console.log("  3. Abort")
      
      const answer = await new Promise<string>((resolve) => {
        rl.question("\nSelect option (1-3): ", resolve)
      })
      
      rl.close()
      
      const choice = answer.trim()
      
      if (choice === "1") {
        // Continue with multi
        console.log("\nContinuing with next batch (skipping failed threads)...\n")
      } else if (choice === "2") {
        // Delegate to work fix
        console.log("\nLaunching interactive fix mode...\n")
        await fixMain(argv)
        return
      } else if (choice === "3") {
        console.log("\nAborted.")
        process.exit(0)
      } else {
        console.error(`\nInvalid option: "${choice}"`)
        process.exit(1)
      }
    } catch (err) {
      rl.close()
      throw err
    }
  } else {
    console.log(`\nContinuing with next incomplete batch: ${nextBatch}`)
  }

  // Proceed with multi --continue
  const originalArgs = argv.slice(2)
  const newArgs = [
    argv[0]!, // runtime
    argv[1]!, // script path
    "--continue",
    ...originalArgs
  ]

  // Call multiMain
  await multiMain(newArgs)
}

// Run if called directly
if (import.meta.main) {
  main()
}
