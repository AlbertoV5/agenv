/**
 * CLI: Planning Session Management
 *
 * Opens the planning opencode session for the current workstream.
 * 
 * Usage:
 *   work plan                              - Resume planning session for current workstream
 *   work plan --stream "001-my-stream"     - Resume planning session for specific workstream
 *   work plan --set <sessionId>            - Set the planning session ID for current workstream
 *   work plan --stream <id> --set <sessionId> - Set planning session for specific workstream
 */

import { spawn } from "child_process"
import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, resolveStreamId, getPlanningSessionId, setStreamPlanningSession } from "../lib/index.ts"

interface PlanCliArgs {
  repoRoot?: string
  stream?: string
  set?: string
  help: boolean
}

function printHelp(): void {
  console.log(`
work plan - Manage planning sessions for workstreams

Usage:
  work plan [options]

Description:
  Opens the planning opencode session for the current (or specified) workstream.
  If a planning session exists, it will be resumed using opencode.
  
  Use --set to manually store a planning session ID if you created one outside
  of the normal workflow.

Options:
  --stream, -s <id>    Workstream ID or name (uses current if not specified)
  --set <sessionId>    Set the planning session ID for the workstream
  --repo-root, -r      Repository root (auto-detected if omitted)
  --help, -h           Show this help message

Manual Workflow for Capturing Planning Session:
  If you run the planning agent manually using opencode, you can capture
  the session ID for later resumption:
  
  1. Create a workstream:
     work create --name my-feature --stages 3
  
  2. Run the planning agent manually:
     opencode
     # The planning agent will display a session ID (e.g., "ses_abc123xyz")
  
  3. Capture the session ID:
     work plan --set ses_abc123xyz
  
  4. Later, resume the planning session:
     work plan

Examples:
  # Resume planning session for current workstream
  work plan

  # Resume planning session for specific workstream
  work plan --stream "001-my-feature"

  # Set planning session ID for current workstream
  work plan --set "ses_abc123xyz"

  # Set planning session ID for specific workstream
  work plan --stream "001-my-feature" --set "ses_abc123xyz"
`)
}

function parseCliArgs(argv: string[]): PlanCliArgs | null {
  const args = argv.slice(2)
  const parsed: PlanCliArgs = { help: false }

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
        if (!next) {
          console.error("Error: --stream requires a value")
          return null
        }
        parsed.stream = next
        i++
        break

      case "--set":
        if (!next) {
          console.error("Error: --set requires a value")
          return null
        }
        parsed.set = next
        i++
        break

      case "--help":
      case "-h":
        parsed.help = true
        break

      default:
        if (arg && arg.startsWith("-")) {
          console.error(`Error: Unknown option "${arg}"`)
          return null
        }
    }
  }

  return parsed
}

/**
 * Set the planning session ID for a workstream
 */
function handleSetSession(
  repoRoot: string,
  streamId: string,
  sessionId: string
): void {
  try {
    const stream = setStreamPlanningSession(repoRoot, streamId, sessionId)
    console.log(`Set planning session for workstream "${stream.id}":`)
    console.log(`  Session ID: ${sessionId}`)
    console.log(`\nYou can now resume this session with:`)
    console.log(`  work plan`)
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`)
    process.exit(1)
  }
}

/**
 * Resume the planning session for a workstream
 */
function handleResumeSession(
  repoRoot: string,
  streamId: string
): void {
  try {
    const sessionId = getPlanningSessionId(repoRoot, streamId)
    
    if (!sessionId) {
      console.error(`No planning session found for workstream "${streamId}".`)
      console.error("")
      console.error("Options:")
      console.error("  1. If you created a planning session manually, use:")
      console.error("     work plan --set <sessionId>")
      console.error("")
      console.error("  2. Create a new workstream with planning session:")
      console.error("     work create --name my-feature")
      process.exit(1)
    }

    console.log(`Resuming planning session for workstream "${streamId}"...`)
    console.log(`Session ID: ${sessionId}`)
    console.log("")

    // Spawn opencode with the session ID
    const child = spawn("opencode", ["--session", sessionId], {
      stdio: "inherit",
      cwd: repoRoot,
    })

    child.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.error(`\nopencode exited with code ${code}`)
        process.exit(code)
      }
    })

    child.on("error", (err) => {
      console.error(`\nFailed to launch opencode: ${err.message}`)
      process.exit(1)
    })
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`)
    process.exit(1)
  }
}

export function main(argv: string[] = process.argv): void {
  const cliArgs = parseCliArgs(argv)
  
  if (!cliArgs) {
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  if (cliArgs.help) {
    printHelp()
    process.exit(0)
  }

  // Auto-detect repo root if not provided
  let repoRoot: string
  try {
    repoRoot = cliArgs.repoRoot ?? getRepoRoot()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  // Load index and resolve stream ID
  let index
  try {
    index = loadIndex(repoRoot)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  const resolvedStreamId = resolveStreamId(index, cliArgs.stream)
  if (!resolvedStreamId) {
    if (cliArgs.stream) {
      console.error(`Error: Workstream "${cliArgs.stream}" not found.`)
    } else {
      console.error("Error: No current workstream set.")
      console.error("Run 'work current --set <stream-id>' to set one.")
    }
    process.exit(1)
  }

  // Handle --set flag
  if (cliArgs.set) {
    handleSetSession(repoRoot, resolvedStreamId, cliArgs.set)
  } else {
    // Default: resume session
    handleResumeSession(repoRoot, resolvedStreamId)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
