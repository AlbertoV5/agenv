#!/usr/bin/env bun
/**
 * Preview script: 2x2 Grid Layout Tester
 * 
 * Standalone visual tester for tmux 2x2 grid layout.
 * Creates a tmux session with 4 panes running simple commands
 * to verify the grid layout works correctly.
 * 
 * Usage:
 *   bun run scripts/preview-grid.ts
 */

import {
  createSession,
  attachSession,
  killSession,
  sessionExists,
  setGlobalOption,
  createGridLayout,
  THREAD_START_DELAY_MS,
} from "../packages/workstreams/src/lib/tmux.ts"

const SESSION_NAME = "preview-grid"

// Simple visual commands to distinguish panes
const PANE_COMMANDS = [
  `bash -c 'echo "╔══════════════════════════════╗"; echo "║     TOP-LEFT PANE (1/4)     ║"; echo "╚══════════════════════════════╝"; echo ""; echo "Grid position: Top-Left"; echo "Layout test: OK"; echo ""; echo "Press Ctrl+b X to exit"; sleep infinity'`,
  `bash -c 'echo "╔══════════════════════════════╗"; echo "║    TOP-RIGHT PANE (2/4)     ║"; echo "╚══════════════════════════════╝"; echo ""; echo "Grid position: Top-Right"; echo "Layout test: OK"; echo ""; echo "Press Ctrl+b X to exit"; sleep infinity'`,
  `bash -c 'echo "╔══════════════════════════════╗"; echo "║   BOTTOM-LEFT PANE (3/4)    ║"; echo "╚══════════════════════════════╝"; echo ""; echo "Grid position: Bottom-Left"; echo "Layout test: OK"; echo ""; echo "Press Ctrl+b X to exit"; sleep infinity'`,
  `bash -c 'echo "╔══════════════════════════════╗"; echo "║  BOTTOM-RIGHT PANE (4/4)    ║"; echo "╚══════════════════════════════╝"; echo ""; echo "Grid position: Bottom-Right"; echo "Layout test: OK"; echo ""; echo "Press Ctrl+b X to exit"; sleep infinity'`,
]

function printHelp(): void {
  console.log(`
Preview: 2x2 Grid Layout Tester

Visual test for tmux 2x2 grid layout. Creates a session with
4 panes displaying their position to verify layout correctness.

Usage:
  bun run scripts/preview-grid.ts

Expected layout:
  ┌──────────────┬──────────────┐
  │  TOP-LEFT    │  TOP-RIGHT   │
  │   (1/4)      │    (2/4)     │
  ├──────────────┼──────────────┤
  │ BOTTOM-LEFT  │ BOTTOM-RIGHT │
  │   (3/4)      │    (4/4)     │
  └──────────────┴──────────────┘

Controls:
  Ctrl+b X  Kill session and exit

Description:
  Each pane displays its expected position in the grid.
  Verify that:
  - All 4 panes are visible
  - Layout is 2x2 (not 1+3 or other configuration)
  - Panes are evenly sized
  - Labels match their actual position
`)
}

async function main() {
  // Check for help flag
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp()
    process.exit(0)
  }

  console.log(`Preview: 2x2 Grid Layout Tester\n`)

  // Check if session already exists
  if (sessionExists(SESSION_NAME)) {
    console.error(`Error: tmux session "${SESSION_NAME}" already exists.`)
    console.error(`\nOptions:`)
    console.error(`  1. Attach to it: tmux attach -t "${SESSION_NAME}"`)
    console.error(`  2. Kill it: tmux kill-session -t "${SESSION_NAME}"`)
    process.exit(1)
  }

  console.log(`Creating tmux session "${SESSION_NAME}" with 2x2 grid...\n`)

  // Create session with first pane
  createSession(SESSION_NAME, "Grid", PANE_COMMANDS[0]!)
  Bun.sleepSync(THREAD_START_DELAY_MS)

  // Enable mouse support for easier navigation
  setGlobalOption(SESSION_NAME, "mouse", "on")

  console.log("  Creating pane 1/4 (Top-Left)")

  // Create grid layout with all 4 panes
  console.log("  Creating 2x2 grid layout...")
  createGridLayout(`${SESSION_NAME}:0`, PANE_COMMANDS)
  
  console.log("  Creating pane 2/4 (Top-Right)")
  console.log("  Creating pane 3/4 (Bottom-Left)")
  console.log("  Creating pane 4/4 (Bottom-Right)")

  // Bind Ctrl+b X to kill session
  Bun.spawnSync(["tmux", "bind-key", "X", "kill-session"])

  console.log(`\nGrid layout created successfully!`)
  console.log(`\nVerify that:`)
  console.log(`  - All 4 panes are visible`)
  console.log(`  - Layout is 2x2 (not 1+3 or other configuration)`)
  console.log(`  - Panes are roughly equal in size`)
  console.log(`  - Each pane shows its correct position`)
  console.log(`\nPress Ctrl+b X to kill the session when done.\n`)

  console.log(`Attaching to session "${SESSION_NAME}"...\n`)

  // Attach to session (this takes over the terminal)
  const child = attachSession(SESSION_NAME)

  child.on("close", (code) => {
    console.log(`\nSession detached.`)
    
    // Check if session still exists
    if (sessionExists(SESSION_NAME)) {
      console.log(`\nSession still exists:`)
      console.log(`  To reattach: tmux attach -t "${SESSION_NAME}"`)
      console.log(`  To kill: tmux kill-session -t "${SESSION_NAME}"`)
    } else {
      console.log(`Session closed successfully.`)
    }
    
    process.exit(code ?? 0)
  })

  child.on("error", (err) => {
    console.error(`Error attaching to tmux session: ${err.message}`)
    process.exit(1)
  })
}

// Run if called directly
if (import.meta.main) {
  await main()
}
