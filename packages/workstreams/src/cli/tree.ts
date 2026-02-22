/**
 * CLI: Workstream Tree
 *
 * Show a tree view of stages, batches, and thread leaves.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getThreads, groupThreads } from "../lib/threads.ts"
import type { ThreadMetadata, ThreadStatus } from "../lib/types.ts"

interface TreeCliArgs {
  repoRoot?: string
  streamId?: string
  batchId?: string
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

function aggregateStatus(threads: ThreadMetadata[]): ThreadStatus {
  if (threads.length === 0) return "pending"
  if (threads.some((t) => t.status === "blocked")) return "blocked"
  if (threads.some((t) => t.status === "in_progress")) return "in_progress"
  if (threads.some((t) => t.status === "pending")) return "pending"
  return "completed"
}

function printHelp(): void {
  console.log(`
work tree - Show workstream structure tree

Usage:
  work tree [--stream <stream-id>] [--batch <batch-id>]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --batch, -b      Filter to a specific batch (e.g., "01.01")
  --help, -h       Show this help message
`)
}

function parseCliArgs(argv: string[]): TreeCliArgs | null {
  const args = argv.slice(2)
  const parsed: TreeCliArgs = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case "--repo-root":
      case "-r":
        if (!next) return null
        parsed.repoRoot = next
        i++
        break
      case "--stream":
      case "-s":
        if (!next) return null
        parsed.streamId = next
        i++
        break
      case "--batch":
      case "-b":
        if (!next) return null
        parsed.batchId = next
        i++
        break
      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  return parsed
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

  const stream = getResolvedStream(index, cliArgs.streamId)
  let threads = getThreads(repoRoot, stream.id)

  if (cliArgs.batchId) {
    const prefix = `${cliArgs.batchId}.`
    threads = threads.filter((t) => t.threadId.startsWith(prefix))
  }

  if (threads.length === 0) {
    console.log(`Workstream: ${stream.id} (Empty)`)
    return
  }

  const grouped = groupThreads(threads)
  console.log(`${statusToIcon(aggregateStatus(threads))} Workstream: ${stream.id} (${threads.length})`)

  const stages = Array.from(grouped.entries())
  for (const [stageIndex, [stageName, batchMap]] of stages.entries()) {
    const stageThreads = Array.from(batchMap.values()).flat()
    const stagePrefix = stageIndex === stages.length - 1 ? "└── " : "├── "
    const stageChildPrefix = stageIndex === stages.length - 1 ? "    " : "│   "
    const stageNum = stageThreads[0]?.threadId.split(".")[0] || "??"
    console.log(`${stagePrefix}${statusToIcon(aggregateStatus(stageThreads))} Stage ${stageNum}: ${stageName} (${stageThreads.length})`)

    const batches = Array.from(batchMap.entries())
    for (const [batchIndex, [batchName, batchThreads]] of batches.entries()) {
      const batchPrefix = batchIndex === batches.length - 1 ? "└── " : "├── "
      const batchChildPrefix = batchIndex === batches.length - 1 ? "    " : "│   "
      const batchNum = batchThreads[0]?.threadId.split(".")[1] || "??"
      console.log(`${stageChildPrefix}${batchPrefix}${statusToIcon(aggregateStatus(batchThreads))} Batch ${batchNum}: ${batchName} (${batchThreads.length})`)

      for (const [threadIndex, thread] of batchThreads.entries()) {
        const threadPrefix = threadIndex === batchThreads.length - 1 ? "└── " : "├── "
        const threadNum = thread.threadId.split(".")[2] || "??"
        const agent = thread.assignedAgent ? ` @${thread.assignedAgent}` : ""
        console.log(`${stageChildPrefix}${batchChildPrefix}${threadPrefix}${statusToIcon(thread.status || "pending")} Thread ${threadNum}: ${thread.threadName}${agent}`)
      }
    }
  }
}

if (import.meta.main) {
  main()
}
