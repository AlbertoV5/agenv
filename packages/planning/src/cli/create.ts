/**
 * CLI: Create Plan
 *
 * Creates a new plan with dynamically generated checklist templates.
 */

import type { PlanSize } from "../lib/types.ts"
import { DEFAULT_STRUCTURE } from "../lib/types.ts"
import { getRepoRoot, findRepoRoot } from "../lib/repo.ts"
import { generatePlan, createGenerateArgs } from "../lib/generate.ts"
import { validatePlanName, parsePositiveInt } from "../lib/utils.ts"

interface CreatePlanCliArgs {
  name: string
  size: PlanSize
  repoRoot?: string
  stages?: number
  supertasks?: number
  subtasks?: number
  cliVersion?: string
}

function printHelp(): void {
  console.log(`
plan create - Create a new implementation plan

Usage:
  plan create --name <name> --size <size> [options]

Required:
  --name, -n       Plan name in kebab-case (e.g., "migrate-sql-to-orm")
  --size, -s       Plan size: short, medium, long

Optional:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stages         Number of stages (default: short=1, medium=3, long=4)
  --supertasks     Supertasks per stage (default: short=1, medium=2, long=3)
  --subtasks       Subtasks per supertask (default: short=3, medium=3, long=4)
  --help, -h       Show this help message

Examples:
  # Create a medium plan (auto-detect repo root)
  plan create --name migrate-sql-to-orm --size medium

  # Create with custom structure
  plan create --name refactor-auth --size long --stages 5 --supertasks 4

Plan Structure by Size:
  short:  Single INDEX.md with tasks (no stages)
  medium: Single INDEX.md with inline stages
  long:   INDEX.md overview + separate STAGE_N.md files
`)
}

function parseCliArgs(argv: string[]): CreatePlanCliArgs | null {
  const args = argv.slice(2)
  const parsed: Partial<CreatePlanCliArgs> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case "--name":
      case "-n":
        if (!next) {
          console.error("Error: --name requires a value")
          return null
        }
        if (!validatePlanName(next)) {
          console.error(
            `Error: Plan name must be kebab-case (e.g., "my-plan"). Got: "${next}"`
          )
          return null
        }
        parsed.name = next
        i++
        break

      case "--size":
      case "-s":
        if (!next || !["short", "medium", "long"].includes(next)) {
          console.error(`Error: Invalid size: ${next}. Must be short, medium, or long.`)
          return null
        }
        parsed.size = next as PlanSize
        i++
        break

      case "--repo-root":
      case "-r":
        if (!next) {
          console.error("Error: --repo-root requires a value")
          return null
        }
        parsed.repoRoot = next
        i++
        break

      case "--stages":
        if (!next) {
          console.error("Error: --stages requires a value")
          return null
        }
        try {
          parsed.stages = parsePositiveInt(next, "--stages")
        } catch (e) {
          console.error((e as Error).message)
          return null
        }
        i++
        break

      case "--supertasks":
        if (!next) {
          console.error("Error: --supertasks requires a value")
          return null
        }
        try {
          parsed.supertasks = parsePositiveInt(next, "--supertasks")
        } catch (e) {
          console.error((e as Error).message)
          return null
        }
        i++
        break

      case "--subtasks":
        if (!next) {
          console.error("Error: --subtasks requires a value")
          return null
        }
        try {
          parsed.subtasks = parsePositiveInt(next, "--subtasks")
        } catch (e) {
          console.error((e as Error).message)
          return null
        }
        i++
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)

      case "--cli-version":
        // Hidden arg: CLI version passed from @agenv/cli
        if (next) {
          parsed.cliVersion = next
          i++
        }
        break
    }
  }

  // Validate required args
  if (!parsed.name) {
    console.error("Error: --name is required")
    return null
  }
  if (!parsed.size) {
    console.error("Error: --size is required")
    return null
  }

  return parsed as CreatePlanCliArgs
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

  // Build args with defaults
  const generateArgs = createGenerateArgs(cliArgs.name, cliArgs.size, repoRoot, {
    stages: cliArgs.stages,
    supertasks: cliArgs.supertasks,
    subtasks: cliArgs.subtasks,
    cliVersion: cliArgs.cliVersion,
  })

  try {
    const result = generatePlan(generateArgs)
    console.log(`Created plan: ${result.planId}`)
    console.log(`   Path: ${result.planPath}`)
    console.log(`   Size: ${result.size}`)
    console.log(
      `   Structure: ${result.stages} stages x ${result.supertasks} supertasks x ${result.subtasks} subtasks`
    )
    console.log(`   Sessions: ~${result.sessions}`)
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
