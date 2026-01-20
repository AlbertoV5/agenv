/**
 * CLI: Approve Workstream Plan
 *
 * Approve or revoke a workstream plan approval.
 * Plans must be approved before tasks can be created.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import {
  approveStream,
  revokeApproval,
  getApprovalStatus,
  formatApprovalStatus,
  checkOpenQuestions,
} from "../lib/approval.ts"

interface ApproveCliArgs {
  repoRoot?: string
  streamId?: string
  revoke: boolean
  reason?: string
  force: boolean
  json: boolean
}

function printHelp(): void {
  console.log(`
work approve - Approve or revoke workstream plan approval

Usage:
  work approve [--stream <id>] [--force]
  work approve --revoke [--stream <id>] [--reason "reason"]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --revoke         Revoke existing approval
  --reason         Reason for revoking approval
  --force, -f      Approve even with validation warnings
  --json, -j       Output as JSON
  --help, -h       Show this help message

Description:
  Plans must be approved before tasks can be created with 'work add-task'.
  This creates a human-in-the-loop checkpoint for AI-generated plans.

  Approval is blocked if there are open questions ([ ] checkboxes) in PLAN.md.
  Resolve questions by marking them with [x], or use --force to approve anyway.

  When approved, a hash of the PLAN.md is stored. If the PLAN.md is modified
  after approval, the approval is automatically revoked on the next
  'work add-task' attempt.

Examples:
  # Approve current workstream
  work approve

  # Approve specific workstream
  work approve --stream "001-my-feature"

  # Revoke approval (e.g., to make changes)
  work approve --revoke --reason "Need to revise stage 2"
`)
}

function parseCliArgs(argv: string[]): ApproveCliArgs | null {
  const args = argv.slice(2)
  const parsed: ApproveCliArgs = { revoke: false, force: false, json: false }

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

  // Handle revoke
  if (cliArgs.revoke) {
    const currentStatus = getApprovalStatus(stream)
    if (currentStatus === "draft") {
      console.error("Error: Plan is not approved, nothing to revoke")
      process.exit(1)
    }

    try {
      const updatedStream = revokeApproval(repoRoot, stream.id, cliArgs.reason)

      if (cliArgs.json) {
        console.log(
          JSON.stringify(
            {
              action: "revoked",
              streamId: updatedStream.id,
              streamName: updatedStream.name,
              reason: cliArgs.reason,
              approval: updatedStream.approval,
            },
            null,
            2,
          ),
        )
      } else {
        console.log(
          `Revoked approval for workstream "${updatedStream.name}" (${updatedStream.id})`,
        )
        if (cliArgs.reason) {
          console.log(`  Reason: ${cliArgs.reason}`)
        }
      }
    } catch (e) {
      console.error((e as Error).message)
      process.exit(1)
    }

    return
  }

  // Handle approve
  const currentStatus = getApprovalStatus(stream)
  if (currentStatus === "approved") {
    if (cliArgs.json) {
      console.log(
        JSON.stringify(
          {
            action: "already_approved",
            streamId: stream.id,
            streamName: stream.name,
            approval: stream.approval,
          },
          null,
          2,
        ),
      )
    } else {
      console.log(`Workstream "${stream.name}" is already approved`)
      console.log(`  Status: ${formatApprovalStatus(stream)}`)
    }
    return
  }

  // Check for open questions
  const questionsResult = checkOpenQuestions(repoRoot, stream.id)

  if (questionsResult.hasOpenQuestions && !cliArgs.force) {
    if (cliArgs.json) {
      console.log(
        JSON.stringify(
          {
            action: "blocked",
            reason: "open_questions",
            streamId: stream.id,
            streamName: stream.name,
            openQuestions: questionsResult.questions,
            openCount: questionsResult.openCount,
            resolvedCount: questionsResult.resolvedCount,
          },
          null,
          2,
        ),
      )
    } else {
      console.error("Error: Cannot approve plan with open questions")
      console.error("")
      console.error(`Found ${questionsResult.openCount} open question(s):`)
      for (const q of questionsResult.questions) {
        console.error(`  Stage ${q.stage} (${q.stageName}): ${q.question}`)
      }
      console.error("")
      console.error("Options:")
      console.error("  1. Resolve questions in PLAN.md (mark with [x])")
      console.error("  2. Use --force to approve anyway")
    }
    process.exit(1)
  }

  if (questionsResult.hasOpenQuestions && cliArgs.force) {
    console.log(
      `Warning: Approving with ${questionsResult.openCount} open question(s)`,
    )
  }

  try {
    const updatedStream = approveStream(repoRoot, stream.id, "user")

    if (cliArgs.json) {
      console.log(
        JSON.stringify(
          {
            action: "approved",
            streamId: updatedStream.id,
            streamName: updatedStream.name,
            approval: updatedStream.approval,
            openQuestions: questionsResult.hasOpenQuestions
              ? questionsResult.openCount
              : 0,
            forcedApproval: questionsResult.hasOpenQuestions && cliArgs.force,
          },
          null,
          2,
        ),
      )
    } else {
      console.log(
        `Approved workstream "${updatedStream.name}" (${updatedStream.id})`,
      )
      console.log(`  Status: ${formatApprovalStatus(updatedStream)}`)
    }
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
