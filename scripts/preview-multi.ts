#!/usr/bin/env bun
/**
 * Preview script: Multi-thread execution with tmux grid
 * 
 * Tests the multi-thread execution flow with mock prompts to verify:
 * - Grid layout (2x2) works correctly
 * - Multiple threads can run in parallel
 * - Small model (claude-3-5-haiku-latest) handles simple tasks
 * 
 * Usage:
 *   bun run scripts/preview-multi.ts [--threads N]
 *   
 * Options:
 *   --threads N  Number of threads to spawn (default: 4, max: 8)
 */

import { join } from "path"
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs"
import {
  createSession,
  addWindow,
  attachSession,
  killSession,
  sessionExists,
  getWorkSessionName,
  setGlobalOption,
  createGridLayout,
  listPaneIds,
  THREAD_START_DELAY_MS,
} from "../packages/workstreams/src/lib/tmux.ts"
import {
  buildRetryRunCommand,
  startServer,
  waitForServer,
  isServerRunning,
} from "../packages/workstreams/src/lib/opencode.ts"
import type { NormalizedModelSpec } from "../packages/workstreams/src/lib/types.ts"

const DEFAULT_THREADS = 4
const MAX_THREADS = 8
const DEFAULT_PORT = 4096
const SESSION_NAME = "preview-multi"

// Mock prompts for testing
const MOCK_PROMPTS = [
  "Say 'Hello from thread 1' and then exit.",
  "List the files in the current directory and then exit.",
  "Say 'Thread 3 reporting' and show the current date, then exit.",
  "Count from 1 to 5 and then exit.",
  "Show the Bun version and then exit.",
  "Say 'Thread 6 completed successfully' and exit.",
  "Echo 'Almost done!' and exit.",
  "Say 'Final thread finished' and exit.",
]

interface CliArgs {
  threads: number
  help: boolean
}

function printHelp(): void {
  console.log(`
Preview: Multi-thread execution with tmux grid

Tests the multi-thread execution flow with mock prompts.

Usage:
  bun run scripts/preview-multi.ts [options]

Options:
  --threads N  Number of threads to spawn (default: ${DEFAULT_THREADS}, max: ${MAX_THREADS})
  --help, -h   Show this help message

Description:
  Creates a tmux session with N threads running simple mock prompts
  using claude-3-5-haiku-latest model. This allows testing:
  - Grid layout (2x2) for up to 4 threads
  - Pagination for 5+ threads
  - Parallel execution without full workstream setup

Example:
  bun run scripts/preview-multi.ts --threads 4
`)
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    threads: DEFAULT_THREADS,
    help: false,
  }

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]

    switch (arg) {
      case "--threads":
        if (!next) {
          console.error("Error: --threads requires a value")
          process.exit(1)
        }
        args.threads = parseInt(next, 10)
        if (isNaN(args.threads) || args.threads < 1) {
          console.error("Error: --threads must be a positive number")
          process.exit(1)
        }
        if (args.threads > MAX_THREADS) {
          console.error(`Error: --threads cannot exceed ${MAX_THREADS}`)
          process.exit(1)
        }
        i++
        break

      case "--help":
      case "-h":
        args.help = true
        break

      default:
        console.error(`Error: Unknown option ${arg}`)
        process.exit(1)
    }
  }

  return args
}

