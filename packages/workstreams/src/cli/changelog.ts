/**
 * CLI: Workstream Changelog
 *
 * Generate changelog from completed tasks.
 */

import { writeFileSync } from "fs"
import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, resolveStreamId, findStream } from "../lib/index.ts"
import { generateChangelog, formatChangelogMarkdown } from "../lib/document.ts"

interface ChangelogCliArgs {
  repoRoot?: string
  streamId?: string
  all: boolean
  since?: string
  sinceDays?: number
  output?: string
  json: boolean
}

function printHelp(): void {
  console.log(`
work changelog - Generate changelog from completed tasks

Usage:
  work changelog [options]

Options:
  --repo-root, -r   Repository root (auto-detected if omitted)
  --stream, -s      Specific workstream ID or name (uses current if set)
  --all             Generate changelog from all workstreams
  --since <date>    Filter tasks completed since date (YYYY-MM-DD)
  --since-days <n>  Filter tasks completed in last N days
  --output, -o      Output file path (prints to stdout if omitted)
  --json, -j        Output as JSON
  --help, -h        Show this help message

Examples:
  # Current workstream changelog
  work changelog

  # Last 7 days
  work changelog --since-days 7

  # Since specific date
  work changelog --since "2026-01-01"

  # Write to file
  work changelog --output CHANGELOG.md

  # All workstreams
  work changelog --all
`)
}

function parseCliArgs(argv: string[]): ChangelogCliArgs | null {
  const args = argv.slice(2)
  const parsed: ChangelogCliArgs = {
    all: false,
    json: false,
  }

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

      case "--all":
        parsed.all = true
        break

      case "--since":
        if (!next) {
          console.error("Error: --since requires a value")
          return null
        }
        parsed.since = next
        i++
        break

      case "--since-days":
        if (!next) {
          console.error("Error: --since-days requires a value")
          return null
        }
        const days = parseInt(next, 10)
        if (isNaN(days) || days <= 0) {
          console.error("Error: --since-days must be a positive number")
          return null
        }
        parsed.sinceDays = days
        i++
        break

      case "--output":
      case "-o":
        if (!next) {
          console.error("Error: --output requires a value")
          return null
        }
        parsed.output = next
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

  // Compute since date
  let sinceDate: Date | undefined
  if (cliArgs.sinceDays) {
    sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - cliArgs.sinceDays)
  } else if (cliArgs.since) {
    sinceDate = new Date(cliArgs.since)
    if (isNaN(sinceDate.getTime())) {
      console.error(`Error: Invalid date format: ${cliArgs.since}`)
      process.exit(1)
    }
  }

  // Handle --all flag
  if (cliArgs.all) {
    const allEntries = index.streams.flatMap((stream) =>
      generateChangelog(repoRoot, stream.id, sinceDate).map((e) => ({
        ...e,
        streamId: stream.id,
        streamName: stream.name,
      }))
    )

    // Sort by completion date
    allEntries.sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )

    if (cliArgs.json) {
      const output = JSON.stringify(allEntries, null, 2)
      if (cliArgs.output) {
        writeFileSync(cliArgs.output, output)
        console.log(`Changelog written to ${cliArgs.output}`)
      } else {
        console.log(output)
      }
      return
    }

    const output = formatChangelogMarkdown(allEntries)

    if (cliArgs.output) {
      writeFileSync(cliArgs.output, output)
      console.log(`Changelog written to ${cliArgs.output}`)
    } else {
      console.log(output)
    }
    return
  }

  // Single workstream changelog
  const resolvedStreamId = resolveStreamId(index, cliArgs.streamId)

  if (!resolvedStreamId) {
    console.error(
      "Error: No workstream specified. Use --stream or set current with 'work current --set'"
    )
    process.exit(1)
  }

  const stream = findStream(index, resolvedStreamId)
  if (!stream) {
    console.error(`Error: Workstream "${resolvedStreamId}" not found`)
    process.exit(1)
  }

  const entries = generateChangelog(repoRoot, stream.id, sinceDate)

  if (cliArgs.json) {
    const output = JSON.stringify(entries, null, 2)
    if (cliArgs.output) {
      writeFileSync(cliArgs.output, output)
      console.log(`Changelog written to ${cliArgs.output}`)
    } else {
      console.log(output)
    }
    return
  }

  const output = formatChangelogMarkdown(entries)

  if (cliArgs.output) {
    writeFileSync(cliArgs.output, output)
    console.log(`Changelog written to ${cliArgs.output}`)
  } else {
    console.log(output)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
