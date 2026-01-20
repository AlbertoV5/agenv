#!/usr/bin/env bun
/**
 * work - Unified CLI for workstream management
 *
 * Subcommands:
 *   create      - Create a new workstream
 *   status      - Show workstream progress
 *   update      - Update a task's status
 *   complete    - Mark a workstream as complete
 *   index       - Update workstream metadata fields
 *   read        - Read task details
 *   list        - List tasks in a workstream
 *   add-task    - Add a task to a workstream
 *   delete      - Delete workstreams, stages, threads, or tasks
 *   consolidate - Validate PLAN.md structure
 *   preview     - Show PLAN.md structure
 */

import { main as createMain } from "../src/cli/create.ts"
import { main as statusMain } from "../src/cli/status.ts"
import { main as updateTaskMain } from "../src/cli/update-task.ts"
import { main as completeMain } from "../src/cli/complete.ts"
import { main as updateIndexMain } from "../src/cli/update-index.ts"
import { main as readMain } from "../src/cli/read.ts"
import { main as listMain } from "../src/cli/list.ts"
import { main as addTaskMain } from "../src/cli/add-task.ts"
import { main as consolidateMain } from "../src/cli/consolidate.ts"
import { main as previewMain } from "../src/cli/preview.ts"
import { main as deleteMain } from "../src/cli/delete.ts"
import { main as filesMain } from "../src/cli/files.ts"
import { main as currentMain } from "../src/cli/current.ts"
import { main as setStatusMain } from "../src/cli/set-status.ts"
import { main as metricsMain } from "../src/cli/metrics.ts"
import { main as reportMain } from "../src/cli/report.ts"
import { main as changelogMain } from "../src/cli/changelog.ts"
import { main as exportMain } from "../src/cli/export.ts"
import { main as approveMain } from "../src/cli/approve.ts"
import { main as continueMain } from "../src/cli/continue.ts"
import { main as fixMain } from "../src/cli/fix.ts"
import { main as tasksMain } from "../src/cli/tasks.ts"
import { main as agentsMain } from "../src/cli/agents.ts"
import { main as assignMain } from "../src/cli/assign.ts"

const SUBCOMMANDS = {
  create: createMain,
  current: currentMain,
  continue: continueMain,
  fix: fixMain,
  approve: approveMain,
  status: statusMain,
  "set-status": setStatusMain,
  update: updateTaskMain,
  complete: completeMain,
  index: updateIndexMain,
  read: readMain,
  list: listMain,
  "add-task": addTaskMain,
  consolidate: consolidateMain,
  preview: previewMain,
  delete: deleteMain,
  files: filesMain,
  metrics: metricsMain,
  report: reportMain,
  changelog: changelogMain,
  export: exportMain,
  tasks: tasksMain,
  agents: agentsMain,
  assign: assignMain,
} as const

type Subcommand = keyof typeof SUBCOMMANDS

function printHelp(): void {
  console.log(`
work - Workstream management CLI

Usage:
  work <command> [options]

Commands:
  create      Create a new workstream
  current     Get or set the current workstream
  continue    Resume work on a workstream (shows context & breadcrumbs)
  fix         Append a fix stage to a workstream
  approve     Approve or revoke plan approval (required before adding tasks)
  agents      Manage agent definitions (list, add, remove)
  assign      Assign agents to threads for batch execution
  status      Show workstream progress
  set-status  Set workstream status (pending, in_progress, completed, on_hold)
  update      Update a task's status
  complete    Mark a workstream as complete
  index       Update workstream metadata fields
  read        Read task details
  list        List tasks in a workstream
  add-task    Add a task to a workstream
  delete      Delete workstreams, stages, threads, or tasks
  files       List and index files in files/ directory
  tasks       Manage TASKS.md intermediate file (generate/serialize)
  consolidate Validate PLAN.md structure
  preview     Show PLAN.md structure
  metrics     Evaluate workstream metrics and task analysis
  report      Generate progress report
  changelog   Generate changelog from completed tasks
  export      Export workstream data (md, csv, json)

Options:
  --help, -h    Show this help message
  --version, -v Show version

Current Workstream:
  Set a current workstream to use as default for all commands:
    work current --set "001-my-feature"

  Then run commands without --stream:
    work status
    work list --tasks
    work update --task "1.1.1" --status completed

Examples:
  work create --name my-feature
  work current --set "001-my-feature"
  work status
  work list --tasks
  work update --task "1.1.1" --status completed
  work add-task --stage 1 --thread 1 --name "Task description"
  work files --save
  work metrics --blockers
  work report --output report.md
  work export --format csv

Run 'work <command> --help' for more information on a command.
`)
}

function printVersion(): void {
  console.log("work v0.1.0")
}

export function main(argv?: string[]): void {
  const args = argv ? argv.slice(2) : process.argv.slice(2)

  if (args.length === 0) {
    printHelp()
    process.exit(0)
  }

  const firstArg = args[0]!

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
    console.error("\nRun 'work --help' for usage information.")
    process.exit(1)
  }

  // Call the subcommand with adjusted argv
  // We pass [node, work-subcommand, ...rest] to match expected argv format
  const subcommand = firstArg as Subcommand
  const subcommandArgs = ["bun", `work-${subcommand}`, ...args.slice(1)]

  SUBCOMMANDS[subcommand](subcommandArgs)
}

// Run if called directly
if (import.meta.main) {
  main()
}
