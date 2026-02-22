/**
 * CLI: Delete
 *
 * Delete workstreams, stages, batches, or threads.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream, deleteStream } from "../lib/index.ts"
import { loadThreads, saveThreads } from "../lib/threads.ts"

interface DeleteCliArgs {
  repoRoot?: string
  streamId?: string
  stage?: number
  batch?: string
  thread?: string
  stream?: boolean
  force?: boolean
}

function printHelp(): void {
  console.log(`
work delete - Delete workstreams, stages, batches, or threads

Usage:
  work delete [--stream <id>] [target] [options]

Targets (mutually exclusive):
  --stage <num>       Delete all threads in a stage (e.g., 01)
  --batch <id>        Delete all threads in a batch (e.g., "01.01")
  --thread <id>       Delete a thread (e.g., "01.01.02")
  (no target)         Delete the entire workstream

Options:
  --stream, -s <id>   Workstream ID or name (uses current if not specified)
  --force, -f         Skip confirmation prompts
  --repo-root <path>  Repository root (auto-detected)
  --help, -h          Show this help message
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
        if (!next) return null
        parsed.repoRoot = next
        i++
        break
      case "--stream":
      case "-s":
      case "--plan":
      case "-p":
        if (!next) return null
        parsed.streamId = next
        i++
        break
      case "--task":
      case "-t":
        console.error("Error: --task is no longer supported. Use --thread, --batch, or --stage.")
        return null
      case "--stage":
        if (!next) return null
        parsed.stage = parseInt(next, 10)
        i++
        break
      case "--batch":
      case "-b":
        if (!next) return null
        parsed.batch = next
        i++
        break
      case "--thread":
        if (!next) return null
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

  const targets = [parsed.stage, parsed.batch, parsed.thread].filter((x) => x !== undefined)
  if (targets.length > 1) {
    console.error("Error: --stage, --batch, and --thread are mutually exclusive")
    return null
  }
  if (targets.length === 0) parsed.stream = true

  return parsed as DeleteCliArgs
}

function deleteThreadsByPrefix(repoRoot: string, streamId: string, prefix: string): number {
  const threadsFile = loadThreads(repoRoot, streamId)
  if (!threadsFile) return 0
  const before = threadsFile.threads.length
  threadsFile.threads = threadsFile.threads.filter((t) => !t.threadId.startsWith(prefix))
  const deleted = before - threadsFile.threads.length
  if (deleted > 0) saveThreads(repoRoot, streamId, threadsFile)
  return deleted
}

export async function main(argv: string[] = process.argv): Promise<void> {
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

  const index = loadIndex(repoRoot)
  const stream = getResolvedStream(index, cliArgs.streamId)

  if (cliArgs.stage !== undefined) {
    const prefix = `${String(cliArgs.stage).padStart(2, "0")}.`
    const deleted = deleteThreadsByPrefix(repoRoot, stream.id, prefix)
    console.log(deleted > 0 ? `Deleted ${deleted} thread(s) from stage ${cliArgs.stage}` : `No threads found in stage ${cliArgs.stage}`)
    return
  }

  if (cliArgs.batch) {
    const prefix = `${cliArgs.batch}.`
    const deleted = deleteThreadsByPrefix(repoRoot, stream.id, prefix)
    console.log(deleted > 0 ? `Deleted ${deleted} thread(s) from batch ${cliArgs.batch}` : `No threads found in batch ${cliArgs.batch}`)
    return
  }

  if (cliArgs.thread) {
    const threadsFile = loadThreads(repoRoot, stream.id)
    if (!threadsFile) {
      console.log(`No threads found in workstream ${stream.id}`)
      return
    }
    const before = threadsFile.threads.length
    threadsFile.threads = threadsFile.threads.filter((t) => t.threadId !== cliArgs.thread)
    if (threadsFile.threads.length === before) {
      console.log(`No thread found for ${cliArgs.thread}`)
      return
    }
    saveThreads(repoRoot, stream.id, threadsFile)
    console.log(`Deleted thread ${cliArgs.thread}`)
    return
  }

  if (cliArgs.stream) {
    if (!cliArgs.force) {
      console.log(`This will delete workstream "${stream.id}" and all its files.`)
      console.log("Run with --force to confirm.")
      process.exit(1)
    }
    const result = await deleteStream(repoRoot, stream.id, { deleteFiles: true })
    console.log(`Deleted workstream: ${result.streamId}`)
  }
}

if (import.meta.main) {
  main()
}
