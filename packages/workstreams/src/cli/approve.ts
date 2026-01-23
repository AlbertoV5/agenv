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
  revokeTasksApproval,
  getTasksApprovalStatus,
  checkTasksApprovalReady,
  getFullApprovalStatus,
} from "../lib/approval.ts"
import {
  loadGitHubConfig,
  createStageApprovalCommit,
} from "../lib/github/index.ts"
import { generateTasksMdFromPlan, parseTasksMd, detectNewStages, generateTasksMdForRevision } from "../lib/tasks-md.ts"
import { parseStreamDocument } from "../lib/stream-parser.ts"
import { existsSync, readFileSync, unlinkSync } from "fs"
import { join } from "path"
import { getWorkDir } from "../lib/repo.ts"
import { atomicWriteFile } from "../lib/index.ts"
import { addTasks, getTasks, parseTaskId } from "../lib/tasks.ts"
import { generateAllPrompts, type GeneratePromptsResult } from "../lib/prompts.ts"
import { canExecuteCommand, getRoleDenialMessage } from "../lib/roles.ts"

type ApproveTarget = "plan" | "tasks" | "revision"

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

Requires: USER role

Usage:
  work approve plan [--stream <id>] [--force]
  work approve tasks [--stream <id>]
  work approve revision [--stream <id>]
  work approve [--stream <id>]  # Show status of all approvals

Targets:
  plan      Approve the PLAN.md structure (blocks if open questions exist)
  tasks     Approve tasks (requires TASKS.md with tasks)
  revision  Approve revised PLAN.md with new stages (generates TASKS.md)

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

  Run 'work start' after all 3 approvals to create the GitHub branch and issues.

  Note: This command requires USER role to maintain human-in-the-loop control.
  Set WORKSTREAM_ROLE=USER environment variable to enable approval commands.

Examples:
  # Show approval status
  work approve

  # Approve plan
  work approve plan

  # Approve tasks
  work approve tasks


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
        console.log(JSON.stringify({
          streamId: stream.id,
          streamName: stream.name,
          ...fullStatus,
        }, null, 2))
      } else {
        console.log(`Approval Status for "${stream.name}" (${stream.id})\n`)
        console.log(`  ${formatApprovalIcon(fullStatus.plan)} Plan:    ${fullStatus.plan}`)
        console.log(`  ${formatApprovalIcon(fullStatus.tasks)} Tasks:   ${fullStatus.tasks}`)
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
    case "revision":
      handleRevisionApproval(repoRoot, stream, cliArgs)
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

    // Validate that all tasks in the stage are completed
    if (!cliArgs.force) {
      const allTasks = getTasks(repoRoot, stream.id)
      const stageTasks = allTasks.filter((t) => {
        try {
          const parsed = parseTaskId(t.id)
          return parsed.stage === stageNum
        } catch {
          return false
        }
      })

      const incompleteTasks = stageTasks.filter((t) => t.status !== "completed")

      // Group incomplete tasks by thread
      const incompleteThreads = new Map<string, { count: number, name: string }>()

      incompleteTasks.forEach(t => {
        try {
          const parsed = parseTaskId(t.id)
          // Format thread ID: stage.batch.thread
          const threadId = `${parsed.stage.toString().padStart(2, '0')}.${parsed.batch.toString().padStart(2, '0')}.${parsed.thread.toString().padStart(2, '0')}`

          if (!incompleteThreads.has(threadId)) {
            incompleteThreads.set(threadId, {
              count: 0,
              name: t.thread_name || `Thread ${parsed.thread}`
            })
          }

          const threadInfo = incompleteThreads.get(threadId)!
          threadInfo.count++
        } catch {
          // ignore parsing errors
        }
      })

      if (incompleteThreads.size > 0) {
        if (cliArgs.json) {
          console.log(JSON.stringify({
            action: "blocked",
            scope: "stage",
            stage: stageNum,
            streamId: stream.id,
            reason: "incomplete_tasks",
            incompleteThreadCount: incompleteThreads.size,
            incompleteTaskCount: incompleteTasks.length,
            incompleteThreads: Array.from(incompleteThreads.entries()).map(([id, info]) => ({
              id,
              name: info.name,
              incompleteTasks: info.count
            }))
          }, null, 2))
        } else {
          console.error(`Error: Cannot approve Stage ${stageNum} because ${incompleteThreads.size} thread(s) are not approved.`)
          console.log("\nIncomplete threads:")

          // Sort threads by ID
          const sortedThreads = Array.from(incompleteThreads.entries()).sort((a, b) => a[0].localeCompare(b[0]))

          for (const [threadId, info] of sortedThreads) {
            console.log(`  - ${threadId} (${info.name}): ${info.count} task(s) remaining`)
          }

          console.log("\nUse --force to approve anyway.")
        }
        process.exit(1)
      }
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

    // Auto-generate TASKS.md after successful plan approval
    const tasksMdResult = generateTasksMdAfterApproval(
      repoRoot,
      updatedStream.id,
      updatedStream.name
    )

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
            tasksMd: {
              generated: tasksMdResult.success,
              path: tasksMdResult.path,
              overwritten: tasksMdResult.overwritten,
              error: tasksMdResult.error,
            },
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

      // Report TASKS.md generation result
      if (tasksMdResult.success) {
        if (tasksMdResult.overwritten) {
          console.log(`  Warning: Overwrote existing TASKS.md`)
        }
        console.log(`  TASKS.md generated at ${tasksMdResult.path}`)
      } else {
        console.log(`  Warning: Failed to generate TASKS.md: ${tasksMdResult.error}`)
      }
    }
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }
}

