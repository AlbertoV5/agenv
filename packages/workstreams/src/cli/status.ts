/**
 * CLI: Workstream Status
 *
 * Shows the current status of one or all workstreams.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, resolveStreamId } from "../lib/index.ts"
import { getStreamProgress, formatProgress, getStreamStatus } from "../lib/status.ts"

interface StatusCliArgs {
  repoRoot?: string
  streamId?: string
  json: boolean
}

function printHelp(): void {
  console.log(`
work status - Show workstream progress

Usage:
  work status [options]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Specific workstream ID or name (shows all if omitted)
  --json, -j       Output as JSON
  --help, -h       Show this help message

Examples:
  # Show all workstreams
  work status

  # Show specific workstream
  work status --stream "001-my-stream"

  # Get JSON output
  work status --json
`)
}

function parseCliArgs(argv: string[]): StatusCliArgs | null {
  const args = argv.slice(2)
  const parsed: StatusCliArgs = { json: false }

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

  let index
  try {
    index = loadIndex(repoRoot)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  if (index.streams.length === 0) {
    console.log("No workstreams found.")
    return
  }

  // Resolve stream ID: explicit > current > all
  const resolvedStreamId = resolveStreamId(index, cliArgs.streamId)

  const streamsToShow = resolvedStreamId
    ? index.streams.filter(
        (s) => s.id === resolvedStreamId || s.name === resolvedStreamId
      )
    : index.streams

  if (streamsToShow.length === 0) {
    console.error(`Error: Workstream "${resolvedStreamId}" not found`)
    process.exit(1)
  }

  const progressList = streamsToShow.map((s) => {
    const progress = getStreamProgress(repoRoot, s)
    const status = getStreamStatus(repoRoot, s)
    return { stream: s, progress, status }
  })

  if (cliArgs.json) {
    const jsonOutput = progressList.map(({ progress, status }) => ({
      ...progress,
      status,
    }))
    console.log(JSON.stringify(jsonOutput, null, 2))
  } else {
    for (const { progress, status } of progressList) {
      console.log(formatProgress(progress, status))
      console.log()
    }
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
