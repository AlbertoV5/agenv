/**
 * CLI: Workstream Read
 *
 * Read thread details by thread ID.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getThreadMetadata } from "../lib/threads.ts"
import type { ThreadMetadata } from "../lib/types.ts"

interface ReadCliArgs {
  repoRoot?: string
  streamId?: string
  taskId?: string
  threadId?: string
  json: boolean
}

function printHelp(): void {
  console.log(`
work read - Read thread details

Usage:
  work read --thread <thread-id> [--stream <stream-id>]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --thread         Thread ID in format "stage.batch.thread" (e.g., "01.01.02") (required)
  --task, -t       Deprecated alias; mapped to thread when possible
  --json, -j       Output as JSON
  --help, -h       Show this help message
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

      case "--thread":
        if (!next) {
          console.error("Error: --thread requires a value")
          return null
        }
        parsed.threadId = next
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

  if (!parsed.threadId && parsed.taskId) {
    const parts = parsed.taskId.split(".")
    if (parts.length === 4) {
      parsed.threadId = `${parts[0]}.${parts[1]}.${parts[2]}`
      console.error(`Deprecation: --task is deprecated; mapped to --thread "${parsed.threadId}".`)
    }
  }

  return parsed
}

function formatThread(thread: ThreadMetadata): string {
  const lines: string[] = []
  lines.push(`Thread ${thread.threadId}: ${thread.threadName}`)
  lines.push(`Stage: ${thread.stageName}`)
  lines.push(`Batch: ${thread.batchName}`)
  lines.push(`Status: ${thread.status}`)
  if (thread.assignedAgent) lines.push(`Assigned Agent: ${thread.assignedAgent}`)
  if (thread.breadcrumb) lines.push(`Breadcrumb: ${thread.breadcrumb}`)
  if (thread.report) lines.push(`Report: ${thread.report}`)
  lines.push(`Updated: ${(thread.updatedAt || "").split("T")[0]}`)
  return lines.join("\n")
}

export function main(argv: string[] = process.argv): void {
  const cliArgs = parseCliArgs(argv)
  if (!cliArgs) {
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  if (!cliArgs.threadId) {
    console.error("Error: --thread is required")
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

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

  const thread = getThreadMetadata(repoRoot, stream.id, cliArgs.threadId)
  if (!thread) {
    console.error(`Error: Thread "${cliArgs.threadId}" not found in workstream "${stream.id}"`)
    process.exit(1)
  }

  if (cliArgs.json) {
    console.log(JSON.stringify(thread, null, 2))
  } else {
    console.log(formatThread(thread))
  }
}

if (import.meta.main) {
  main()
}
