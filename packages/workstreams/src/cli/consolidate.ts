/**
 * CLI: Workstream Consolidate
 *
 * Parse PLAN.md and generate tasks in tasks.json.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { consolidateStream, formatConsolidateResult } from "../lib/consolidate.ts"

interface ConsolidateCliArgs {
  repoRoot?: string
  streamId?: string
  dryRun: boolean
  json: boolean
}

function printHelp(): void {
  console.log(`
work consolidate - Parse PLAN.md and generate tasks

Usage:
  work consolidate [--stream <stream-id>] [--dry-run]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --dry-run, -d    Validate PLAN.md without writing tasks.json
  --json, -j       Output as JSON
  --help, -h       Show this help message

Description:
  Consolidate parses the PLAN.md file and generates tasks in tasks.json.
  Tasks are extracted from the "Tasks:" lists within each thread.

  If tasks.json already exists, existing task statuses are preserved.
  New tasks are added as "pending", and removed tasks are deleted.

Examples:
  # Consolidate PLAN.md into tasks.json (uses current workstream)
  work consolidate

  # Validate without writing (dry run)
  work consolidate --dry-run

  # Consolidate specific workstream
  work consolidate --stream "001-my-stream"
`)
}

function parseCliArgs(argv: string[]): ConsolidateCliArgs | null {
  const args = argv.slice(2)
  const parsed: ConsolidateCliArgs = { dryRun: false, json: false }

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

      case "--dry-run":
      case "-d":
        parsed.dryRun = true
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

  // Run consolidation
  const result = consolidateStream(repoRoot, stream.id, cliArgs.dryRun)

  if (cliArgs.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(formatConsolidateResult(result, cliArgs.dryRun))
  }

  if (!result.success) {
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
