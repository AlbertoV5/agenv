/**
 * CLI: Workstream Report
 *
 * Generate progress reports for workstreams.
 * Supports both full workstream reports and stage-specific reports.
 */

import { writeFileSync } from "fs"
import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, resolveStreamId, findStream } from "../lib/index.ts"
import { generateReport, formatReportMarkdown } from "../lib/document.ts"
import {
  generateStageReport,
  formatStageReportMarkdown,
  saveStageReport,
} from "../lib/reports.ts"

interface ReportCliArgs {
  repoRoot?: string
  streamId?: string
  stage?: string
  all: boolean
  output?: string
  json: boolean
  save: boolean
}

function printHelp(): void {
  console.log(`
work report - Generate progress report

Usage:
  work report [options]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Specific workstream ID or name (uses current if set)
  --stage          Generate stage-specific report (number or name)
  --all            Generate report for all workstreams
  --output, -o     Output file path (prints to stdout if omitted)
  --save           Save stage report to reports/ directory
  --json, -j       Output as JSON
  --help, -h       Show this help message

Examples:
  # Current workstream report
  work report

  # Stage-specific report
  work report --stage 1
  work report --stage "Foundation"

  # Save stage report to work/{stream}/reports/
  work report --stage 1 --save

  # Specific workstream
  work report --stream "001-my-stream"

  # Write to file
  work report --output report.md

  # All workstreams
  work report --all

  # JSON output
  work report --json
`)
}

function parseCliArgs(argv: string[]): ReportCliArgs | null {
  const args = argv.slice(2)
  const parsed: ReportCliArgs = {
    all: false,
    json: false,
    save: false,
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

      case "--stage":
        if (!next) {
          console.error("Error: --stage requires a value")
          return null
        }
        parsed.stage = next
        i++
        break

      case "--all":
        parsed.all = true
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

      case "--save":
        parsed.save = true
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

  // Resolve stream ID first (needed for stage reports too)
  const resolvedStreamId = resolveStreamId(index, cliArgs.streamId)

  // Handle --stage flag: generate stage-specific report
  if (cliArgs.stage) {
    if (!resolvedStreamId) {
      console.error(
        "Error: No workstream specified. Use --stream or set current with 'work current --set'",
      )
      process.exit(1)
    }

    const stream = findStream(index, resolvedStreamId)
    if (!stream) {
      console.error(`Error: Workstream "${resolvedStreamId}" not found`)
      process.exit(1)
    }

    try {
      // Parse stage reference (number or name)
      const stageRef = /^\d+$/.test(cliArgs.stage)
        ? parseInt(cliArgs.stage, 10)
        : cliArgs.stage

      const report = generateStageReport(repoRoot, stream.id, stageRef)

      if (cliArgs.json) {
        const output = JSON.stringify(report, null, 2)
        if (cliArgs.output) {
          writeFileSync(cliArgs.output, output)
          console.log(`Stage report written to ${cliArgs.output}`)
        } else {
          console.log(output)
        }
        return
      }

      // Save to reports directory if --save flag is set
      if (cliArgs.save) {
        const savedPath = saveStageReport(repoRoot, stream.id, report)
        console.log(`Stage report saved to ${savedPath}`)
        return
      }

      const output = formatStageReportMarkdown(report)

      if (cliArgs.output) {
        writeFileSync(cliArgs.output, output)
        console.log(`Stage report written to ${cliArgs.output}`)
      } else {
        console.log(output)
      }
    } catch (e) {
      console.error(`Error: ${(e as Error).message}`)
      process.exit(1)
    }
    return
  }

  // Handle --all flag
  if (cliArgs.all) {
    const reports = index.streams.map((stream) => generateReport(repoRoot, stream.id))

    if (cliArgs.json) {
      const output = JSON.stringify(reports, null, 2)
      if (cliArgs.output) {
        writeFileSync(cliArgs.output, output)
        console.log(`Report written to ${cliArgs.output}`)
      } else {
        console.log(output)
      }
      return
    }

    const markdowns = reports.map((r) => formatReportMarkdown(r))
    const output = markdowns.join("\n\n---\n\n")

    if (cliArgs.output) {
      writeFileSync(cliArgs.output, output)
      console.log(`Report written to ${cliArgs.output}`)
    } else {
      console.log(output)
    }
    return
  }

  // Single workstream report
  if (!resolvedStreamId) {
    console.error(
      "Error: No workstream specified. Use --stream or set current with 'work current --set'",
    )
    process.exit(1)
  }

  const stream = findStream(index, resolvedStreamId)
  if (!stream) {
    console.error(`Error: Workstream "${resolvedStreamId}" not found`)
    process.exit(1)
  }

  const report = generateReport(repoRoot, stream.id)

  if (cliArgs.json) {
    const output = JSON.stringify(report, null, 2)
    if (cliArgs.output) {
      writeFileSync(cliArgs.output, output)
      console.log(`Report written to ${cliArgs.output}`)
    } else {
      console.log(output)
    }
    return
  }

  const output = formatReportMarkdown(report)

  if (cliArgs.output) {
    writeFileSync(cliArgs.output, output)
    console.log(`Report written to ${cliArgs.output}`)
  } else {
    console.log(output)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
