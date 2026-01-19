/**
 * CLI: Fix
 *
 * Append a fix stage to a workstream
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { appendFixStage } from "../lib/fix.ts"

interface FixCliArgs {
  repoRoot?: string
  streamId?: string
  targetStage: number
  name: string
  description?: string
}

function printHelp(): void {
  console.log(`
work fix - Append a fix stage to a workstream

Usage:
  work fix --stage <n> --name <name> [options]

Required:
  --stage          The stage number being fixed (for reference)
  --name           Name of the fix stage (e.g., "auth-race-condition")

Optional:
  --stream, -s     Workstream ID or name (uses current if not specified)
  --description    Description of the fix
  --repo-root, -r  Repository root (auto-detected if omitted)
  --help, -h       Show this help message

Examples:
  work fix --stage 1 --name "api-error-handling"
  work fix --stage 2 --name "layout-bugs" --description "Fix overflow issues on mobile"
`)
}

function parseCliArgs(argv: string[]): FixCliArgs | null {
  const args = argv.slice(2)
  const parsed: Partial<FixCliArgs> = {}

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

      case "--stage":
        if (!next) {
          console.error("Error: --stage requires a value")
          return null
        }
        parsed.targetStage = parseInt(next, 10)
        i++
        break

      case "--name":
        if (!next) {
          console.error("Error: --name requires a value")
          return null
        }
        parsed.name = next
        i++
        break

      case "--description":
        if (!next) {
          console.error("Error: --description requires a value")
          return null
        }
        parsed.description = next
        i++
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  if (!parsed.targetStage || isNaN(parsed.targetStage)) {
    console.error("Error: --stage is required and must be a number")
    return null
  }
  if (!parsed.name) {
    console.error("Error: --name is required")
    return null
  }

  return parsed as FixCliArgs
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

  let stream
  try {
    stream = getResolvedStream(index, cliArgs.streamId)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  try {
    const result = appendFixStage(repoRoot, stream.id, {
      targetStage: cliArgs.targetStage,
      name: cliArgs.name,
      description: cliArgs.description,
    })

    if (result.success) {
      console.log(result.message)
      console.log(`\nRun 'work consolidate' to generate the new tasks.`)
    } else {
      console.error(`Error: ${result.message}`)
      process.exit(1)
    }
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
