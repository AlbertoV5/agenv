/**
 * CLI: Create Workstream
 *
 * Creates a new workstream with PLAN.md template and empty tasks.json.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { generateStream, createGenerateArgs } from "../lib/generate.ts"
import { validateStreamName } from "../lib/utils.ts"

interface CreateStreamCliArgs {
  name: string
  repoRoot?: string
}

function printHelp(): void {
  console.log(`
work create - Create a new workstream

Usage:
  work create --name <name>

Required:
  --name, -n       Workstream name in kebab-case (e.g., "migrate-sql-to-orm")

Optional:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --help, -h       Show this help message

Examples:
  # Create a new workstream
  work create --name migrate-sql-to-orm

  # Create with specific repo root
  work create --name refactor-auth --repo-root /path/to/repo

Workstream Structure:
  Creates a new workstream directory with:
  - PLAN.md     Structured markdown for workstream definition
  - tasks.json  Empty task tracker (populate with "work consolidate")
  - reference/  Directory for supplementary documentation

Workflow:
  1. Create workstream: work create --name my-feature
  2. Edit PLAN.md:      Fill in stages, threads, and tasks
  3. Consolidate:       work consolidate --stream "001-my-feature"
  4. Track progress:    work list --stream "001-my-feature" --tasks
`)
}

function parseCliArgs(argv: string[]): CreateStreamCliArgs | null {
  const args = argv.slice(2)
  const parsed: Partial<CreateStreamCliArgs> = {}

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
        if (!validateStreamName(next)) {
          console.error(
            `Error: Workstream name must be kebab-case (e.g., "my-stream"). Got: "${next}"`
          )
          return null
        }
        parsed.name = next
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

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)

      // Deprecated options - show helpful message
      case "--size":
      case "-s":
        console.error("Error: --size is no longer supported. All workstreams now use a uniform structure.")
        console.error("Run with --help for usage information.")
        return null

      case "--stages":
      case "--supertasks":
      case "--subtasks":
        console.error(`Error: ${arg} is no longer supported. Workstreams are now defined via PLAN.md.`)
        console.error("Run with --help for usage information.")
        return null
    }
  }

  // Validate required args
  if (!parsed.name) {
    console.error("Error: --name is required")
    return null
  }

  return parsed as CreateStreamCliArgs
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

  // Build args
  const generateArgs = createGenerateArgs(
    cliArgs.name,
    repoRoot,
  )

  try {
    const result = generateStream(generateArgs)
    console.log(`Created workstream: ${result.streamId}`)
    console.log(`   Path: ${result.streamPath}`)
    console.log("")
    console.log("Next steps:")
    console.log("  1. Edit PLAN.md to define stages, threads, and tasks")
    console.log(`  2. Run: work consolidate --stream "${result.streamId}"`)
    console.log(`  3. View: work list --stream "${result.streamId}" --tasks`)
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
