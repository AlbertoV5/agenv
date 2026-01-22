/**
 * CLI: Approve Workstream Gates
 *
 * Approve or revoke workstream approvals for plan, tasks, or prompts.
 * All 3 must be approved before running `work start`.
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
  approveTasks,
  approvePrompts,
  getTasksApprovalStatus,
  getPromptsApprovalStatus,
  checkTasksApprovalReady,
  checkPromptsApprovalReady,
  getFullApprovalStatus,
} from "../lib/approval.ts"
import {
  loadGitHubConfig,
  createStageApprovalCommit,
} from "../lib/github/index.ts"

type ApproveTarget = "plan" | "tasks" | "prompts"

interface ApproveCliArgs {
  repoRoot?: string
  streamId?: string
  target?: ApproveTarget
  revoke: boolean
  reason?: string
  force: boolean
  json: boolean
  stage?: number
}

function printHelp(): void {
  console.log(`
work approve - Human-in-the-loop approval gates for workstreams

Usage:
  work approve plan [--stream <id>] [--force]
  work approve tasks [--stream <id>]
  work approve prompts [--stream <id>]
  work approve [--stream <id>]  # Show status of all approvals

Targets:
  plan      Approve the PLAN.md structure (blocks if open questions exist)
  tasks     Approve tasks (requires TASKS.md with tasks)
  prompts   Approve prompts (requires all tasks have agents + prompt files)

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
  Workstreams require 3 approvals before starting:
  1. Plan approval - validates PLAN.md structure, no open questions
  2. Tasks approval - ensures tasks.json exists with tasks
  3. Prompts approval - ensures all tasks have agents + prompt files exist

  Run 'work start' after all 3 approvals to create the GitHub branch and issues.

Examples:
  # Show approval status
  work approve

  # Approve plan
  work approve plan

  # Approve tasks
  work approve tasks

  # Approve prompts  
  work approve prompts

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
    if (arg === "plan" || arg === "tasks" || arg === "prompts") {
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

function formatApprovalIcon(status: string): string {
  switch (status) {
    case "approved":
      return "✅"
    case "revoked":
      return "⚠️"
    default:
      return "📝"
  }
}

export async function main(argv: string[] = process.argv): Promise<void> {
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

  // No target specified = show status (unless revoking)
  if (!cliArgs.target) {
    if (cliArgs.revoke) {
      cliArgs.target = "plan"
      // proceed to switch
    } else {
      const fullStatus = getFullApprovalStatus(stream)

      if (cliArgs.json) {
        console.log(JSON.stringify({
          streamId: stream.id,
          streamName: stream.name,
          ...fullStatus,
        }, null, 2))
      } else {
        console.log(`Approval Status for "${stream.name}" (${stream.id})\n`)
        console.log(`  ${formatApprovalIcon(fullStatus.plan)} Plan:    ${fullStatus.plan}`)
        console.log(`  ${formatApprovalIcon(fullStatus.tasks)} Tasks:   ${fullStatus.tasks}`)
        console.log(`  ${formatApprovalIcon(fullStatus.prompts)} Prompts: ${fullStatus.prompts}`)
        console.log("")
        if (fullStatus.fullyApproved) {
          console.log("All approvals complete. Run 'work start' to begin.")
        } else {
          console.log("Pending approvals. Run 'work approve <target>' to approve.")
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
    case "prompts":
      handlePromptsApproval(repoRoot, stream, cliArgs)
      break
  }
}

async function handlePlanApproval(
  repoRoot: string,
  stream: ReturnType<typeof getResolvedStream>,
  cliArgs: ApproveCliArgs
): Promise<void> {
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

      // Auto-commit on stage approval if enabled
      let commitResult: { success: boolean; commitSha?: string; skipped?: boolean; error?: string } | undefined
      const githubConfig = await loadGitHubConfig(repoRoot)
      if (githubConfig.enabled && githubConfig.auto_commit_on_approval) {
        const stageName = `Stage ${stageNum}` // Use generic name; could be enhanced to parse from PLAN.md
        commitResult = createStageApprovalCommit(repoRoot, updatedStream, stageNum, stageName)
      }

      if (cliArgs.json) {
        console.log(JSON.stringify({
          action: "approved",
          scope: "stage",
          stage: stageNum,
          streamId: updatedStream.id,
          approval: updatedStream.approval?.stages?.[stageNum],
          commit: commitResult ? {
            created: commitResult.success && !commitResult.skipped,
            sha: commitResult.commitSha,
            skipped: commitResult.skipped,
            error: commitResult.error,
          } : undefined,
        }, null, 2))
      } else {
        console.log(`Approved Stage ${stageNum} of workstream "${updatedStream.name}"`)
        if (commitResult?.success && commitResult.commitSha) {
          console.log(`  Committed: ${commitResult.commitSha.substring(0, 7)}`)
        } else if (commitResult?.skipped) {
          console.log(`  No changes to commit`)
        } else if (commitResult?.error) {
          console.log(`  Commit skipped: ${commitResult.error}`)
        }
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
              target: "plan",
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
          `Revoked plan approval for workstream "${updatedStream.name}" (${updatedStream.id})`,
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
            target: "plan",
            streamId: stream.id,
            streamName: stream.name,
            approval: stream.approval,
          },
          null,
          2,
        ),
      )
    } else {
      console.log(`Plan for workstream "${stream.name}" is already approved`)
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
            target: "plan",
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
            target: "plan",
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
        `Approved plan for workstream "${updatedStream.name}" (${updatedStream.id})`,
      )
      console.log(`  Status: ${formatApprovalStatus(updatedStream)}`)
    }
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }
}

function handleTasksApproval(
  repoRoot: string,
  stream: ReturnType<typeof getResolvedStream>,
  cliArgs: ApproveCliArgs
): void {
  const currentStatus = getTasksApprovalStatus(stream)

  // Handle revoke (for future use, not commonly needed for tasks)
  if (cliArgs.revoke) {
    console.error("Error: Tasks approval revocation is not supported")
    process.exit(1)
  }

  if (currentStatus === "approved") {
    if (cliArgs.json) {
      console.log(JSON.stringify({
        action: "already_approved",
        target: "tasks",
        streamId: stream.id,
        streamName: stream.name,
        approval: stream.approval?.tasks,
      }, null, 2))
    } else {
      console.log(`Tasks for workstream "${stream.name}" are already approved`)
    }
    return
  }

  // Check readiness
  const readyCheck = checkTasksApprovalReady(repoRoot, stream.id)
  if (!readyCheck.ready) {
    if (cliArgs.json) {
      console.log(JSON.stringify({
        action: "blocked",
        target: "tasks",
        reason: readyCheck.reason,
        streamId: stream.id,
        streamName: stream.name,
      }, null, 2))
    } else {
      console.error(`Error: ${readyCheck.reason}`)
    }
    process.exit(1)
  }

  try {
    const updatedStream = approveTasks(repoRoot, stream.id)

    if (cliArgs.json) {
      console.log(JSON.stringify({
        action: "approved",
        target: "tasks",
        streamId: updatedStream.id,
        streamName: updatedStream.name,
        taskCount: readyCheck.taskCount,
        approval: updatedStream.approval?.tasks,
      }, null, 2))
    } else {
      console.log(`Approved tasks for workstream "${updatedStream.name}"`)
      console.log(`  Task count: ${readyCheck.taskCount}`)
    }
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }
}

function handlePromptsApproval(
  repoRoot: string,
  stream: ReturnType<typeof getResolvedStream>,
  cliArgs: ApproveCliArgs
): void {
  const currentStatus = getPromptsApprovalStatus(stream)

  // Handle revoke (for future use, not commonly needed for prompts)
  if (cliArgs.revoke) {
    console.error("Error: Prompts approval revocation is not supported")
    process.exit(1)
  }

  if (currentStatus === "approved") {
    if (cliArgs.json) {
      console.log(JSON.stringify({
        action: "already_approved",
        target: "prompts",
        streamId: stream.id,
        streamName: stream.name,
        approval: stream.approval?.prompts,
      }, null, 2))
    } else {
      console.log(`Prompts for workstream "${stream.name}" are already approved`)
    }
    return
  }

  // Check readiness
  const readyCheck = checkPromptsApprovalReady(repoRoot, stream.id)
  if (!readyCheck.ready) {
    if (cliArgs.json) {
      console.log(JSON.stringify({
        action: "blocked",
        target: "prompts",
        reason: readyCheck.reason,
        streamId: stream.id,
        streamName: stream.name,
        missingAgents: readyCheck.missingAgents,
        missingPrompts: readyCheck.missingPrompts,
      }, null, 2))
    } else {
      console.error(`Error: ${readyCheck.reason}`)
      if (readyCheck.missingAgents.length > 0) {
        console.error(`\nMissing agents for tasks:`)
        for (const taskId of readyCheck.missingAgents.slice(0, 5)) {
          console.error(`  - ${taskId}`)
        }
        if (readyCheck.missingAgents.length > 5) {
          console.error(`  ... and ${readyCheck.missingAgents.length - 5} more`)
        }
      }
    }
    process.exit(1)
  }

  try {
    const updatedStream = approvePrompts(repoRoot, stream.id)

    if (cliArgs.json) {
      console.log(JSON.stringify({
        action: "approved",
        target: "prompts",
        streamId: updatedStream.id,
        streamName: updatedStream.name,
        promptCount: readyCheck.promptCount,
        taskCount: readyCheck.taskCount,
        approval: updatedStream.approval?.prompts,
      }, null, 2))
    } else {
      console.log(`Approved prompts for workstream "${updatedStream.name}"`)
      console.log(`  Prompt files: ${readyCheck.promptCount}`)
      console.log(`  Task count: ${readyCheck.taskCount}`)
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
