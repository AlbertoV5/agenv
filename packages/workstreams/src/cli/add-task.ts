/**
 * CLI: Add Task
 *
 * Add a new task to a workstream's tasks.json
 * Supports interactive mode when stage/batch/thread are not provided.
 */

import { readFileSync } from "fs"
import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { addTasks, getTasks, formatTaskId } from "../lib/tasks.ts"
import { canCreateTasks, checkAndRevokeIfModified } from "../lib/approval.ts"
import { getStreamPlanMdPath } from "../lib/consolidate.ts"
import { parseStreamDocument } from "../lib/stream-parser.ts"
import {
  createReadlineInterface,
  selectStage,
  selectBatch,
  selectThread,
  promptText,
} from "../lib/interactive.ts"
import { resolveByNameOrIndex } from "../lib/utils.ts"
import type { Task, ConsolidateError } from "../lib/types.ts"

interface AddTaskCliArgs {
  repoRoot?: string
  streamId?: string
  stage: string // Can be number or name
  batch: string // Can be number or name
  thread: string // Can be number or name
  name?: string
  json: boolean
}

function printHelp(): void {
  console.log(`
work add-task - Add a task to a workstream

Usage:
  work add-task [--stage <n|name> --batch <n|name> --thread <n|name> --name "Task description"]

Interactive Mode:
  Run without stage/batch/thread flags to select interactively:
    work add-task

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --stage          Stage number or name (e.g., 1 or "setup")
  --batch, -b      Batch number or name (e.g., 1 or "core-setup")
  --thread, -t     Thread number or name (e.g., 2 or "migrations")
  --name, -n       Task description
  --json, -j       Output as JSON
  --help, -h       Show this help message

Description:
  Adds a new task to the workstream's tasks.json file. The task ID is automatically
  generated based on the stage, batch, thread, and the next available task number.

  If stage, batch, or thread are not specified, interactive mode is enabled
  where you can select from the available options in PLAN.md.

  Task ID format: {stage}.{batch}.{thread}.{task} (e.g., 01.01.02.03)
  All numbers are zero-padded for consistent sorting.

Examples:
  # Interactive mode - select stage, batch, thread
  work add-task

  # Add a task using indices
  work add-task --stage 1 --batch 1 --thread 2 --name "Implement login form"

  # Add a task using names (case-insensitive, partial match supported)
  work add-task --stage "setup" --batch "core" --thread "config" --name "Add env vars"

  # Mix indices and names
  work add-task --stage 1 --batch "init" --thread 2 --name "Set up database"

  # Add task to specific workstream
  work add-task --stream "001-my-stream" --stage 1 --batch 1 --thread 2 --name "Implement login form"
`)
}

