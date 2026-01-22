/**
 * Workstream status and progress tracking
 *
 * Reads task status from tasks.json
 */

import type {
  StreamMetadata,
  StreamProgress,
  StreamStatus,
  Task,
  StageStatus,
  ParsedTask,
  ApprovalStatus,
} from "./types.ts"
import { getTasks, getTaskCounts } from "./tasks.ts"
import { getStageApprovalStatus } from "./approval.ts"

// Re-export ParsedStage for backwards compatibility during migration
export interface ParsedStage {
  number: number
  title: string
  status: StageStatus
  taskCount: number
  completedCount: number
}

/**
 * Compute the stream status based on task states
 * - If stream has manually set status `on_hold`, use that
 * - If all tasks are completed (or cancelled), status is `completed`
 * - If any task is in_progress, status is `in_progress`
 * - Otherwise, status is `pending`
 */
export function computeStreamStatus(
  repoRoot: string,
  stream: StreamMetadata
): StreamStatus {
  // Manual status takes precedence (on_hold)
  if (stream.status === "on_hold") {
    return "on_hold"
  }

  const counts = getTaskCounts(repoRoot, stream.id)

  // No tasks means pending
  if (counts.total === 0) {
    return "pending"
  }

  // All tasks completed or cancelled
  const doneCount = counts.completed + counts.cancelled
  if (doneCount === counts.total) {
    return "completed"
  }

  // Any task in progress
  if (counts.in_progress > 0) {
    return "in_progress"
  }

  // Has completed tasks but not all done
  if (counts.completed > 0) {
    return "in_progress"
  }

  return "pending"
}

/**
 * Get the effective stream status (computed or from metadata)
 */
export function getStreamStatus(repoRoot: string, stream: StreamMetadata): StreamStatus {
  return computeStreamStatus(repoRoot, stream)
}

/**
 * Calculate stage status from task statuses
 */
function calculateStageStatus(tasks: Task[]): StageStatus {
  if (tasks.length === 0) return "pending"

  const completed = tasks.filter((t) => t.status === "completed").length
  const inProgress = tasks.filter((t) => t.status === "in_progress").length
  const blocked = tasks.filter((t) => t.status === "blocked").length

  if (completed === tasks.length) return "complete"
  if (blocked > 0 && inProgress === 0 && completed === 0) return "blocked"
  if (inProgress > 0 || completed > 0) return "in_progress"
  return "pending"
}

/**
 * Get progress for a single workstream
 */
export function getStreamProgress(
  repoRoot: string,
  stream: StreamMetadata
): StreamProgress {
  const tasks = getTasks(repoRoot, stream.id)
  const counts = getTaskCounts(repoRoot, stream.id)

  // Build stage info from tasks
  const stages: ParsedStage[] = []
  const stageNumbers = new Set<number>()

  // Extract stage numbers from task IDs
  for (const task of tasks) {
    const stageNum = parseInt(task.id.split(".")[0]!, 10)
    if (!isNaN(stageNum)) {
      stageNumbers.add(stageNum)
    }
  }

  // Build stage summaries
  for (const stageNum of Array.from(stageNumbers).sort((a, b) => a - b)) {
    const stagePrefix = `${stageNum.toString().padStart(2, "0")}.`
    const stageTasks = tasks.filter((t) => t.id.startsWith(stagePrefix))
    const stageName = stageTasks[0]?.stage_name || `Stage ${stageNum}`

    stages.push({
      number: stageNum,
      title: stageName,
      status: calculateStageStatus(stageTasks),
      taskCount: stageTasks.length,
      completedCount: stageTasks.filter((t) => t.status === "completed").length,
    })
  }

  // Map tasks to ParsedTask format for each stage
  const stageTasksMap = new Map<number, ParsedTask[]>()
  for (const task of tasks) {
    const parts = task.id.split(".")
    const stageNum = parseInt(parts[0]!, 10)
    const threadNum = parseInt(parts[1] || "1", 10)
    const taskNum = parseInt(parts[2] || "1", 10)

    if (!stageTasksMap.has(stageNum)) {
      stageTasksMap.set(stageNum, [])
    }
    stageTasksMap.get(stageNum)!.push({
      id: task.id,
      description: task.name,
      status: task.status,
      stageNumber: stageNum,
      taskGroupNumber: threadNum,
      subtaskNumber: taskNum,
      lineNumber: 0, // Not applicable for JSON-based tasks
    })
  }

  return {
    streamId: stream.id,
    streamName: stream.name,
    size: stream.size, // Deprecated but kept for compatibility
    stages: stages.map((s) => ({
      number: s.number,
      title: s.title,
      status: s.status,
      tasks: stageTasksMap.get(s.number) || [],
      file: "tasks.json",
    })),
    totalTasks: counts.total,
    completedTasks: counts.completed,
    inProgressTasks: counts.in_progress,
    blockedTasks: counts.blocked,
    pendingTasks: counts.pending,
    percentComplete:
      counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
  }
}

