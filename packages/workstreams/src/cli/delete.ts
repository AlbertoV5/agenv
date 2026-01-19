/**
 * CLI: Delete
 *
 * Delete workstreams, stages, threads, or individual tasks.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream, deleteStream } from "../lib/index.ts"
import {
  deleteTask,
  deleteTasksByStage,
  deleteTasksByBatch,
  deleteTasksByThread,
  parseTaskId,
} from "../lib/tasks.ts"

interface DeleteCliArgs {
  repoRoot?: string
  streamId?: string
  // Delete targets (mutually exclusive)
  task?: string // e.g., "1.00.2.3"
  stage?: number // e.g., 1
  batch?: string // e.g., "1.00" (stage.batch)
  thread?: string // e.g., "1.00.2" (stage.batch.thread)
  stream?: boolean // delete entire stream
  force?: boolean
}

function printHelp(): void {
  console.log(`
work delete - Delete workstreams, stages, threads, or tasks

Usage:
  work delete [--stream <id>] [target] [options]

Targets (mutually exclusive):
  --task, -t <id>     Delete a single task (e.g., "1.00.2.3")
  --stage <num>       Delete all tasks in a stage (e.g., 1)
  --batch <id>        Delete all tasks in a batch (e.g., "1.00")
  --thread <id>       Delete all tasks in a thread (e.g., "1.00.2")
  (no target)         Delete the entire workstream

Options:
  --stream, -s <id>   Workstream ID or name (uses current if not specified)
  --force, -f         Skip confirmation prompts
  --repo-root <path>  Repository root (auto-detected)
  --help, -h          Show this help message

Examples:
  # Delete a single task (uses current workstream)
  work delete --task "1.00.2.3"

  # Delete all tasks in stage 2
  work delete --stage 2

  # Delete all tasks in batch 1.00
  work delete --batch "1.00"

  # Delete all tasks in thread 1.00.2
  work delete --thread "1.00.2"

  # Delete specific workstream (with confirmation)
  work delete --stream "001-my-stream"

  # Delete workstream without confirmation
  work delete --stream "001-my-stream" --force
`)
}

function parseCliArgs(argv: string[]): DeleteCliArgs | null {
  const args = argv.slice(2)
  const parsed: Partial<DeleteCliArgs> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case "--repo-root":
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

      case "--task":
      case "-t":
        if (!next) {
          console.error("Error: --task requires a value")
          return null
        }
        parsed.task = next
        i++
        break

      case "--stage":
        if (!next) {
          console.error("Error: --stage requires a value")
          return null
        }
        const stageNum = parseInt(next, 10)
        if (isNaN(stageNum) || stageNum < 1) {
          console.error("Error: --stage must be a positive number")
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
        // Validate format: "stage.batch"
        const batchParts = next.split(".")
        if (batchParts.length !== 2 || batchParts.some((p) => isNaN(parseInt(p, 10)))) {
          console.error(
            'Error: --batch must be in format "stage.batch" (e.g., "1.00")'
          )
          return null
        }
        parsed.batch = next
        i++
        break

      case "--thread":
        if (!next) {
          console.error("Error: --thread requires a value")
          return null
        }
        // Validate format: "stage.batch.thread"
        const threadParts = next.split(".")
        if (threadParts.length !== 3 || threadParts.some((p) => isNaN(parseInt(p, 10)))) {
          console.error(
            'Error: --thread must be in format "stage.batch.thread" (e.g., "1.00.2")'
          )
          return null
        }
        parsed.thread = next
        i++
        break

      case "--force":
      case "-f":
        parsed.force = true
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  // Check for mutually exclusive targets
  const targets = [parsed.task, parsed.stage, parsed.batch, parsed.thread].filter(
    (t) => t !== undefined
  )
  if (targets.length > 1) {
    console.error("Error: --task, --stage, --batch, and --thread are mutually exclusive")
    return null
  }

  // If no target specified, we're deleting the entire stream
  if (targets.length === 0) {
    parsed.stream = true
  }

  return parsed as DeleteCliArgs
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

  try {
    // Delete single task
    if (cliArgs.task) {
      // Validate task ID format
      try {
        parseTaskId(cliArgs.task)
      } catch (e) {
        console.error(`Error: ${(e as Error).message}`)
        process.exit(1)
      }

      const deleted = deleteTask(repoRoot, stream.id, cliArgs.task)
      if (deleted) {
        console.log(`Deleted task ${cliArgs.task}: ${deleted.name}`)
      } else {
        console.error(`Task "${cliArgs.task}" not found in workstream "${stream.id}"`)
        process.exit(1)
      }
      return
    }

    // Delete all tasks in a stage
    if (cliArgs.stage !== undefined) {
      const deleted = deleteTasksByStage(repoRoot, stream.id, cliArgs.stage)
      if (deleted.length > 0) {
        console.log(
          `Deleted ${deleted.length} task(s) from stage ${cliArgs.stage}`
        )
        for (const task of deleted) {
          console.log(`  - ${task.id}: ${task.name}`)
        }
      } else {
        console.log(`No tasks found in stage ${cliArgs.stage}`)
      }
      return
    }

    // Delete all tasks in a batch
    if (cliArgs.batch) {
      const [stage, batch] = cliArgs.batch.split(".").map(Number)
      const deleted = deleteTasksByBatch(repoRoot, stream.id, stage!, batch!)
      if (deleted.length > 0) {
        console.log(
          `Deleted ${deleted.length} task(s) from batch ${cliArgs.batch}`
        )
        for (const task of deleted) {
          console.log(`  - ${task.id}: ${task.name}`)
        }
      } else {
        console.log(`No tasks found in batch ${cliArgs.batch}`)
      }
      return
    }

    // Delete all tasks in a thread
    if (cliArgs.thread) {
      const [stage, batch, thread] = cliArgs.thread.split(".").map(Number)
      const deleted = deleteTasksByThread(repoRoot, stream.id, stage!, batch!, thread!)
      if (deleted.length > 0) {
        console.log(
          `Deleted ${deleted.length} task(s) from thread ${cliArgs.thread}`
        )
        for (const task of deleted) {
          console.log(`  - ${task.id}: ${task.name}`)
        }
      } else {
        console.log(`No tasks found in thread ${cliArgs.thread}`)
      }
      return
    }

    // Delete entire stream
    if (cliArgs.stream) {
      if (!cliArgs.force) {
        console.log(
          `This will delete workstream "${stream.id}" and all its files.`
        )
        console.log("Run with --force to confirm.")
        process.exit(1)
      }

      const result = await deleteStream(repoRoot, stream.id, { deleteFiles: true })
      console.log(`Deleted workstream: ${result.streamId}`)
      console.log(`   Path: ${result.streamPath}`)
      return
    }
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
