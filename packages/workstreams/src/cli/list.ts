/**
 * CLI: Workstream List
 *
 * List threads in a workstream with status.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getThreads, groupThreads } from "../lib/threads.ts"
import type { ThreadMetadata, ThreadStatus } from "../lib/types.ts"

interface ListCliArgs {
  repoRoot?: string
  streamId?: string
  threads: boolean
  status?: ThreadStatus
  json: boolean
  stage?: number
  batch?: string
  thread?: string
}

function printHelp(): void {
  console.log(`
work list - List threads in a workstream

Usage:
  work list [--stream <stream-id>] [--threads] [--status <status>]
            [--stage <n>] [--batch <id>] [--thread <id>]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --threads        Show threads (default)
  --tasks          Deprecated alias for --threads
  --status         Filter by status (pending, in_progress, completed, blocked, cancelled)
  --stage          Filter by stage number (e.g. 1)
  --batch          Filter by batch ID (e.g. "01.02")
  --thread         Filter by thread ID (e.g. "01.02.03")
  --json, -j       Output as JSON
  --help, -h       Show this help message
`)
}

function parseCliArgs(argv: string[]): ListCliArgs | null {
  const args = argv.slice(2)
  const parsed: ListCliArgs = { json: false, threads: true }

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

      case "--threads":
        parsed.threads = true
        break

      case "--tasks":
        parsed.threads = true
        console.error("Deprecation: --tasks is deprecated; use --threads.")
        break

      case "--status":
        if (!next) {
          console.error("Error: --status requires a value")
          return null
        }
        if (!["pending", "in_progress", "completed", "blocked", "cancelled"].includes(next)) {
          console.error(`Error: Invalid status "${next}". Valid values: pending, in_progress, completed, blocked, cancelled`)
          return null
        }
        parsed.status = next as ThreadStatus
        i++
        break

      case "--stage":
        if (!next) {
          console.error("Error: --stage requires a value")
          return null
        }
        parsed.stage = parseInt(next, 10)
        if (Number.isNaN(parsed.stage)) {
          console.error("Error: --stage must be a number")
          return null
        }
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

  return parsed
}

function statusToIcon(status: ThreadStatus): string {
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

function formatThreadList(streamId: string, threads: ThreadMetadata[]): string {
  const lines: string[] = []
  lines.push(`Workstream: ${streamId}`)
  lines.push(`Threads: ${threads.length}`)
  lines.push("")

  const grouped = groupThreads(threads)
  for (const [stageName, batchMap] of grouped.entries()) {
    const stageId = batchMap.values().next().value?.[0]?.threadId.split(".")[0] || "??"
    lines.push(`Stage ${stageId}: ${stageName}`)
    for (const [batchName, batchThreads] of batchMap.entries()) {
      const batchId = batchThreads[0]?.threadId.split(".")[1] || "??"
      lines.push(`  Batch ${batchId}: ${batchName}`)
      for (const thread of batchThreads) {
        const threadNum = thread.threadId.split(".")[2] || "??"
        const agent = thread.assignedAgent ? ` @${thread.assignedAgent}` : ""
        lines.push(`    ${statusToIcon(thread.status || "pending")} Thread ${threadNum}: ${thread.threadName}${agent}`)
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

  let threads = getThreads(repoRoot, stream.id, cliArgs.status)

  if (cliArgs.stage !== undefined) {
    const stagePrefix = `${String(cliArgs.stage).padStart(2, "0")}.`
    threads = threads.filter((t) => t.threadId.startsWith(stagePrefix))
  }

  if (cliArgs.batch) {
    const batchPrefix = cliArgs.batch.endsWith(".") ? cliArgs.batch : `${cliArgs.batch}.`
    threads = threads.filter((t) => t.threadId.startsWith(batchPrefix))
  }

  if (cliArgs.thread) {
    threads = threads.filter((t) => t.threadId === cliArgs.thread)
  }

  if (threads.length === 0) {
    if (cliArgs.status) {
      console.log(`No threads with status "${cliArgs.status}" found in workstream "${stream.id}"`)
    } else {
      console.log(`No threads found in workstream "${stream.id}".`)
    }
    return
  }

  if (cliArgs.json) {
    console.log(JSON.stringify(threads, null, 2))
  } else {
    console.log(formatThreadList(stream.id, threads))
  }
}

if (import.meta.main) {
  main()
}
