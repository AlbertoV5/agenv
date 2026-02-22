/**
 * CLI: Approve Workstream Gates
 *
 * Approve or revoke workstream approvals for plan and revision.
 * Plan approval is the required gate before running `work start`.
 */

import { getRepoRoot } from "../../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../../lib/index.ts"
import { getFullApprovalStatus } from "../../lib/approval.ts"
import { canExecuteCommand, getRoleDenialMessage } from "../../lib/roles.ts"

import type { ApproveTarget, ApproveCliArgs } from "./utils.ts"
import { formatApprovalIcon } from "./utils.ts"
import { handlePlanApproval } from "./plan.ts"
import { handleTasksApproval } from "./tasks.ts"
import { handleRevisionApproval } from "./revision.ts"

function printHelp(): void {
  console.log(`
work approve - Human-in-the-loop approval gates for workstreams

Requires: USER role

Usage:
  work approve plan [--stream <id>] [--force]
  work approve tasks [--stream <id>]  # deprecated compatibility shim
  work approve revision [--stream <id>]
  work approve [--stream <id>]  # Show status of all approvals

Targets:
  plan      Approve PLAN.md and sync thread metadata into threads.json
  tasks     Deprecated compatibility shim (migrates legacy tasks.json)
  revision  Approve revised PLAN.md with new stages

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --stage, -st     Stage number to approve/revoke (only for plan approval)
  --revoke         Revoke existing approval
  --reason         Reason for revoking approval
  --force, -f      Approve even with validation warnings

  --json, -j       Output as JSON
  --help, -h       Show this help message

Description:
  Workstreams require plan approval before starting:
  1. Plan approval - validates PLAN.md structure, no open questions
  2. Plan approval also syncs threads.json from PLAN.md

  Legacy note: 'work approve tasks' is deprecated and only kept to migrate
  old tasks.json data into threads.json.

  Run 'work start' after plan approval to create the GitHub branch and issues.

  Note: This command requires USER role to maintain human-in-the-loop control.
  Set WORKSTREAM_ROLE=USER environment variable to enable approval commands.

Examples:
  # Show approval status
  work approve

  # Approve plan
  work approve plan


  # Revoke plan approval
  work approve plan --revoke --reason "Need to revise stage 2"

  # Approve specific stage
  work approve stage 1
`)
}

function parseCliArgs(argv: string[]): ApproveCliArgs | null {
  const args = argv.slice(2)
  const parsed: ApproveCliArgs = { revoke: false, force: false, json: false }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    // Check for target subcommand
    if (arg === "plan" || arg === "tasks" || arg === "revision") {
      parsed.target = arg as ApproveTarget
      continue
    }

    if (arg === "stage") {
      parsed.target = "plan"
      if (!next) {
        console.error("Error: stage requires a stage number")
        return null
      }
      parsed.stage = parseInt(next, 10)
      if (isNaN(parsed.stage)) {
        console.error("Error: stage must be a number")
        return null
      }
      i++
      continue
    }

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

      case "--revoke":
        parsed.revoke = true
        break

      case "--reason":
        if (!next) {
          console.error("Error: --reason requires a value")
          return null
        }
        parsed.reason = next
        i++
        break

      case "--force":
      case "-f":
        parsed.force = true
        break

      case "--json":
      case "-j":
        parsed.json = true
        break

      case "--stage":
      case "-st":
        if (!next) {
          console.error("Error: --stage requires a value")
          return null
        }
        parsed.stage = parseInt(next, 10)
        if (isNaN(parsed.stage)) {
          console.error("Error: --stage must be a number")
          return null
        }
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

export async function main(argv: string[] = process.argv): Promise<void> {
  const cliArgs = parseCliArgs(argv)
  if (!cliArgs) {
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  // Role-based access check
  if (!canExecuteCommand("approve")) {
    console.error(getRoleDenialMessage("approve"))
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

  // Load index and find workstream (uses current if not specified)
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

  // No target specified = show status (unless revoking)
  if (!cliArgs.target) {
    if (cliArgs.revoke) {
      cliArgs.target = "plan"
      // proceed to switch
    } else {
      const fullStatus = getFullApprovalStatus(stream)

      if (cliArgs.json) {
        console.log(
          JSON.stringify(
            {
              streamId: stream.id,
              streamName: stream.name,
              ...fullStatus,
            },
            null,
            2
          )
        )
      } else {
        console.log(`Approval Status for "${stream.name}" (${stream.id})\n`)
        console.log(
          `  ${formatApprovalIcon(fullStatus.plan)} Plan:    ${fullStatus.plan}`
        )
        console.log(
          `  ${formatApprovalIcon(fullStatus.tasks)} Tasks:   ${fullStatus.tasks} (deprecated gate)`
        )
        console.log("")
        if (fullStatus.fullyApproved) {
          console.log("All approvals complete. Run 'work start' to begin.")
        } else {
          console.log("Pending approvals. Canonical flow: work validate plan -> work approve plan -> work assign --thread ...")
        }
      }
      return
    }
  }

  // Handle specific target
  switch (cliArgs.target) {
    case "plan":
      await handlePlanApproval(repoRoot, stream, cliArgs)
      break
    case "tasks":
      handleTasksApproval(repoRoot, stream, cliArgs)
      break
    case "revision":
      handleRevisionApproval(repoRoot, stream, cliArgs)
      break
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
