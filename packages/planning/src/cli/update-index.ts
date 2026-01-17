/**
 * CLI: Update Index
 *
 * Updates specific fields in a plan's index.json entry.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getPlan } from "../lib/index.ts"
import { updateIndexField, formatPlanInfo } from "../lib/complete.ts"

interface UpdateIndexCliArgs {
  repoRoot?: string
  planId: string
  field?: string
  value?: string
  list: boolean
}

function printHelp(): void {
  console.log(`
plan index - Update plan metadata fields

Usage:
  plan index --plan <id> --field <path> --value <value>
  plan index --plan <id> --list

Required:
  --plan, -p       Plan ID or name

For Updating:
  --field, -f      Field path using dot notation (e.g., "synthesis.synthesized")
  --value, -v      New value (auto-parsed to appropriate type)

For Listing:
  --list, -l       List current plan fields

Optional:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --help, -h       Show this help message

Field Examples:
  name                      Plan name
  size                      Plan size (short/medium/long)
  synthesis.synthesized     Whether plan is synthesized
  synthesis.reference_path  Path to reference doc
  session.length            Number of estimated sessions

Value Parsing:
  "true"/"false"  -> boolean
  "123"           -> number
  "{...}"/"[...]" -> JSON
  anything else   -> string

Examples:
  # List plan fields
  plan index --plan "001-my-plan" --list

  # Mark plan synthesized
  plan index --plan "001-my-plan" \\
    --field "synthesis.synthesized" --value "true"
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

      case "--plan":
      case "-p":
        if (!next) {
          console.error("Error: --plan requires a value")
          return null
        }
        parsed.planId = next
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

  // Validate required args
  if (!parsed.planId) {
    console.error("Error: --plan is required")
    return null
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

  let plan
  try {
    plan = getPlan(index, cliArgs.planId)
  } catch (e) {
    console.error((e as Error).message)
    console.log("\nAvailable plans:")
    for (const p of index.plans) {
      console.log(`  - ${p.id} (${p.name})`)
    }
    process.exit(1)
  }

  // List mode
  if (cliArgs.list) {
    console.log(formatPlanInfo(plan))
    return
  }

  try {
    const result = updateIndexField({
      repoRoot,
      planId: cliArgs.planId,
      field: cliArgs.field!,
      value: cliArgs.value!,
    })

    console.log(`Updated ${result.field} in plan "${result.planId}"`)
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