async function main() {
  const args = parseArgs(process.argv)

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  const threadCount = args.threads
  console.log(`Preview: Multi-thread execution (${threadCount} threads)\n`)

  // Check if session already exists
  if (sessionExists(SESSION_NAME)) {
    console.error(`Error: tmux session "${SESSION_NAME}" already exists.`)
    console.error(`\nOptions:`)
    console.error(`  1. Attach to it: tmux attach -t "${SESSION_NAME}"`)
    console.error(`  2. Kill it: tmux kill-session -t "${SESSION_NAME}"`)
    process.exit(1)
  }

  // Create temporary directory for mock prompts
  const tmpDir = join("/tmp", `preview-multi-${Date.now()}`)
  mkdirSync(tmpDir, { recursive: true })
  console.log(`Created temp directory: ${tmpDir}\n`)

  // Create mock prompt files
  const promptPaths: string[] = []
  for (let i = 0; i < threadCount; i++) {
    const promptPath = join(tmpDir, `thread-${i + 1}.md`)
    const prompt = MOCK_PROMPTS[i % MOCK_PROMPTS.length]
    writeFileSync(promptPath, prompt!)
    promptPaths.push(promptPath)
  }

  // Model to use (fast and cheap)
  const model: NormalizedModelSpec = {
    model: "claude-3-5-haiku-latest",
  }

  // Start opencode serve if needed
  console.log(`Checking opencode serve on port ${DEFAULT_PORT}...`)
  const serverRunning = await isServerRunning(DEFAULT_PORT)
  if (!serverRunning) {
    console.log(`Starting opencode serve...`)
    startServer(DEFAULT_PORT, process.cwd())

    console.log("Waiting for server to be ready...")
    const ready = await waitForServer(DEFAULT_PORT, 30000)
    if (!ready) {
      console.error(`Error: opencode serve did not start within 30 seconds`)
      // Clean up temp directory
      rmSync(tmpDir, { recursive: true, force: true })
      process.exit(1)
    }
    console.log("Server ready.\n")
  } else {
    console.log(`Server already running.\n`)
  }

  // Create tmux session with grid layout
  console.log(`Creating tmux session "${SESSION_NAME}"...\n`)

  // Build commands for all threads
  const threadCommands: string[] = []
  for (let i = 0; i < threadCount; i++) {
    const cmd = buildRetryRunCommand(
      DEFAULT_PORT,
      [model],
      promptPaths[i]!,
      `Thread ${i + 1}`,
    )
    threadCommands.push(cmd)
  }

  // Create session with first thread
  createSession(SESSION_NAME, "Grid", threadCommands[0]!)
  Bun.sleepSync(THREAD_START_DELAY_MS)

  // Enable options
  setGlobalOption(SESSION_NAME, "remain-on-exit", "on")
  setGlobalOption(SESSION_NAME, "mouse", "on")

  console.log(`  Grid: Thread 1`)

  // For threads 2-4 (or less if fewer threads), create grid layout
  const gridCount = Math.min(4, threadCount)
  if (gridCount > 1) {
    console.log("  Setting up grid layout...")
    const gridCommands = threadCommands.slice(0, gridCount)
    createGridLayout(`${SESSION_NAME}:0`, gridCommands)
    for (let i = 1; i < gridCount; i++) {
      console.log(`  Grid: Thread ${i + 1}`)
    }
  }

  // Create hidden windows for threads 5+
  if (threadCount > 4) {
    console.log("  Creating hidden windows for pagination...")
    for (let i = 4; i < threadCount; i++) {
      const windowName = `T${i + 1}`
      addWindow(SESSION_NAME, windowName, threadCommands[i]!)
      console.log(`  Hidden: ${windowName}`)
      Bun.sleepSync(THREAD_START_DELAY_MS)
    }
  }

  // Bind Ctrl+b X to kill session
  Bun.spawnSync(["tmux", "bind-key", "X", "kill-session"])

  console.log(`\nLayout: ${threadCount <= 4 ? "2x2 Grid (all visible)" : `2x2 Grid with pagination (${threadCount} threads)`}`)
  console.log(`Press Ctrl+b X to kill the session when done.\n`)

  console.log(`Attaching to session "${SESSION_NAME}"...\n`)

  // Attach to session (this takes over the terminal)
  const child = attachSession(SESSION_NAME)

  child.on("close", (code) => {
    console.log(`\nSession detached.`)
    
    // Clean up temp directory
    console.log(`Cleaning up temp directory...`)
    rmSync(tmpDir, { recursive: true, force: true })
    
    console.log(`\nTo reattach: tmux attach -t "${SESSION_NAME}"`)
    console.log(`To kill: tmux kill-session -t "${SESSION_NAME}"`)
    
    process.exit(code ?? 0)
  })

  child.on("error", (err) => {
    console.error(`Error attaching to tmux session: ${err.message}`)
    
    // Clean up temp directory
    rmSync(tmpDir, { recursive: true, force: true })
    
    process.exit(1)
  })
}

// Run if called directly
if (import.meta.main) {
  await main()
}