/**
 * Result of serializing TASKS.md to tasks.json
 */
interface SerializeTasksResult {
  success: boolean
  taskCount: number
  tasksJsonPath?: string
  error?: string
}

/**
 * Serialize TASKS.md content to tasks.json
 * 
 * Parses TASKS.md, extracts tasks, and writes to tasks.json.
 * This is the critical artifact that must succeed for approval.
 * 
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @returns Result of the serialization
 */
function serializeTasksMdToJson(
  repoRoot: string,
  streamId: string
): SerializeTasksResult {
  try {
    const workDir = getWorkDir(repoRoot)
    const tasksMdPath = join(workDir, streamId, "TASKS.md")
    const tasksJsonPath = join(workDir, streamId, "tasks.json")

    if (!existsSync(tasksMdPath)) {
      return {
        success: false,
        taskCount: 0,
        error: `TASKS.md not found at ${tasksMdPath}`,
      }
    }

    const content = readFileSync(tasksMdPath, "utf-8")
    const { tasks, errors } = parseTasksMd(content, streamId)

    if (errors.length > 0) {
      return {
        success: false,
        taskCount: 0,
        error: `TASKS.md parsing errors: ${errors.join(", ")}`,
      }
    }

    if (tasks.length === 0) {
      return {
        success: false,
        taskCount: 0,
        error: "TASKS.md contains no valid tasks",
      }
    }

    // Write tasks to tasks.json
    addTasks(repoRoot, streamId, tasks)

    return {
      success: true,
      taskCount: tasks.length,
      tasksJsonPath,
    }
  } catch (e) {
    return {
      success: false,
      taskCount: 0,
      error: (e as Error).message,
    }
  }
}

/**
 * Delete TASKS.md after successful serialization
 * 
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @returns true if deleted, false otherwise
 */
function deleteTasksMd(repoRoot: string, streamId: string): boolean {
  try {
    const workDir = getWorkDir(repoRoot)
    const tasksMdPath = join(workDir, streamId, "TASKS.md")

    if (existsSync(tasksMdPath)) {
      unlinkSync(tasksMdPath)
      return true
    }
    return false
  } catch {
    return false
  }
}

