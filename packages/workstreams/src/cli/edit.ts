/**
 * CLI: Edit
 *
 * Open PLAN.md in the user's editor
 */

import { spawn } from "child_process"
import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getStreamPlanMdPath } from "../lib/consolidate.ts"

interface EditCliArgs {
  repoRoot?: string
  streamId?: string
  editor?: string
}

function printHelp(): void {
  console.log(`
work edit - Open PLAN.md in editor

Usage:
  work edit [--stream <id>] [--editor <editor>]

Options:
  --stream, -s     Workstream ID (uses current if not specified)
  --editor, -e     Editor command (default: $EDITOR or 'vim')
  --repo-root, -r  Repository root (auto-detected)
  --help, -h       Show this help message

Description:
  Opens the PLAN.md file for the current or specified workstream in your
  preferred editor. Uses $EDITOR environment variable, falling back to vim.

Examples:
  work edit
  work edit --stream "001-my-feature"
  work edit --editor code
  work edit --editor "code --wait"
`)
}

function parseCliArgs(argv: string[]): EditCliArgs | null {
  const args = argv.slice(2)
  const parsed: EditCliArgs = {}

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
        parsed.streamId = next
        i++
        break

      case "--editor":
      case "-e":
        if (!next) {
          console.error("Error: --editor requires a value")
          return null
        }
        parsed.editor = next
        i++
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

  // Load index and find workstream
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

  // Get PLAN.md path
  const planPath = getStreamPlanMdPath(repoRoot, stream.id)

  // Determine editor
  const editor = cliArgs.editor || process.env.EDITOR || "vim"

  // Parse editor command (may contain args like "code --wait")
  const editorParts = editor.split(" ")
  const editorCmd = editorParts[0]!
  const editorArgs = [...editorParts.slice(1), planPath]

  console.log(`Opening ${stream.id}/PLAN.md in ${editorCmd}...`)

  // Open editor
  const child = spawn(editorCmd, editorArgs, {
    stdio: "inherit",
    shell: false,
  })

  child.on("error", (err) => {
    console.error(`Error: Failed to open editor "${editorCmd}": ${err.message}`)
    process.exit(1)
  })

  child.on("exit", (code) => {
    process.exit(code ?? 0)
  })
}

// Run if called directly
if (import.meta.main) {
  main()
}
