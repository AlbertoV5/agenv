/**
 * CLI: Plan Status
 *
 * Shows the current status of one or all plans.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, findPlan } from "../lib/index.ts"
import { getPlanProgress, formatProgress } from "../lib/status.ts"

interface StatusCliArgs {
  repoRoot?: string
  planId?: string
  json: boolean
}

function printHelp(): void {
  console.log(`
plan status - Show plan progress

Usage:
  plan status [options]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --plan, -p       Specific plan ID or name (shows all if omitted)
  --json, -j       Output as JSON
  --help, -h       Show this help message

Examples:
  # Show all plans
  plan status

  # Show specific plan
  plan status --plan "001-my-plan"

  # Get JSON output
  plan status --json
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

      case "--plan":
      case "-p":
        if (!next) {
          console.error("Error: --plan requires a value")
          return null
        }
        parsed.planId = next
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

  if (index.plans.length === 0) {
    console.log("No plans found.")
    return
  }

  const plansToShow = cliArgs.planId
    ? index.plans.filter(
        (p) => p.id === cliArgs.planId || p.name === cliArgs.planId
      )
    : index.plans

  if (plansToShow.length === 0) {
    console.error(`Error: Plan "${cliArgs.planId}" not found`)
    process.exit(1)
  }

  const progressList = plansToShow.map((p) => getPlanProgress(repoRoot, p))

  if (cliArgs.json) {
    console.log(JSON.stringify(progressList, null, 2))
  } else {
    for (const progress of progressList) {
      console.log(formatProgress(progress))
      console.log()
    }
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