function handleTasksApproval(
  repoRoot: string,
  stream: ReturnType<typeof getResolvedStream>,
  cliArgs: ApproveCliArgs
): void {
  const currentStatus = getTasksApprovalStatus(stream)

  // Handle revoke
  if (cliArgs.revoke) {
    if (currentStatus !== "approved") {
      console.error("Error: Tasks are not approved, nothing to revoke")
      process.exit(1)
    }

    try {
      const updatedStream = revokeTasksApproval(repoRoot, stream.id, cliArgs.reason)

      if (cliArgs.json) {
        console.log(JSON.stringify({
          action: "revoked",
          target: "tasks",
          streamId: updatedStream.id,
          streamName: updatedStream.name,
          reason: cliArgs.reason,
          approval: updatedStream.approval?.tasks,
        }, null, 2))
      } else {
        console.log(`Revoked tasks approval for workstream "${updatedStream.name}" (${updatedStream.id})`)
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

  if (currentStatus === "approved") {
    // Cleanup leftover TASKS.md if it exists
    const tasksMdDeleted = deleteTasksMd(repoRoot, stream.id)

    if (cliArgs.json) {
      console.log(JSON.stringify({
        action: "already_approved",
        target: "tasks",
        streamId: stream.id,
        streamName: stream.name,
        approval: stream.approval?.tasks,
        artifacts: {
          tasksMdDeleted,
        },
      }, null, 2))
    } else {
      console.log(`Tasks for workstream "${stream.name}" are already approved`)
      if (tasksMdDeleted) {
        console.log(`  Cleaned up leftover TASKS.md`)
      }
    }
    return
  }

  // Check readiness (validates TASKS.md exists and has valid tasks)
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

  // Step 1: Serialize TASKS.md to tasks.json
  // This is the critical step - if it fails, we don't approve
  const serializeResult = serializeTasksMdToJson(repoRoot, stream.id)
  if (!serializeResult.success) {
    if (cliArgs.json) {
      console.log(JSON.stringify({
        action: "blocked",
        target: "tasks",
        reason: "serialization_failed",
        error: serializeResult.error,
        streamId: stream.id,
        streamName: stream.name,
      }, null, 2))
    } else {
      console.error(`Error: Failed to serialize TASKS.md to tasks.json`)
      console.error(`  ${serializeResult.error}`)
    }
    process.exit(1)
  }

  // Step 2: Generate all prompts
  // This is non-critical - if it fails, we still approve but warn
  const promptsResult = generateAllPrompts(repoRoot, stream.id)
  const promptsWarning = !promptsResult.success

  try {
    // Step 3: Approve tasks (must happen before deleting TASKS.md since approveTasks validates it)
    const updatedStream = approveTasks(repoRoot, stream.id)

    // Step 4: Delete TASKS.md AFTER approval succeeds
    const tasksMdDeleted = deleteTasksMd(repoRoot, stream.id)

    if (cliArgs.json) {
      console.log(JSON.stringify({
        action: "approved",
        target: "tasks",
        streamId: updatedStream.id,
        streamName: updatedStream.name,
        taskCount: serializeResult.taskCount,
        approval: updatedStream.approval?.tasks,
        artifacts: {
          tasksJson: {
            generated: true,
            path: serializeResult.tasksJsonPath,
            taskCount: serializeResult.taskCount,
          },
          tasksMdDeleted,
        },
      }, null, 2))
    } else {
      console.log(`Tasks approved. tasks.json and prompts generated.`)
      console.log(`  Task count: ${serializeResult.taskCount}`)
      console.log(`  tasks.json: ${serializeResult.tasksJsonPath}`)
      console.log(`  Prompts: ${promptsResult.generatedFiles.length}/${promptsResult.totalThreads} generated`)
      if (tasksMdDeleted) {
        console.log(`  TASKS.md deleted`)
      }
      if (promptsWarning) {
        console.log(`  Warning: Some prompts failed to generate:`)
        for (const err of promptsResult.errors.slice(0, 3)) {
          console.log(`    - ${err}`)
        }
        if (promptsResult.errors.length > 3) {
          console.log(`    ... and ${promptsResult.errors.length - 3} more errors`)
        }
      }
    }
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }
}


/**
 * Handle revision approval workflow
 * Detects new stages and generates TASKS.md with placeholders
 */
function handleRevisionApproval(
  repoRoot: string,
  stream: ReturnType<typeof getResolvedStream>,
  cliArgs: ApproveCliArgs
): void {
  const workDir = getWorkDir(repoRoot)
  const streamDir = join(workDir, stream.id)
  const planMdPath = join(streamDir, "PLAN.md")
  const tasksMdPath = join(streamDir, "TASKS.md")

  // Step 1: Load PLAN.md and parse with parseStreamDocument
  if (!existsSync(planMdPath)) {
    console.error(`Error: PLAN.md not found at ${planMdPath}`)
    process.exit(1)
  }

  const planContent = readFileSync(planMdPath, "utf-8")
  const errors: any[] = []
  const doc = parseStreamDocument(planContent, errors)

  if (!doc) {
    console.error(`Error: Failed to parse PLAN.md: ${errors.map(e => e.message).join(", ")}`)
    process.exit(1)
  }

  // Step 2: Load existing tasks from tasks.json
  const existingTasks = getTasks(repoRoot, stream.id)

  // Step 3: Call detectNewStages() and error if no new stages found
  const newStageNumbers = detectNewStages(doc, existingTasks)

  if (newStageNumbers.length === 0) {
    if (cliArgs.json) {
      console.log(JSON.stringify({
        action: "blocked",
        target: "revision",
        reason: "no_new_stages",
        streamId: stream.id,
        streamName: stream.name,
      }, null, 2))
    } else {
      console.error("Error: No new stages to approve")
    }
    process.exit(1)
  }

  // Step 4: Validate new stages have no open questions
  // Reuse checkOpenQuestions logic filtered to new stages
  const questionsResult = checkOpenQuestions(repoRoot, stream.id)
  
  if (questionsResult.hasOpenQuestions && !cliArgs.force) {
    // Filter questions to only new stages
    const newStageSet = new Set(newStageNumbers)
    const newStageQuestions = questionsResult.questions.filter(q => newStageSet.has(q.stage))
    
    if (newStageQuestions.length > 0) {
      if (cliArgs.json) {
        console.log(JSON.stringify({
          action: "blocked",
          target: "revision",
          reason: "open_questions_in_new_stages",
          streamId: stream.id,
          streamName: stream.name,
          openQuestions: newStageQuestions,
          openCount: newStageQuestions.length,
        }, null, 2))
      } else {
        console.error("Error: Cannot approve revision with open questions in new stages")
        console.error("")
        console.error(`Found ${newStageQuestions.length} open question(s) in new stages:`)
        for (const q of newStageQuestions) {
          console.error(`  Stage ${q.stage} (${q.stageName}): ${q.question}`)
        }
        console.error("")
        console.error("Options:")
        console.error("  1. Resolve questions in PLAN.md (mark with [x])")
        console.error("  2. Use --force to approve anyway")
      }
      process.exit(1)
    }
  }

  // Step 5: Call generateTasksMdForRevision() and write TASKS.md
  const tasksMdContent = generateTasksMdForRevision(
    stream.name,
    existingTasks,
    doc,
    newStageNumbers
  )

  atomicWriteFile(tasksMdPath, tasksMdContent)

  // Step 6: Count new placeholders
  // Each new stage has batches, each batch has threads, each thread gets 1 placeholder task
  let newPlaceholderCount = 0
  const newStageSet = new Set(newStageNumbers)
  
  for (const stage of doc.stages) {
    if (newStageSet.has(stage.id)) {
      for (const batch of stage.batches) {
        newPlaceholderCount += batch.threads.length
      }
    }
  }

  // Step 7: Output summary
  if (cliArgs.json) {
    console.log(JSON.stringify({
      action: "generated",
      target: "revision",
      streamId: stream.id,
      streamName: stream.name,
      existingTaskCount: existingTasks.length,
      newStageCount: newStageNumbers.length,
      newPlaceholderCount,
      newStages: newStageNumbers,
      tasksMdPath,
    }, null, 2))
  } else {
    console.log(`Generated TASKS.md with ${existingTasks.length} existing tasks and ${newPlaceholderCount} new task placeholders`)
    console.log("")
    console.log(`New stages: ${newStageNumbers.map(n => `Stage ${n}`).join(", ")}`)
    console.log("")
    console.log("Edit TASKS.md to add task details and assign agents, then run 'work approve tasks'")
  }
}

/**
 * Result of TASKS.md generation attempt
 */
interface TasksMdGenerationResult {
  success: boolean
  path?: string
  overwritten?: boolean
  error?: string
}

/**
 * Generate TASKS.md file after plan approval
 * 
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param streamName - Workstream name for the file header
 * @returns Result of the generation attempt
 */
function generateTasksMdAfterApproval(
  repoRoot: string,
  streamId: string,
  streamName: string
): TasksMdGenerationResult {
  try {
    const workDir = getWorkDir(repoRoot)
    const streamDir = join(workDir, streamId)
    const tasksMdPath = join(streamDir, "TASKS.md")
    const planMdPath = join(streamDir, "PLAN.md")

    // Check if PLAN.md exists
    if (!existsSync(planMdPath)) {
      return {
        success: false,
        error: `PLAN.md not found at ${planMdPath}`,
      }
    }

    // Check if TASKS.md already exists
    const overwritten = existsSync(tasksMdPath)

    // Parse PLAN.md to get the stream document
    const planContent = readFileSync(planMdPath, "utf-8")
    const errors: any[] = []
    const doc = parseStreamDocument(planContent, errors)

    if (!doc) {
      return {
        success: false,
        error: `Failed to parse PLAN.md: ${errors.map(e => e.message).join(", ")}`,
      }
    }

    // Generate TASKS.md content from the plan structure
    const content = generateTasksMdFromPlan(streamName, doc)

    // Write the file
    atomicWriteFile(tasksMdPath, content)

    return {
      success: true,
      path: tasksMdPath,
      overwritten,
    }
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
    }
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
