/**
 * CLI: Complete Workstream
 *
 * Marks a workstream as complete by setting its status to "completed".
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { completeStream } from "../lib/complete.ts"

interface CompleteStreamCliArgs {
  repoRoot?: string
  streamId?: string
}

function printHelp(): void {
  console.log(`
work complete - Mark a workstream as complete

Usage:
  work complete [--stream <id>]

Options:
  --stream, -s      Workstream ID or name (uses current if not specified)
  --repo-root, -r   Repository root (auto-detected if omitted)
  --help, -h        Show this help message

Examples:
  # Mark current workstream complete
  work complete

  # Mark specific workstream complete
  work complete --stream "001-my-stream"
`)
}

function parseCliArgs(argv: string[]): CompleteStreamCliArgs | null {
  const args = argv.slice(2)
  const parsed: Partial<CompleteStreamCliArgs> = {}

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

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  return parsed as CompleteStreamCliArgs
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

  // Resolve stream ID (uses current if not specified)
  let resolvedStreamId: string
  try {
    const index = loadIndex(repoRoot)
    const stream = getResolvedStream(index, cliArgs.streamId)
    resolvedStreamId = stream.id
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  try {
    const result = completeStream({
      repoRoot,
      streamId: resolvedStreamId,
    })

    console.log(`Marked workstream "${result.streamId}" as complete`)
    console.log(`   Completed at: ${result.completedAt}`)
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
