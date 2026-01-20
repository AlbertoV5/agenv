/**
 * CLI: Add Task
 *
 * Add a new task to a workstream's tasks.json
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { addTasks, getTasks, formatTaskId } from "../lib/tasks.ts"
import { canCreateTasks, checkAndRevokeIfModified } from "../lib/approval.ts"
import type { Task } from "../lib/types.ts"

interface AddTaskCliArgs {
  repoRoot?: string
  streamId?: string
  stage: number
  batch: number
  thread: number
  name?: string
  json: boolean
}

function printHelp(): void {
  console.log(`
work add-task - Add a task to a workstream

Usage:
  work add-task --stage <n> --batch <n> --thread <n> --name "Task description" [--stream <stream-id>]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --stage          Stage number (required, e.g., 1)
  --batch, -b      Batch number (required, e.g., 1 for batch 01)
  --thread, -t     Thread number (required, e.g., 2)
  --name, -n       Task description (required)
  --json, -j       Output as JSON
  --help, -h       Show this help message

Description:
  Adds a new task to the workstream's tasks.json file. The task ID is automatically
  generated based on the stage, batch, thread, and the next available task number.

  Task ID format: {stage}.{batch}.{thread}.{task} (e.g., 01.00.02.03)
  All numbers are zero-padded for consistent sorting.

Examples:
  # Add a task to stage 01, batch 00, thread 02 (uses current workstream)
  work add-task --stage 01 --batch 00 --thread 02 --name "Implement login form"

  # Add task to specific workstream
  work add-task --stream "001-my-stream" --stage 01 --batch 00 --thread 02 --name "Implement login form"
`)
}

function parseCliArgs(argv: string[]): AddTaskCliArgs | null {
  const args = argv.slice(2)
  const parsed: AddTaskCliArgs = { stage: 0, batch: -1, thread: 0, json: false }

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
      case "--plan":
      case "-p":
        if (!next) {
          console.error("Error: --stream requires a value")
          return null
        }
        parsed.streamId = next
        i++
        break

      case "--stage":
        if (!next) {
          console.error("Error: --stage requires a value")
          return null
        }
        const stageNum = parseInt(next, 10)
        if (isNaN(stageNum) || stageNum < 1) {
          console.error("Error: --stage must be a positive integer")
          return null
        }
        parsed.stage = stageNum
        i++
        break

      case "--batch":
      case "-b":
        if (!next) {
          console.error("Error: --batch requires a value")
          return null
        }
        const batchNum = parseInt(next, 10)
        if (isNaN(batchNum) || batchNum < 1) {
          console.error("Error: --batch must be a positive integer")
          return null
        }
        parsed.batch = batchNum
        i++
        break

      case "--thread":
      case "-t":
        if (!next) {
          console.error("Error: --thread requires a value")
          return null
        }
        const threadNum = parseInt(next, 10)
        if (isNaN(threadNum) || threadNum < 1) {
          console.error("Error: --thread must be a positive integer")
          return null
        }
        parsed.thread = threadNum
        i++
        break

      case "--name":
      case "-n":
        if (!next) {
          console.error("Error: --name requires a value")
          return null
        }
        parsed.name = next
        i++
        break

      case "--json":
      case "-j":
        parsed.json = true
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  return parsed
}

/**
 * Get the next task number for a given stage, batch, and thread
 */
function getNextTaskNumber(tasks: Task[], stage: number, batch: number, thread: number): number {
  const stageStr = stage.toString().padStart(2, "0")
  const batchStr = batch.toString().padStart(2, "0")
  const threadStr = thread.toString().padStart(2, "0")
  const prefix = `${stageStr}.${batchStr}.${threadStr}.`
  const existingTasks = tasks.filter(t => t.id.startsWith(prefix))

  if (existingTasks.length === 0) {
    return 1
  }

  // Find the highest task number (now at index 3 for 4-part IDs)
  let maxTaskNum = 0
  for (const task of existingTasks) {
    const parts = task.id.split(".")
    const taskNum = parseInt(parts[3] || "0", 10)
    if (taskNum > maxTaskNum) {
      maxTaskNum = taskNum
    }
  }

  return maxTaskNum + 1
}

export function main(argv: string[] = process.argv): void {
  const cliArgs = parseCliArgs(argv)
  if (!cliArgs) {
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  // Validate required args
  if (cliArgs.stage === 0) {
    console.error("Error: --stage is required")
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  if (cliArgs.batch === -1) {
    console.error("Error: --batch is required")
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  if (cliArgs.thread === 0) {
    console.error("Error: --thread is required")
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  if (!cliArgs.name) {
    console.error("Error: --name is required")
    console.error("\nRun with --help for usage information.")
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

  // Load index and find workstream (uses current if not specified)
  let index
  try {
    index = loadIndex(repoRoot)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  let stream
  try {
    stream = getResolvedStream(index, cliArgs.streamId)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  // Check if plan was modified and auto-revoke if needed
  const { revoked, stream: updatedStream } = checkAndRevokeIfModified(repoRoot, stream)
  if (revoked) {
    console.error("Error: Plan was modified since approval. Re-approval required.")
    console.error("")
    console.error("To re-approve the plan, run:")
    console.error(`  work approve --stream "${stream.id}"`)
    process.exit(1)
  }
  stream = updatedStream

  // Check approval status
  const { allowed, reason } = canCreateTasks(stream)
  if (!allowed) {
    console.error(`Error: ${reason}`)
    console.error("")
    console.error("To approve the plan, run:")
    console.error(`  work approve --stream "${stream.id}"`)
    process.exit(1)
  }

  // Get existing tasks to determine next task number
  const existingTasks = getTasks(repoRoot, stream.id)
  const nextTaskNum = getNextTaskNumber(existingTasks, cliArgs.stage, cliArgs.batch, cliArgs.thread)
  const taskId = formatTaskId(cliArgs.stage, cliArgs.batch, cliArgs.thread, nextTaskNum)

  // Create the new task
  const batchStr = cliArgs.batch.toString().padStart(2, "0")
  const now = new Date().toISOString()
  const newTask: Task = {
    id: taskId,
    name: cliArgs.name,
    thread_name: `Thread ${cliArgs.thread}`,
    batch_name: `Batch ${batchStr}`,
    stage_name: `Stage ${cliArgs.stage}`,
    created_at: now,
    updated_at: now,
    status: "pending",
  }

  // Add the task
  addTasks(repoRoot, stream.id, [newTask])

  if (cliArgs.json) {
    console.log(JSON.stringify(newTask, null, 2))
  } else {
    console.log(`Added task ${taskId}: ${cliArgs.name}`)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