function parseCliArgs(argv: string[]): AddTaskCliArgs | null {
  const args = argv.slice(2)
  const parsed: AddTaskCliArgs = { stage: "", batch: "", thread: "", json: false }

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
        parsed.stage = next
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

      case "--thread":
      case "-t":
        if (!next) {
          console.error("Error: --thread requires a value")
          return null
        }
        parsed.thread = next
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
function getNextTaskNumber(
  tasks: Task[],
  stage: number,
  batch: number,
  thread: number,
): number {
  const stageStr = stage.toString().padStart(2, "0")
  const batchStr = batch.toString().padStart(2, "0")
  const threadStr = thread.toString().padStart(2, "0")
  const prefix = `${stageStr}.${batchStr}.${threadStr}.`
  const existingTasks = tasks.filter((t) => t.id.startsWith(prefix))

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

export async function main(argv: string[] = process.argv): Promise<void> {
  const cliArgs = parseCliArgs(argv)
  if (!cliArgs) {
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

  // We need to parse PLAN.md to resolve names to IDs and for interactive mode
  const planMdPath = getStreamPlanMdPath(repoRoot, stream.id)
  let content: string
  try {
    content = readFileSync(planMdPath, "utf-8")
  } catch (e) {
    console.error(`Error: Could not read PLAN.md: ${(e as Error).message}`)
    process.exit(1)
  }

  const errors: ConsolidateError[] = []
  const doc = parseStreamDocument(content, errors)

  if (!doc || doc.stages.length === 0) {
    console.error("Error: No stages found in PLAN.md")
    process.exit(1)
  }

  // Check if interactive mode is needed
  const needsInteractive =
    cliArgs.stage === "" ||
    cliArgs.batch === "" ||
    cliArgs.thread === "" ||
    !cliArgs.name

  // Resolved numeric IDs
  let stageId: number
  let batchId: number
  let threadId: number

  if (needsInteractive) {
    const rl = createReadlineInterface()

    try {
      // Interactive or name-based stage selection
      if (cliArgs.stage === "") {
        const result = await selectStage(rl, doc.stages)
        stageId = result.value.id
      } else {
        const resolved = resolveByNameOrIndex(cliArgs.stage, doc.stages, "Stage")
        stageId = resolved.id
      }

      const selectedStage = doc.stages.find((s) => s.id === stageId)
      if (!selectedStage) {
        console.error(`Error: Stage ${stageId} not found`)
        rl.close()
        process.exit(1)
      }

      if (selectedStage.batches.length === 0) {
        console.error(`Error: No batches found in Stage ${stageId}`)
        rl.close()
        process.exit(1)
      }

      // Interactive or name-based batch selection
      if (cliArgs.batch === "") {
        const result = await selectBatch(rl, selectedStage.batches)
        batchId = result.value.id
      } else {
        const resolved = resolveByNameOrIndex(
          cliArgs.batch,
          selectedStage.batches,
          "Batch",
        )
        batchId = resolved.id
      }

      const selectedBatch = selectedStage.batches.find((b) => b.id === batchId)
      if (!selectedBatch) {
        console.error(`Error: Batch ${batchId} not found in Stage ${stageId}`)
        rl.close()
        process.exit(1)
      }

      if (selectedBatch.threads.length === 0) {
        console.error(`Error: No threads found in Batch ${batchId}`)
        rl.close()
        process.exit(1)
      }

      // Interactive or name-based thread selection
      if (cliArgs.thread === "") {
        const result = await selectThread(rl, selectedBatch.threads)
        threadId = result.value.id
      } else {
        const resolved = resolveByNameOrIndex(
          cliArgs.thread,
          selectedBatch.threads,
          "Thread",
        )
        threadId = resolved.id
      }

      // Get task name if not provided
      if (!cliArgs.name) {
        cliArgs.name = await promptText(rl, "\nTask name: ")
        if (!cliArgs.name.trim()) {
          console.error("Error: Task name cannot be empty")
          rl.close()
          process.exit(1)
        }
      }

      rl.close()
    } catch (e) {
      rl.close()
      console.error((e as Error).message)
      process.exit(1)
    }
  } else {
    // Non-interactive mode: resolve all names to IDs
    try {
      const resolvedStage = resolveByNameOrIndex(cliArgs.stage, doc.stages, "Stage")
      stageId = resolvedStage.id

      const selectedStage = doc.stages.find((s) => s.id === stageId)!
      const resolvedBatch = resolveByNameOrIndex(
        cliArgs.batch,
        selectedStage.batches,
        "Batch",
      )
      batchId = resolvedBatch.id

      const selectedBatch = selectedStage.batches.find((b) => b.id === batchId)!
      const resolvedThread = resolveByNameOrIndex(
        cliArgs.thread,
        selectedBatch.threads,
        "Thread",
      )
      threadId = resolvedThread.id
    } catch (e) {
      console.error((e as Error).message)
      process.exit(1)
    }
  }

  // At this point all required args should be set
  if (!cliArgs.name) {
    console.error("Error: --name is required")
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  // Check if plan was modified and auto-revoke if needed
  const { revoked, stream: updatedStream } = checkAndRevokeIfModified(
    repoRoot,
    stream,
  )
  if (revoked) {
    console.error(
      "Error: Plan was modified since approval. Re-approval required.",
    )
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

  // Get stage/batch/thread names for task metadata
  const selectedStage = doc.stages.find((s) => s.id === stageId)!
  const selectedBatch = selectedStage.batches.find((b) => b.id === batchId)!
  const selectedThread = selectedBatch.threads.find((t) => t.id === threadId)!

  // Get existing tasks to determine next task number
  const existingTasks = getTasks(repoRoot, stream.id)
  const nextTaskNum = getNextTaskNumber(
    existingTasks,
    stageId,
    batchId,
    threadId,
  )
  const taskId = formatTaskId(stageId, batchId, threadId, nextTaskNum)

  // Create the new task with actual names from PLAN.md
  const now = new Date().toISOString()
  const newTask: Task = {
    id: taskId,
    name: cliArgs.name,
    thread_name: selectedThread.name || `Thread ${threadId}`,
    batch_name: selectedBatch.name || `Batch ${batchId.toString().padStart(2, "0")}`,
    stage_name: selectedStage.name || `Stage ${stageId}`,
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
