/**
 * CLI: Workstream Metrics
 *
 * Evaluate and analyze workstream progress with metrics and filtering.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, resolveStreamId, findStream } from "../lib/index.ts"
import { getTasks } from "../lib/tasks.ts"
import {
  evaluateStream,
  evaluateAllStreams,
  filterTasks,
  filterTasksByStatus,
  analyzeBlockers,
  formatMetricsOutput,
  formatBlockerAnalysis,
  aggregateMetrics,
} from "../lib/metrics.ts"
import type { TaskStatus } from "../lib/types.ts"

interface MetricsCliArgs {
  repoRoot?: string
  streamId?: string
  all: boolean
  filter?: string
  regex: boolean
  filterStatus?: string
  blockers: boolean
  json: boolean
  compact: boolean
}

function printHelp(): void {
  console.log(`
work metrics - Evaluate workstream progress and metrics

Usage:
  work metrics [options]

Options:
  --repo-root, -r      Repository root (auto-detected if omitted)
  --stream, -s         Specific workstream ID or name (uses current if set)
  --all                Evaluate all workstreams (aggregate metrics)
  --filter <pattern>   Filter tasks by name pattern
  --regex              Treat filter as regex pattern
  --filter-status <s>  Filter by status (comma-separated: pending,blocked)
  --blockers           Show blocked task analysis
  --json, -j           Output as JSON
  --compact            Single-line summary per workstream
  --help, -h           Show this help message

Examples:
  # Current workstream metrics
  work metrics

  # Specific workstream
  work metrics --stream "001-my-stream"

  # All workstreams aggregate
  work metrics --all

  # Filter tasks by name
  work metrics --filter "api"
  work metrics --filter "test.*endpoint" --regex

  # Filter by status
  work metrics --filter-status blocked
  work metrics --filter-status in_progress,blocked

  # Blocker analysis
  work metrics --blockers

  # JSON output
  work metrics --json
`)
}

function parseCliArgs(argv: string[]): MetricsCliArgs | null {
  const args = argv.slice(2)
  const parsed: MetricsCliArgs = {
    all: false,
    regex: false,
    blockers: false,
    json: false,
    compact: false,
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

      case "--filter":
        if (!next) {
          console.error("Error: --filter requires a value")
          return null
        }
        parsed.filter = next
        i++
        break

      case "--regex":
        parsed.regex = true
        break

      case "--filter-status":
        if (!next) {
          console.error("Error: --filter-status requires a value")
          return null
        }
        parsed.filterStatus = next
        i++
        break

      case "--blockers":
        parsed.blockers = true
        break

      case "--json":
      case "-j":
        parsed.json = true
        break

      case "--compact":
        parsed.compact = true
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

  // Handle --all flag
  if (cliArgs.all) {
    const allMetrics = evaluateAllStreams(repoRoot)

    if (cliArgs.json) {
      const aggregate = aggregateMetrics(allMetrics)
      console.log(JSON.stringify({ streams: allMetrics, aggregate }, null, 2))
      return
    }

    if (cliArgs.compact) {
      for (const metrics of allMetrics) {
        console.log(formatMetricsOutput(metrics, { compact: true }))
      }
      console.log("")
      const aggregate = aggregateMetrics(allMetrics)
      console.log(formatMetricsOutput(aggregate, { compact: true }))
      return
    }

    for (const metrics of allMetrics) {
      console.log(formatMetricsOutput(metrics))
      console.log("")
    }

    console.log("─".repeat(40))
    const aggregate = aggregateMetrics(allMetrics)
    console.log(formatMetricsOutput(aggregate))
    return
  }

  // Single workstream metrics
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

  // Handle --blockers flag
  if (cliArgs.blockers) {
    const analysis = analyzeBlockers(repoRoot, stream.id)

    if (cliArgs.json) {
      console.log(JSON.stringify(analysis, null, 2))
      return
    }

    console.log(formatBlockerAnalysis(analysis))
    return
  }

  // Handle filters
  if (cliArgs.filter || cliArgs.filterStatus) {
    let tasks = getTasks(repoRoot, stream.id)

    // Apply status filter first
    if (cliArgs.filterStatus) {
      const statuses = cliArgs.filterStatus.split(",") as TaskStatus[]
      tasks = filterTasksByStatus(tasks, statuses)
    }

    // Apply name filter
    if (cliArgs.filter) {
      const result = filterTasks(tasks, cliArgs.filter, cliArgs.regex)
      tasks = result.matchingTasks

      if (cliArgs.json) {
        console.log(JSON.stringify(result, null, 2))
        return
      }

      console.log(
        `Found ${result.matchCount} of ${result.totalTasks} tasks matching "${cliArgs.filter}":`
      )
      console.log("")
      for (const task of tasks) {
        const statusIcon = getStatusIcon(task.status)
        console.log(`  ${statusIcon} [${task.id}] ${task.name}`)
      }
      return
    }

    // Status filter only
    if (cliArgs.json) {
      console.log(JSON.stringify({ tasks, count: tasks.length }, null, 2))
      return
    }

    console.log(`Found ${tasks.length} tasks with status: ${cliArgs.filterStatus}`)
    console.log("")
    for (const task of tasks) {
      const statusIcon = getStatusIcon(task.status)
      console.log(`  ${statusIcon} [${task.id}] ${task.name}`)
    }
    return
  }

  // Default: show metrics
  const metrics = evaluateStream(repoRoot, stream.id)

  if (cliArgs.json) {
    console.log(JSON.stringify(metrics, null, 2))
    return
  }

  console.log(formatMetricsOutput(metrics, { compact: cliArgs.compact }))
}

function getStatusIcon(status: TaskStatus): string {
  switch (status) {
    case "completed":
      return "[x]"
    case "in_progress":
      return "[~]"
    case "blocked":
      return "[!]"
    case "cancelled":
      return "[-]"
    default:
      return "[ ]"
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
