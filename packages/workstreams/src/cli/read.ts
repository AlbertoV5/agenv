/**
 * CLI: Workstream Read
 *
 * Read task details by task ID.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getTaskById } from "../lib/tasks.ts"
import type { Task } from "../lib/types.ts"

interface ReadCliArgs {
  repoRoot?: string
  streamId?: string
  taskId?: string
  json: boolean
}

function printHelp(): void {
  console.log(`
work read - Read task details

Usage:
  work read --task <task-id> [--stream <stream-id>]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --task, -t       Task ID in format "stage.thread.task" (e.g., "1.2.3") (required)
  --json, -j       Output as JSON
  --help, -h       Show this help message

Examples:
  # Read task 1.2.1 (uses current workstream)
  work read --task "1.2.1"

  # Read task from specific workstream
  work read --stream "001-my-stream" --task "1.2.1"
`)
}

function parseCliArgs(argv: string[]): ReadCliArgs | null {
  const args = argv.slice(2)
  const parsed: ReadCliArgs = { json: false }

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

function formatTask(task: Task): string {
  const lines: string[] = []

  lines.push(`Task ${task.id}: ${task.name}`)
  lines.push(`Stage: ${task.stage_name}`)
  lines.push(`Thread: ${task.thread_name}`)
  lines.push(`Status: ${task.status}`)
  lines.push(`Updated: ${task.updated_at.split("T")[0]}`)

  return lines.join("\n")
}

export function main(argv: string[] = process.argv): void {
  const cliArgs = parseCliArgs(argv)
  if (!cliArgs) {
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  // Validate required args
  if (!cliArgs.taskId) {
    console.error("Error: --task is required")
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

  // Get task
  const task = getTaskById(repoRoot, stream.id, cliArgs.taskId)
  if (!task) {
    console.error(`Error: Task "${cliArgs.taskId}" not found in workstream "${stream.id}"`)
    process.exit(1)
  }

  if (cliArgs.json) {
    console.log(JSON.stringify(task, null, 2))
  } else {
    console.log(formatTask(task))
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
