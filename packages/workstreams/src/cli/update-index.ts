/**
 * CLI: Update Index
 *
 * Updates specific fields in a workstream's index.json entry.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { updateIndexField, formatStreamInfo } from "../lib/complete.ts"

interface UpdateIndexCliArgs {
  repoRoot?: string
  streamId?: string
  field?: string
  value?: string
  list: boolean
}

function printHelp(): void {
  console.log(`
work index - Update workstream metadata fields

Usage:
  work index [--stream <id>] --field <path> --value <value>
  work index [--stream <id>] --list

Options:
  --stream, -s     Workstream ID or name (uses current if not specified)
  --field, -f      Field path using dot notation (e.g., "status")
  --value, -v      New value (auto-parsed to appropriate type)
  --list, -l       List current workstream fields
  --repo-root, -r  Repository root (auto-detected if omitted)
  --help, -h       Show this help message

Field Examples:
  name                            Workstream name
  status                          Workstream status (pending/in_progress/completed/on_hold)
  session_estimated.length        Number of estimated sessions

Value Parsing:
  "true"/"false"  -> boolean
  "123"           -> number
  "{...}"/"[...]" -> JSON
  anything else   -> string

Examples:
  # List workstream fields (uses current workstream)
  work index --list

  # Update workstream status
  work index --field "status" --value "on_hold"

  # List fields for a specific workstream
  work index --stream "001-my-stream" --list
`)
}

function parseCliArgs(argv: string[]): UpdateIndexCliArgs | null {
  const args = argv.slice(2)
  const parsed: Partial<UpdateIndexCliArgs> = { list: false }

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

      case "--field":
      case "-f":
        if (!next) {
          console.error("Error: --field requires a value")
          return null
        }
        parsed.field = next
        i++
        break

      case "--value":
      case "-v":
        if (!next) {
          console.error("Error: --value requires a value")
          return null
        }
        parsed.value = next
        i++
        break

      case "--list":
      case "-l":
        parsed.list = true
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  // If not listing, require field and value
  if (!parsed.list && (!parsed.field || parsed.value === undefined)) {
    console.error(
      "Error: --field and --value are required when not using --list"
    )
    return null
  }

  return parsed as UpdateIndexCliArgs
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
    console.log("\nAvailable workstreams:")
    for (const s of index.streams) {
      console.log(`  - ${s.id} (${s.name})`)
    }
    process.exit(1)
  }

  // List mode
  if (cliArgs.list) {
    console.log(formatStreamInfo(stream))
    return
  }

  try {
    const result = updateIndexField({
      repoRoot,
      streamId: stream.id,
      field: cliArgs.field!,
      value: cliArgs.value!,
    })

    console.log(`Updated ${result.field} in workstream "${result.streamId}"`)
    console.log(`   Previous: ${JSON.stringify(result.previousValue)}`)
    console.log(`   New: ${JSON.stringify(result.newValue)}`)
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
