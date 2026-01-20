/**
 * CLI: Prompt
 *
 * Generates execution prompts for agents with full thread context.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import {
  getPromptContext,
  generateThreadPrompt,
  generateThreadPromptJson,
} from "../lib/prompts.ts"

interface PromptCliArgs {
  repoRoot?: string
  streamId?: string
  threadId?: string
  json?: boolean
  noTests?: boolean
  noParallel?: boolean
}

function printHelp(): void {
  console.log(`
work prompt - Generate thread execution prompt for agents

Usage:
  work prompt --thread "01.00.01" [options]

Required:
  --thread, -t     Thread ID in "stage.batch.thread" format (e.g., "01.00.02")

Optional:
  --stream, -s     Workstream ID or name (uses current if not specified)
  --repo-root, -r  Repository root (auto-detected if omitted)
  --json, -j       Output as JSON instead of markdown
  --no-tests       Exclude test requirements section
  --no-parallel    Exclude parallel threads section
  --help, -h       Show this help message

Description:
  Generates a comprehensive execution prompt for an agent to work on a specific
  thread. The prompt includes:
  - Thread summary and details from PLAN.md
  - Tasks assigned to the thread
  - Stage definition and constitution
  - Parallel threads for awareness
  - Test requirements from work/TESTS.md (if present)
  - Agent assignment information

Examples:
  work prompt --thread "01.00.01"
  work prompt --thread "01.00.02" --stream "001-my-feature"
  work prompt --thread "01.00.01" --json
  work prompt --thread "01.00.01" > prompt.md
`)
}

function parseCliArgs(argv: string[]): PromptCliArgs | null {
  const args = argv.slice(2)
  const parsed: Partial<PromptCliArgs> = {}

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

      case "--thread":
      case "-t":
        if (!next) {
          console.error("Error: --thread requires a value")
          return null
        }
        parsed.threadId = next
        i++
        break

      case "--json":
      case "-j":
        parsed.json = true
        break

      case "--no-tests":
        parsed.noTests = true
        break

      case "--no-parallel":
        parsed.noParallel = true
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  return parsed as PromptCliArgs
}

export function main(argv: string[] = process.argv): void {
  const cliArgs = parseCliArgs(argv)
  if (!cliArgs) {
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  // Thread ID is required
  if (!cliArgs.threadId) {
    console.error("Error: --thread is required")
    console.error('Example: work prompt --thread "01.00.01"')
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
    process.exit(1)
  }

  // Get prompt context
  let context
  try {
    context = getPromptContext(repoRoot, stream.id, cliArgs.threadId)
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`)
    process.exit(1)
  }

  // Generate and output prompt
  if (cliArgs.json) {
    const json = generateThreadPromptJson(context)
    console.log(JSON.stringify(json, null, 2))
  } else {
    const prompt = generateThreadPrompt(context, {
      includeTests: !cliArgs.noTests,
      includeParallel: !cliArgs.noParallel,
    })
    console.log(prompt)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
