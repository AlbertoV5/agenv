/**
 * CLI: Workstream Report
 *
 * Generate progress reports for workstreams.
 * Supports both full workstream reports and stage-specific reports.
 */

import { writeFileSync, existsSync } from "fs"
import { join } from "path"
import { getRepoRoot, getWorkDir } from "../lib/repo.ts"
import { loadIndex, resolveStreamId, findStream, atomicWriteFile } from "../lib/index.ts"
import { generateReport, formatReportMarkdown } from "../lib/document.ts"
import {
  generateStageReport,
  formatStageReportMarkdown,
  saveStageReport,
} from "../lib/reports.ts"
import {
  generateReportTemplate,
  validateReport,
} from "../lib/report-template.ts"

interface ReportCliArgs {
  subcommand?: "init" | "validate"
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
work report - Generate and validate workstream reports

Usage:
  work report [subcommand] [options]

Subcommands:
  init             Generate REPORT.md template for an existing workstream
  validate         Validate REPORT.md has required sections filled
  (none)           Generate progress report (default behavior)

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
  # Generate REPORT.md template for current workstream
  work report init

  # Generate REPORT.md template for specific workstream
  work report init --stream "001-my-stream"

  # Validate REPORT.md for current workstream
  work report validate

  # Validate REPORT.md for specific workstream
  work report validate --stream "001-my-stream"

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

  // Check for subcommand as first argument
  if (args.length > 0 && !args[0]?.startsWith("-")) {
    const subcommand = args[0]
    if (subcommand === "init" || subcommand === "validate") {
      parsed.subcommand = subcommand
      // Remove subcommand from args for remaining parsing
      args.shift()
    }
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

/**
 * Handle 'work report init' subcommand
 * Generates REPORT.md template for an existing workstream
 */
function handleInit(repoRoot: string, streamId: string): void {
  const index = loadIndex(repoRoot)
  const stream = findStream(index, streamId)
  if (!stream) {
    console.error(`Error: Workstream "${streamId}" not found`)
    process.exit(1)
  }

  const workDir = getWorkDir(repoRoot)
  const reportPath = join(workDir, stream.id, "REPORT.md")

  // Check if REPORT.md already exists
  if (existsSync(reportPath)) {
    console.error(`Error: REPORT.md already exists at ${reportPath}`)
    console.error("Use --force to overwrite (not implemented yet)")
    process.exit(1)
  }

  try {
    const template = generateReportTemplate(repoRoot, streamId)
    atomicWriteFile(reportPath, template)
    console.log(`Created REPORT.md template: ${reportPath}`)
    console.log("")
    console.log("Next steps:")
    console.log("  1. Fill in the Summary section with a high-level overview")
    console.log("  2. Document accomplishments for each stage")
    console.log("  3. Add file references with changes made")
    console.log("  4. Run: work report validate")
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

/**
 * Handle 'work report validate' subcommand
 * Validates REPORT.md has required sections filled
 */
function handleValidate(repoRoot: string, streamId: string): void {
  const index = loadIndex(repoRoot)
  const stream = findStream(index, streamId)
  if (!stream) {
    console.error(`Error: Workstream "${streamId}" not found`)
    process.exit(1)
  }

  const workDir = getWorkDir(repoRoot)
  const reportPath = join(workDir, stream.id, "REPORT.md")

  // Check if REPORT.md exists
  if (!existsSync(reportPath)) {
    console.error(`Error: REPORT.md not found at ${reportPath}`)
    console.error("Run 'work report init' to create a template")
    process.exit(1)
  }

  try {
    const validation = validateReport(repoRoot, streamId)

    if (validation.valid) {
      console.log("✓ REPORT.md validation passed")
      if (validation.warnings.length > 0) {
        console.log("\nWarnings:")
        for (const warning of validation.warnings) {
          console.log(`  ⚠ ${warning}`)
        }
      }
    } else {
      console.log("✗ REPORT.md validation failed")
      console.log("\nErrors:")
      for (const error of validation.errors) {
        console.log(`  ✗ ${error}`)
      }
      if (validation.warnings.length > 0) {
        console.log("\nWarnings:")
        for (const warning of validation.warnings) {
          console.log(`  ⚠ ${warning}`)
        }
      }
      process.exit(1)
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
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

  // Handle subcommands: init and validate
  if (cliArgs.subcommand === "init") {
    if (!resolvedStreamId) {
      console.error(
        "Error: No workstream specified. Use --stream or set current with 'work current --set'",
      )
      process.exit(1)
    }
    handleInit(repoRoot, resolvedStreamId)
    return
  }

  if (cliArgs.subcommand === "validate") {
    if (!resolvedStreamId) {
      console.error(
        "Error: No workstream specified. Use --stream or set current with 'work current --set'",
      )
      process.exit(1)
    }
    handleValidate(repoRoot, resolvedStreamId)
    return
  }

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
