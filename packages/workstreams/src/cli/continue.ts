/**
 * CLI: Continue
 *
 * Resumes context for a workstream using breadcrumbs.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getContinueContext } from "../lib/continue.ts"

interface ContinueCliArgs {
  repoRoot?: string
  streamId?: string
}

function printHelp(): void {
  console.log(`
work continue - Resume work on a workstream

Usage:
  work continue [options]

Optional:
  --stream, -s     Workstream ID or name (uses current if not specified)
  --repo-root, -r  Repository root (auto-detected if omitted)
  --help, -h       Show this help message

Description:
  This command helps an agent (or user) orient themselves when resuming work.
  It displays:
  1. The current active task (or next pending task)
  2. The last breadcrumb (if any)
  3. Context about the workstream status

Examples:
  work continue
  work continue --stream "001-my-feature"
`)
}

function parseCliArgs(argv: string[]): ContinueCliArgs | null {
  const args = argv.slice(2)
  const parsed: Partial<ContinueCliArgs> = {}

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

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  return parsed as ContinueCliArgs
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

  let stream
  try {
    stream = getResolvedStream(index, cliArgs.streamId)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  const ctx = getContinueContext(repoRoot, stream.id, stream.name)

  console.log(`\n# Resume: ${ctx.streamId} (${ctx.streamName})\n`)

  if (ctx.activeTask) {
    const t = ctx.activeTask
    console.log(`## Status: Active Task in Progress`)
    console.log(`Task ID: ${t.id}`)
    console.log(`Description: ${t.name}`)
    console.log(
      `Location: Stage ${t.stage_name} > Batch ${t.batch_name} > Thread ${t.thread_name}`,
    )

    if (ctx.assignedAgent) {
      console.log(`Assigned Agent: ${ctx.assignedAgent}`)
    }

    if (t.breadcrumb) {
      console.log(`\n## Last Breadcrumb`)
      console.log(`> ${t.breadcrumb}`)
    } else {
      console.log(`\n## Last Breadcrumb`)
      console.log(`(No breadcrumb logged)`)
    }

    console.log(`\n## Action Required`)
    console.log(
      `Resume execution of this task. Check the last breadcrumb for context.`,
    )
  } else {
    // No active task, look for next pending
    if (ctx.lastCompletedTask) {
      const t = ctx.lastCompletedTask
      console.log(`## Previous Context`)
      console.log(`Last Completed Task: ${t.id} - ${t.name}`)
      if (t.breadcrumb) {
        console.log(`Last Breadcrumb: ${t.breadcrumb}`)
      }
    }

    if (ctx.nextTask) {
      const t = ctx.nextTask
      console.log(`\n## Status: Ready to Start New Task`)
      console.log(`Next Task ID: ${t.id}`)
      console.log(`Description: ${t.name}`)
      console.log(
        `Location: Stage ${t.stage_name} > Batch ${t.batch_name} > Thread ${t.thread_name}`,
      )

      if (ctx.assignedAgent) {
        console.log(`Assigned Agent: ${ctx.assignedAgent}`)
      }

      console.log(`\n## Action Required`)
      console.log(
        `Start this task using: work update --task "${t.id}" --status in_progress`,
      )
    } else {
      console.log(`\n## Status: All Tasks Completed`)
      console.log(
        `No pending tasks found. The workstream appears to be complete.`,
      )
    }
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
