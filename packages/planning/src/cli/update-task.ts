/**
 * CLI: Update Task
 *
 * Updates a specific task's status in a plan's checklist.
 */

import type { TaskStatus } from "../lib/types.ts"
import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getPlan } from "../lib/index.ts"
import { updateTask } from "../lib/update.ts"

interface UpdateTaskCliArgs {
  repoRoot?: string
  planId: string
  taskId: string
  status: TaskStatus
  note?: string
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
plan update - Update a task's status

Usage:
  plan update --plan <id> --task <id> --status <status> [options]

Required:
  --plan, -p       Plan ID or name
  --task, -t       Task ID (e.g., "1.2" for short plans, "2.1.3" for staged)
  --status, -s     New status: pending, in_progress, completed, blocked, cancelled

Optional:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --note, -n       Add implementation note
  --help, -h       Show this help message

Task ID Format:
  Short plans:       "1.2" = Task Group 1, Subtask 2
  Medium/Long plans: "2.1.3" = Stage 2, Task Group 1, Subtask 3

Examples:
  # Mark task completed
  plan update --plan "001-my-plan" --task "1.2" --status completed

  # Mark task with note
  plan update --plan "001-my-plan" --task "2.1.3" --status completed \\
    --note "Used alternative library due to compatibility"
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

      case "--plan":
      case "-p":
        if (!next) {
          console.error("Error: --plan requires a value")
          return null
        }
        parsed.planId = next
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
      case "-s":
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

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  // Validate required args
  if (!parsed.planId) {
    console.error("Error: --plan is required")
    return null
  }
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

  let plan
  try {
    plan = getPlan(index, cliArgs.planId)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  try {
    const result = updateTask({
      repoRoot,
      plan,
      taskId: cliArgs.taskId,
      status: cliArgs.status,
      note: cliArgs.note,
    })

    console.log(`Updated task ${result.taskId} to ${result.status}`)
    if (result.lineNumber) {
      console.log(`   File: ${result.file}`)
      console.log(`   Line: ${result.lineNumber}`)
    }
    if (result.note) {
      console.log(`   Note: ${result.note}`)
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
