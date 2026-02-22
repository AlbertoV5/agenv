/**
 * CLI: Update Thread
 *
 * Updates a thread's status in threads.json.
 */

import type { TaskStatus } from "../lib/types.ts"
import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { updateThread } from "../lib/update.ts"

interface UpdateTaskCliArgs {
  repoRoot?: string
  streamId?: string
  taskId?: string
  threadId?: string
  status: TaskStatus
  note?: string
  breadcrumb?: string
  report?: string
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
work update - Update a thread's status

Usage:
  work update --thread <id> --status <status> [options]

Required:
  --thread         Thread ID (e.g., "01.01.01" = Stage 01, Batch 01, Thread 01)
  --status         New status: pending, in_progress, completed, blocked, cancelled

Optional:
  --stream, -s     Workstream ID or name (uses current if not specified)
  --repo-root, -r  Repository root (auto-detected if omitted)
  --note, -n       Add implementation note
  --breadcrumb, -b Add recovery breadcrumb (last action)
  --report         Completion report (brief summary of what was done)
  --agent          Assign agent to thread
  --help, -h       Show this help message

ID Formats:
  Thread: "01.01.02"    = Stage 01, Batch 01, Thread 02

Examples:
  # Mark thread completed
  work update --thread "01.01.01" --status completed

  # Mark thread completed with report
  work update --thread "01.01.01" --status completed --report "Added hono dependencies."

  # Mark thread cancelled
  work update --thread "01.01.02" --status cancelled

  # Update in a specific workstream
  work update --stream "001-my-stream" --thread "01.01.01" --status completed
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

      case "--thread":
        if (!next) {
          console.error("Error: --thread requires a value")
          return null
        }
        parsed.threadId = next
        i++
        break

      case "--status":
        if (!next) {
          console.error("Error: --status requires a value")
          return null
        }
        if (!VALID_STATUSES.includes(next as TaskStatus)) {
          console.error(
            `Error: Invalid status "${next}". Valid: ${VALID_STATUSES.join(", ")}`,
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

      case "--report":
        if (!next) {
          console.error("Error: --report requires a value")
          return null
        }
        parsed.report = next
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

  // Compatibility: accept --task and route to --thread when unambiguous
  if (parsed.taskId && !parsed.threadId) {
    const parts = parsed.taskId.split(".")
    if (parts.length === 4) {
      parsed.threadId = `${parts[0]}.${parts[1]}.${parts[2]}`
        console.error(
          `Deprecation: --task is deprecated for 'work update'; ` +
            `mapped to --thread "${parsed.threadId}".`,
        )
    } else {
      console.error(
        `Error: --task is deprecated and cannot be mapped. Use --thread "SS.BB.TT" instead.`,
      )
      return null
    }
  }

  // Validate required args
  if (!parsed.threadId) {
    console.error("Error: --thread is required")
    return null
  }
  if (parsed.taskId && parsed.threadId && parsed.taskId.split(".").length !== 4) {
    console.error("Error: --task is deprecated and cannot be combined with --thread")
    return null
  }
  if (!parsed.status) {
    console.error("Error: --status is required")
    return null
  }

  return parsed as UpdateTaskCliArgs
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
    const result = await updateThread({
      repoRoot,
      stream,
      threadId: cliArgs.threadId!,
      status: cliArgs.status,
      note: cliArgs.note,
      breadcrumb: cliArgs.breadcrumb,
      report: cliArgs.report,
      assigned_agent: cliArgs.assigned_agent,
    })
    console.log(`Updated thread ${result.threadId} to ${result.status}`)
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  await main()
}
