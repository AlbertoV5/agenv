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
  approveStage,
  revokeStageApproval,
  getStageApprovalStatus,
} from "../lib/approval.ts"
import { isGitHubEnabled, loadGitHubConfig } from "../lib/github/config.ts"
import { createIssuesForWorkstream, type CreateIssuesResult } from "../lib/github/sync.ts"

interface ApproveCliArgs {
  repoRoot?: string
  streamId?: string
  revoke: boolean
  reason?: string
  force: boolean
  json: boolean
  stage?: number
}

function printHelp(): void {
  console.log(`
work approve - Approve or revoke workstream plan approval

Usage:
  work approve [--stream <id>] [--stage <n>] [--force]
  work approve --revoke [--stream <id>] [--stage <n>] [--reason "reason"]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --stage, -st     Stage number to approve/revoke (optional)
  --revoke         Revoke existing approval
  --reason         Reason for revoking approval
  --force, -f      Approve even with validation warnings
  --json, -j       Output as JSON
  --help, -h       Show this help message

Description:
  Plans must be approved before tasks can be created with 'work add-task'.
  This creates a human-in-the-loop checkpoint for AI-generated plans.

  Approvals can be at the Stream level (approving the PLAN.md) or at
  the Stage level (approving the outputs of a previous stage before continuing).

  Approval is blocked if there are open questions ([ ] checkboxes) in PLAN.md.
  Resolve questions by marking them with [x], or use --force to approve anyway.

  When approved, a hash of the PLAN.md is stored. If the PLAN.md is modified
  after approval, the approval is automatically revoked on the next
  'work add-task' attempt.

Examples:
  # Approve current workstream plan
  work approve

  # Approve specific stage
  work approve --stage 1

  # Approve specific workstream
  work approve --stream "001-my-feature"

  # Revoke approval (e.g., to make changes)
  work approve --revoke --reason "Need to revise stage 2"

  # Revoke stage approval
  work approve --revoke --stage 1 --reason "Bug found in stage 1 output"
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

/**
 * Handles GitHub issue creation after workstream approval.
 * This function is designed to fail gracefully - it never throws.
 * @param repoRoot Repository root path
 * @param streamId Workstream ID
 * @param json Whether to output JSON
 * @returns Created issues result or null if GitHub is not enabled
 */
async function handleGitHubIssueCreation(
  repoRoot: string,
  streamId: string,
  json: boolean
): Promise<CreateIssuesResult | null> {
  try {
    // Check if GitHub is enabled
    const enabled = await isGitHubEnabled(repoRoot)
    if (!enabled) {
      return null
    }

    // Check if auto_create_issues is enabled
    const config = await loadGitHubConfig(repoRoot)
    if (!config.auto_create_issues) {
      return null
    }

    // Create issues for the workstream
    const result = await createIssuesForWorkstream(repoRoot, streamId)

    // Log results (only in non-JSON mode)
    if (!json) {
      if (result.created.length > 0) {
        console.log("\nGitHub Issues Created:")
        for (const issue of result.created) {
          console.log(`  ${issue.threadName}: ${issue.issueUrl}`)
        }
      }

      if (result.errors.length > 0) {
        console.log("\nGitHub Issue Errors:")
        for (const err of result.errors) {
          console.log(`  ${err.threadName}: ${err.error}`)
        }
      }
    }

    return result
  } catch (error) {
    // Never fail the approval due to GitHub errors
    if (!json) {
      console.log(
        `\nWarning: Failed to create GitHub issues: ${(error as Error).message}`
      )
    }
    return null
  }
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

  // Handle Stage-level operations
  if (cliArgs.stage !== undefined) {
    const stageNum = cliArgs.stage

    if (cliArgs.revoke) {
      try {
        // Check if stage is approved
        const stageStatus = getStageApprovalStatus(stream, stageNum)
        if (stageStatus !== "approved") {
          console.error(`Error: Stage ${stageNum} is not approved, nothing to revoke`)
          process.exit(1)
        }

        const updatedStream = revokeStageApproval(repoRoot, stream.id, stageNum, cliArgs.reason)

        if (cliArgs.json) {
          console.log(JSON.stringify({
            action: "revoked",
            scope: "stage",
            stage: stageNum,
            streamId: updatedStream.id,
            reason: cliArgs.reason,
            approval: updatedStream.approval?.stages?.[stageNum]
          }, null, 2))
        } else {
          console.log(`Revoked approval for Stage ${stageNum} of workstream "${updatedStream.name}"`)
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

    // Handle Stage Approve
    const stageStatus = getStageApprovalStatus(stream, stageNum)
    if (stageStatus === "approved" && !cliArgs.force) {
      if (cliArgs.json) {
        console.log(JSON.stringify({
          action: "already_approved",
          scope: "stage",
          stage: stageNum,
          streamId: stream.id,
          approval: stream.approval?.stages?.[stageNum]
        }, null, 2))
      } else {
        console.log(`Stage ${stageNum} of workstream "${stream.name}" is already approved`)
      }
      return
    }

    try {
      const updatedStream = approveStage(repoRoot, stream.id, stageNum, "user")

      if (cliArgs.json) {
        console.log(JSON.stringify({
          action: "approved",
          scope: "stage",
          stage: stageNum,
          streamId: updatedStream.id,
          approval: updatedStream.approval?.stages?.[stageNum]
        }, null, 2))
      } else {
        console.log(`Approved Stage ${stageNum} of workstream "${updatedStream.name}"`)
      }
    } catch (e) {
      console.error((e as Error).message)
      process.exit(1)
    }
    return
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
      // In JSON mode, we need to wait for GitHub issues to be created
      // so we can include them in the output
      handleGitHubIssueCreation(repoRoot, stream.id, true)
        .then((githubResult) => {
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
                github: githubResult
                  ? {
                      issues_created: githubResult.created.length,
                      issues_skipped: githubResult.skipped.length,
                      issues_errors: githubResult.errors.length,
                      created: githubResult.created,
                    }
                  : null,
              },
              null,
              2,
            ),
          )
        })
        .catch(() => {
          // GitHub errors should not fail the approval
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
                github: null,
              },
              null,
              2,
            ),
          )
        })
    } else {
      console.log(
        `Approved workstream "${updatedStream.name}" (${updatedStream.id})`,
      )
      console.log(`  Status: ${formatApprovalStatus(updatedStream)}`)

      // Create GitHub issues after approval (fire and wait)
      handleGitHubIssueCreation(repoRoot, stream.id, false).catch(() => {
        // Errors are already handled inside the function
      })
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
