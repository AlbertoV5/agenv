/**
 * CLI: Workstream List
 *
 * List all tasks in a workstream with their status.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getTasks, getTaskCounts, groupTasksByStageAndThread } from "../lib/tasks.ts"
import type { Task, TaskStatus } from "../lib/types.ts"

interface ListCliArgs {
  repoRoot?: string
  streamId?: string
  tasks: boolean
  status?: TaskStatus
  json: boolean
  stage?: number
  batch?: string
  thread?: string
}

function printHelp(): void {
  console.log(`
work list - List tasks in a workstream

Usage:
  work list [--stream <stream-id>] [--tasks] [--status <status>]
            [--stage <n>] [--batch <id>] [--thread <id>]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --tasks          Show tasks (default if no other flags)
  --status         Filter by status (pending, in_progress, completed, blocked, cancelled)
  --stage          Filter by stage number (e.g. 1)
  --batch          Filter by batch ID (e.g. "01.02")
  --thread         Filter by thread ID (e.g. "01.02.03")
  --json, -j       Output as JSON
  --help, -h       Show this help message

Examples:
  # List all tasks (uses current workstream)
  work list --tasks

  # List only in-progress tasks
  work list --tasks --status in_progress

  # List tasks for a specific batch
  work list --tasks --batch "01.02"

  # List tasks for a specific workstream
  work list --stream "001-my-stream" --tasks
`)
}

function parseCliArgs(argv: string[]): ListCliArgs | null {
  const args = argv.slice(2)
  const parsed: ListCliArgs = { json: false, tasks: false }

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

      case "--tasks":
        parsed.tasks = true
        break

      case "--status":
        if (!next) {
          console.error("Error: --status requires a value")
          return null
        }
        const validStatuses = ["pending", "in_progress", "completed", "blocked", "cancelled"]
        if (!validStatuses.includes(next)) {
          console.error(`Error: Invalid status "${next}". Valid values: ${validStatuses.join(", ")}`)
          return null
        }
        parsed.status = next as TaskStatus
        i++
        break

      case "--stage":
        if (!next) {
          console.error("Error: --stage requires a value")
          return null
        }
        const stageNum = parseInt(next, 10)
        if (isNaN(stageNum)) {
          console.error("Error: --stage must be a number")
          return null
        }
        parsed.stage = stageNum
        i++
        break

      case "--batch":
        if (!next) {
          console.error("Error: --batch requires a value")
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
        parsed.thread = next
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

  // Default to showing tasks if no specific flag
  if (!parsed.tasks) {
    parsed.tasks = true
  }

  return parsed
}

function statusToIcon(status: TaskStatus): string {
  switch (status) {
    case "completed":
      return "[x]"
    case "in_progress":
      return "[~]"
    case "blocked":
      return "[!]"
    case "cancelled":
      return "[-]"
    default:
      return "[ ]"
  }
}

function formatTaskList(streamId: string, tasks: Task[]): string {
  const lines: string[] = []
  const counts = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
  }

  lines.push(`Workstream: ${streamId}`)
  lines.push(
    `Tasks: ${counts.total} total | ${counts.completed} completed | ${counts.in_progress} in progress | ${counts.pending} pending`
  )
  lines.push("")

  // Group tasks by stage and thread
  const grouped = groupTasksByStageAndThread(tasks)

  // Sort stages by extracting stage number from first task
  const stageEntries = Array.from(grouped.entries())
  stageEntries.sort((a, b) => {
    const aFirst = a[1].values().next().value
    const bFirst = b[1].values().next().value
    if (!aFirst || !bFirst) return 0
    const aTask = aFirst[0] as Task
    const bTask = bFirst[0] as Task
    if (!aTask || !bTask) return 0
    const aStage = parseInt(aTask.id.split(".")[0]!, 10)
    const bStage = parseInt(bTask.id.split(".")[0]!, 10)
    return aStage - bStage
  })

  for (const [stageName, threadMap] of stageEntries) {
    // Get stage number from first task
    const firstThread = threadMap.values().next().value
    const firstTask = firstThread?.[0]
    const stageNum = firstTask ? firstTask.id.split(".")[0] : "?"

    lines.push(`Stage ${stageNum}: ${stageName}`)

    // Sort threads by thread number
    const threadEntries = Array.from(threadMap.entries())
    threadEntries.sort((a, b) => {
      const aTask = a[1][0]
      const bTask = b[1][0]
      if (!aTask || !bTask) return 0
      const aThread = parseInt(aTask.id.split(".")[1]!, 10)
      const bThread = parseInt(bTask.id.split(".")[1]!, 10)
      return aThread - bThread
    })

    for (const [threadName, threadTasks] of threadEntries) {
      const threadNum = threadTasks[0]?.id.split(".")[1] ?? "?"
      lines.push(`  Thread ${threadNum}: ${threadName}`)

      for (const task of threadTasks) {
        const icon = statusToIcon(task.status)
        lines.push(`    ${icon} ${task.id} ${task.name}`)
      }
    }

    lines.push("")
  }

  return lines.join("\n").trimEnd()
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

  // Get tasks
  let tasks = getTasks(repoRoot, stream.id, cliArgs.status)

  // Apply filters
  if (cliArgs.stage !== undefined) {
    const stagePrefix = `${cliArgs.stage.toString().padStart(2, "0")}.`
    tasks = tasks.filter((t) => t.id.startsWith(stagePrefix))
  }

  if (cliArgs.batch) {
    // Ensure strict prefix matching (e.g. "01.02.")
    const batchPrefix = cliArgs.batch.endsWith(".") ? cliArgs.batch : `${cliArgs.batch}.`
    tasks = tasks.filter((t) => t.id.startsWith(batchPrefix))
  }

  if (cliArgs.thread) {
    const threadPrefix = cliArgs.thread.endsWith(".") ? cliArgs.thread : `${cliArgs.thread}.`
    tasks = tasks.filter((t) => t.id.startsWith(threadPrefix))
  }

  if (tasks.length === 0) {
    if (cliArgs.status) {
      console.log(`No tasks with status "${cliArgs.status}" found in workstream "${stream.id}"`)
    } else {
      console.log(`No tasks found in workstream "${stream.id}".`)
    }
    return
  }

  if (cliArgs.json) {
    console.log(JSON.stringify(tasks, null, 2))
  } else {
    console.log(formatTaskList(stream.id, tasks))
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
