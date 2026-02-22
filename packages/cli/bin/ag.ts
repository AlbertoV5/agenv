#!/usr/bin/env bun
/**
 * ag - AgEnv CLI
 *
 * Root command for all AgEnv tools.
 *
 * Subcommands:
 *   work       - Workstream management (create, status, update, complete, index)
 *   install    - Installation management (skills/hooks/plugins/tools/commands/agents/opencode)
 */

import { main as workMain } from "../../workstreams/bin/work.ts"
import { main as installMain } from "../src/commands/install.ts"
import { VERSION } from "../src/version.ts"

interface SubcommandModule {
  main: (argv: string[]) => void | Promise<void>
}

const SUBCOMMANDS: Record<string, SubcommandModule> = {
  work: { main: workMain },
  install: { main: installMain },
}

function printHelp(): void {
  console.log(`
ag - AgEnv CLI

Usage:
  ag <command> [subcommand] [options]

Commands:
  work       Workstream management (create, status, update, complete, index)
  install    Installation management (skills/hooks/plugins/tools/commands/agents/opencode)

Options:
  --help, -h      Show this help message
  --version, -v   Show version

Examples:
  ag work create --name my-feature
  ag work status
  ag install skills --claude
  ag install skills --all
  ag install opencode

Run 'ag <command> --help' for more information on a command.
`)
}

function printVersion(): void {
  console.log(`ag v${VERSION}`)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    printHelp()
    process.exit(0)
  }

  const command = args[0]!

  // Handle global flags
  if (command === "--help" || command === "-h") {
    printHelp()
    process.exit(0)
  }

  if (command === "--version" || command === "-v") {
    printVersion()
    process.exit(0)
  }

  // Check if it's a valid subcommand
  if (!(command in SUBCOMMANDS)) {
    console.error(`Error: Unknown command "${command}"`)
    console.error(
      "\nAvailable commands: " + Object.keys(SUBCOMMANDS).join(", "),
    )
    console.error("\nRun 'ag --help' for usage information.")
    process.exit(1)
  }

  // Call the subcommand
  // We pass [bun, ag-subcommand, ...rest] to match expected argv format
  // For work commands, inject the cli version for tracking
  let subcommandArgs = ["bun", `ag-${command}`, ...args.slice(1)]
  if (command === "work") {
    // Inject cli version for work create command
    subcommandArgs = [...subcommandArgs, "--cli-version", VERSION]
  }

  await SUBCOMMANDS[command]!.main(subcommandArgs)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