/**
 * Format stream status as a display string with icon
 */
export function formatStreamStatusIcon(status: StreamStatus): string {
  switch (status) {
    case "pending":
      return "[ ] pending"
    case "in_progress":
      return "[~] in progress"
    case "completed":
      return "[x] completed"
    case "on_hold":
      return "[!] on hold"
  }
}

/**
 * Format approval status as icon + label
 */
function formatApprovalIcon(status: ApprovalStatus): string {
  switch (status) {
    case "approved":
      return "✓"
    case "revoked":
      return "⚠"
    case "draft":
    default:
      return "○"
  }
}

/**
 * Format progress for console output
 */
export function formatProgress(
  progress: StreamProgress,
  streamStatus?: StreamStatus,
  stream?: StreamMetadata
): string {
  const lines: string[] = []
  const bar = "-".repeat(50)

  lines.push(`+${bar}+`)
  lines.push(`| ${progress.streamId.padEnd(48)} |`)

  // Show stream status if provided
  if (streamStatus) {
    lines.push(`| Status: ${formatStreamStatusIcon(streamStatus)}`.padEnd(51) + "|")
  }

  lines.push(`+${bar}+`)

  // Progress bar
  const barWidth = 30
  const filled = Math.round((progress.percentComplete / 100) * barWidth)
  const progressBar = "#".repeat(filled) + ".".repeat(barWidth - filled)
  lines.push(
    `| Progress: [${progressBar}] ${progress.percentComplete}%`.padEnd(51) +
    "|"
  )

  // Task counts
  lines.push(
    `| Tasks: ${progress.completedTasks}/${progress.totalTasks} complete, ${progress.inProgressTasks} in-progress, ${progress.blockedTasks} blocked`.padEnd(
      51
    ) + "|"
  )

  lines.push(`+${bar}+`)

  // Stage details
  for (const stage of progress.stages) {
    const statusIcon =
      stage.status === "complete"
        ? "[x]"
        : stage.status === "in_progress"
          ? "[~]"
          : stage.status === "blocked"
            ? "[!]"
            : "[ ]"

    const stageNumPadded = stage.number.toString().padStart(2, "0")
    const stageTitle = stage.title || `Stage ${stageNumPadded}`
    const taskCount = stage.tasks?.length || 0
    const completedCount = stage.tasks?.filter(
      (t) => t.status === "completed"
    ).length || 0

    // Get stage approval status if stream is available
    // Stage approval is independent - it's for approving completed work before moving to next stage
    let approvalDisplay = ""
    if (stream) {
      const stageApproval = getStageApprovalStatus(stream, stage.number)
      approvalDisplay = ` ${formatApprovalIcon(stageApproval)}`
    }

    lines.push(
      `| ${statusIcon} Stage ${stageNumPadded}: ${stageTitle} (${completedCount}/${taskCount})${approvalDisplay}`.padEnd(
        51
      ) + "|"
    )
  }

  lines.push(`+${bar}+`)

  return lines.join("\n")
}

// ============================================
// DEPRECATED EXPORTS (kept for backwards compatibility)
// These will be removed in Stage 5
// ============================================

/**
 * @deprecated Use getTasks from tasks.ts instead
 */
export function parseTasksFromContent(): never {
  throw new Error("parseTasksFromContent is deprecated. Use getTasks from tasks.ts")
}

/**
 * @deprecated Workstreams no longer use size-based parsing
 */
export function parseShortPlan(): never {
  throw new Error("parseShortPlan is deprecated. Use getTasks from tasks.ts")
}

/**
 * @deprecated Workstreams no longer use size-based parsing
 */
export function parseMediumPlan(): never {
  throw new Error("parseMediumPlan is deprecated. Use getTasks from tasks.ts")
}

/**
 * @deprecated Workstreams no longer use size-based parsing
 */
export function parseLongPlan(): never {
  throw new Error("parseLongPlan is deprecated. Use getTasks from tasks.ts")
}
