#!/usr/bin/env bun
/**
 * plan - Unified CLI for plan management
 *
 * Subcommands:
 *   create     - Create a new implementation plan
 *   status     - Show plan progress
 *   update     - Update a task's status
 *   complete   - Mark a plan as complete
 *   index      - Update plan metadata fields
 */

import { main as createMain } from "../src/cli/create.ts"
import { main as statusMain } from "../src/cli/status.ts"
import { main as updateTaskMain } from "../src/cli/update-task.ts"
import { main as completeMain } from "../src/cli/complete.ts"
import { main as updateIndexMain } from "../src/cli/update-index.ts"

const SUBCOMMANDS = {
  create: createMain,
  status: statusMain,
  update: updateTaskMain,
  complete: completeMain,
  index: updateIndexMain,
} as const

type Subcommand = keyof typeof SUBCOMMANDS

function printHelp(): void {
  console.log(`
plan - Plan management CLI

Usage:
  plan <command> [options]

Commands:
  create     Create a new implementation plan
  status     Show plan progress
  update     Update a task's status
  complete   Mark a plan as complete
  index      Update plan metadata fields

Options:
  --help, -h    Show this help message
  --version, -v Show version

Examples:
  plan create --name my-feature --size medium
  plan status
  plan status --plan "001-my-feature"
  plan update --plan "001-my-feature" --task "1.2" --status completed
  plan complete --plan "001-my-feature"
  plan index --plan "001-my-feature" --list

Run 'plan <command> --help' for more information on a command.
`)
}

function printVersion(): void {
  console.log("plan v0.1.0")
}

function main(): void {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    printHelp()
    process.exit(0)
  }

  const firstArg = args[0]

  // Handle global flags
  if (firstArg === "--help" || firstArg === "-h") {
    printHelp()
    process.exit(0)
  }

  if (firstArg === "--version" || firstArg === "-v") {
    printVersion()
    process.exit(0)
  }

  // Check if it's a valid subcommand
  if (!(firstArg in SUBCOMMANDS)) {
    console.error(`Error: Unknown command "${firstArg}"`)
    console.error("\nAvailable commands: " + Object.keys(SUBCOMMANDS).join(", "))
    console.error("\nRun 'plan --help' for usage information.")
    process.exit(1)
  }

  // Call the subcommand with adjusted argv
  // We pass [node, plan-subcommand, ...rest] to match expected argv format
  const subcommand = firstArg as Subcommand
  const subcommandArgs = ["bun", `plan-${subcommand}`, ...args.slice(1)]

  SUBCOMMANDS[subcommand](subcommandArgs)
}

main()
