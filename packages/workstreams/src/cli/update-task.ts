/**
 * CLI: Update Task
 *
 * Updates a specific task's status in a workstream's checklist.
 */

import type { TaskStatus } from "../lib/types.ts"
import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { updateTask } from "../lib/update.ts"

interface UpdateTaskCliArgs {
  repoRoot?: string
  streamId?: string
  taskId: string
  status: TaskStatus
  note?: string
  breadcrumb?: string
  assigned_agent?: string
}

const VALID_STATUSES: TaskStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "blocked",
  "cancelled",
]

function printHelp(): void {
  console.log(`
work update - Update a task's status

Usage:
  work update --task <id> --status <status> [options]

Required:
  --task, -t       Task ID (e.g., "01.00.01.01" = Stage 01, Batch 00, Thread 01, Task 01)
  --status         New status: pending, in_progress, completed, blocked, cancelled

Optional:
  --stream, -s     Workstream ID or name (uses current if not specified)
  --repo-root, -r  Repository root (auto-detected if omitted)
  --note, -n       Add implementation note
  --breadcrumb, -b Add recovery breadcrumb (last action)
  --agent          Assign agent to task
  --help, -h       Show this help message

Task ID Format:
  "01.00.02.03" = Stage 01, Batch 00, Thread 02, Task 03

Examples:
  # Mark task completed (uses current workstream)
  work update --task "01.00.01.01" --status completed

  # Mark task with note
  work update --task "01.00.02.03" --status completed --note "Used alternative approach"

  # Update task in a specific workstream
  work update --stream "001-my-stream" --task "01.00.01.01" --status completed
`)
}

function parseCliArgs(argv: string[]): UpdateTaskCliArgs | null {
  const args = argv.slice(2)
  const parsed: Partial<UpdateTaskCliArgs> = {}

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

      case "--task":
      case "-t":
        if (!next) {
          console.error("Error: --task requires a value")
          return null
        }
        parsed.taskId = next
        i++
        break

      case "--status":
        if (!next) {
          console.error("Error: --status requires a value")
          return null
        }
        if (!VALID_STATUSES.includes(next as TaskStatus)) {
          console.error(
            `Error: Invalid status "${next}". Valid: ${VALID_STATUSES.join(", ")}`
          )
          return null
        }
        parsed.status = next as TaskStatus
        i++
        break

      case "--note":
      case "-n":
        if (!next) {
          console.error("Error: --note requires a value")
          return null
        }
        parsed.note = next
        i++
        break

      case "--breadcrumb":
      case "-b":
        if (!next) {
          console.error("Error: --breadcrumb requires a value")
          return null
        }
        parsed.breadcrumb = next
        i++
        break

      case "--agent":
        if (!next) {
          console.error("Error: --agent requires a value")
          return null
        }
        parsed.assigned_agent = next
        i++
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  // Validate required args
  if (!parsed.taskId) {
    console.error("Error: --task is required")
    return null
  }
  if (!parsed.status) {
    console.error("Error: --status is required")
    return null
  }

  return parsed as UpdateTaskCliArgs
}

export function main(argv: string[] = process.argv): void {
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
    const result = updateTask({
      repoRoot,
      stream,
      taskId: cliArgs.taskId,
      status: cliArgs.status,
      note: cliArgs.note,
      breadcrumb: cliArgs.breadcrumb,
      assigned_agent: cliArgs.assigned_agent,
    })

    console.log(`Updated task ${result.taskId} to ${result.status}`)
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
