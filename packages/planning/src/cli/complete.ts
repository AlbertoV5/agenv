/**
 * CLI: Complete Plan
 *
 * Marks a plan as complete by updating the synthesis status.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { completePlan } from "../lib/complete.ts"

interface CompletePlanCliArgs {
  repoRoot?: string
  planId: string
  referencePath?: string
}

function printHelp(): void {
  console.log(`
plan complete - Mark a plan as complete

Usage:
  plan complete --plan <id> [options]

Required:
  --plan, -p          Plan ID or name

Optional:
  --repo-root, -r     Repository root (auto-detected if omitted)
  --reference-path    Path to synthesized reference document
  --help, -h          Show this help message

Examples:
  # Mark plan complete
  plan complete --plan "001-my-plan"

  # Mark complete with reference
  plan complete --plan "001-my-plan" \\
    --reference-path "docs/references/my-feature.md"
`)
}

function parseCliArgs(argv: string[]): CompletePlanCliArgs | null {
  const args = argv.slice(2)
  const parsed: Partial<CompletePlanCliArgs> = {}

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

      case "--reference-path":
      case "--ref":
        if (!next) {
          console.error("Error: --reference-path requires a value")
          return null
        }
        parsed.referencePath = next
        i++
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  // Validate required args
  if (!parsed.planId) {
    console.error("Error: --plan is required")
    return null
  }

  return parsed as CompletePlanCliArgs
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

  try {
    const result = completePlan({
      repoRoot,
      planId: cliArgs.planId,
      referencePath: cliArgs.referencePath,
    })

    console.log(`Marked plan "${result.planId}" as complete`)
    console.log(`   Synthesized at: ${result.synthesizedAt}`)
    if (result.referencePath) {
      console.log(`   Reference: ${result.referencePath}`)
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
