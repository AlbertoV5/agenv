/**
 * CLI: Workstream Preview
 *
 * Show the structure of PLAN.md (stages, threads, questions).
 */

import { existsSync, readFileSync } from "fs"
import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getStreamPreview } from "../lib/stream-parser.ts"
import { getStreamPlanMdPath } from "../lib/consolidate.ts"

interface PreviewCliArgs {
  repoRoot?: string
  streamId?: string
  verbose: boolean
  json: boolean
}

function printHelp(): void {
  console.log(`
work preview - Show PLAN.md structure

Usage:
  work preview [--stream <stream-id>]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --verbose, -v    Show more details
  --json, -j       Output as JSON
  --help, -h       Show this help message

Description:
  Preview shows the structure of PLAN.md including:
  - Workstream name and summary
  - Stages with their threads
  - Question counts (open vs resolved)

Examples:
  # Preview workstream structure (uses current)
  work preview

  # Verbose output
  work preview --verbose

  # Preview specific workstream
  work preview --stream "001-my-stream"
`)
}

function parseCliArgs(argv: string[]): PreviewCliArgs | null {
  const args = argv.slice(2)
  const parsed: PreviewCliArgs = { verbose: false, json: false }

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

      case "--verbose":
      case "-v":
        parsed.verbose = true
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

interface StreamPreview {
  streamName: string | null
  summary: string
  stageCount: number
  stages: {
    number: number
    name: string
    batchCount: number
    threadCount: number
    batches: {
      number: number
      prefix: string
      name: string
      threadCount: number
      threads: { number: number; name: string }[]
    }[]
  }[]
  questionCounts: { open: number; resolved: number }
}

function formatPreview(preview: StreamPreview, verbose: boolean): string {
  const lines: string[] = []

  if (!preview.streamName) {
    return "Could not parse PLAN.md - invalid format"
  }

  lines.push(`Workstream: ${preview.streamName}`)

  if (preview.summary) {
    lines.push(`Summary: ${preview.summary}`)
  }

  lines.push("")
  lines.push("Stages:")

  for (const stage of preview.stages) {
    const batchInfo = stage.batchCount > 1 ? `, ${stage.batchCount} batches` : ""
    lines.push(`  ${stage.number}. ${stage.name} (${stage.threadCount} thread${stage.threadCount !== 1 ? "s" : ""}${batchInfo})`)

    for (const batch of stage.batches) {
      // Only show batch header if there's more than one batch or in verbose mode
      if (stage.batchCount > 1 || verbose) {
        lines.push(`     Batch ${batch.prefix}: ${batch.name}`)
      }

      if (verbose || batch.threads.length <= 5) {
        for (const thread of batch.threads) {
          const indent = stage.batchCount > 1 || verbose ? "        " : "     "
          lines.push(`${indent}- Thread ${thread.number}: ${thread.name}`)
        }
      } else {
        // Show first 3 threads and indicate more
        for (const thread of batch.threads.slice(0, 3)) {
          const indent = stage.batchCount > 1 || verbose ? "        " : "     "
          lines.push(`${indent}- Thread ${thread.number}: ${thread.name}`)
        }
        const indent = stage.batchCount > 1 || verbose ? "        " : "     "
        lines.push(`${indent}... and ${batch.threads.length - 3} more threads`)
      }
    }
  }

  lines.push("")
  const { open, resolved } = preview.questionCounts
  const total = open + resolved
  if (total > 0) {
    lines.push(`Questions: ${open} open, ${resolved} resolved`)
  } else {
    lines.push("Questions: none")
  }

  return lines.join("\n")
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

  // Check if PLAN.md exists
  const planMdPath = getStreamPlanMdPath(repoRoot, stream.id)
  if (!existsSync(planMdPath)) {
    console.error(`Error: PLAN.md not found at ${planMdPath}`)
    process.exit(1)
  }

  // Read and parse PLAN.md
  const content = readFileSync(planMdPath, "utf-8")
  const preview = getStreamPreview(content)

  if (cliArgs.json) {
    console.log(JSON.stringify(preview, null, 2))
  } else {
    console.log(formatPreview(preview, cliArgs.verbose))
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
