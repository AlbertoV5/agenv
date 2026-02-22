/**
 * Workstream status and progress tracking
 *
 * Reads task status from tasks.json
 */

import type {
  StreamMetadata,
  StreamProgress,
  StreamStatus,
  StageStatus,
  ParsedTask,
  ApprovalStatus,
  Task,
  ThreadMetadata,
} from "./types.ts"
import { getTasks, getTaskCounts } from "./tasks.ts"
import { getThreads, getThreadCounts } from "./threads.ts"
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

  const threadCounts = getThreadCounts(repoRoot, stream.id)
  const counts = threadCounts.total > 0 ? threadCounts : getTaskCounts(repoRoot, stream.id)

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
function parseThreadLikeId(id: string): { stage: number; batch: number; thread: number } | null {
  const parts = id.split(".")
  if (parts.length < 3) return null
  const stage = Number.parseInt(parts[0]!, 10)
  const batch = Number.parseInt(parts[1]!, 10)
  const thread = Number.parseInt(parts[2]!, 10)
  if ([stage, batch, thread].some((part) => Number.isNaN(part))) return null
  return { stage, batch, thread }
}

function calculateStageStatusFromThreads(threads: Array<{ status?: string }>): StageStatus {
  if (threads.length === 0) return "pending"

  const done = threads.filter((t) => t.status === "completed" || t.status === "cancelled").length
  const inProgress = threads.filter((t) => t.status === "in_progress").length
  const blocked = threads.filter((t) => t.status === "blocked").length

  if (done === threads.length) return "complete"
  if (blocked > 0 && inProgress === 0 && done === 0) return "blocked"
  if (inProgress > 0 || done > 0) return "in_progress"
  return "pending"
}

function toParsedTaskFromThread(thread: ThreadMetadata): ParsedTask {
  const parsed = parseThreadLikeId(thread.threadId)
  return {
    id: thread.threadId,
    description: thread.threadName || thread.threadId,
    status: thread.status || "pending",
    stageNumber: parsed?.stage,
    taskGroupNumber: parsed?.thread ?? 1,
    subtaskNumber: 1,
    lineNumber: 0,
  }
}

function getLegacyTaskProgress(repoRoot: string, stream: StreamMetadata): StreamProgress {
  const tasks = getTasks(repoRoot, stream.id)
  const counts = getTaskCounts(repoRoot, stream.id)

  const stages: ParsedStage[] = []
  const stageNumbers = new Set<number>()
  for (const task of tasks) {
    const parsed = parseThreadLikeId(task.id)
    if (parsed) stageNumbers.add(parsed.stage)
  }

  for (const stageNum of Array.from(stageNumbers).sort((a, b) => a - b)) {
    const stagePrefix = `${stageNum.toString().padStart(2, "0")}.`
    const stageTasks = tasks.filter((t) => t.id.startsWith(stagePrefix))
    const stageName = stageTasks[0]?.stage_name || `Stage ${stageNum}`

    stages.push({
      number: stageNum,
      title: stageName,
      status: calculateStageStatusFromThreads(stageTasks),
      taskCount: stageTasks.length,
      completedCount: stageTasks.filter((t) => t.status === "completed" || t.status === "cancelled").length,
    })
  }

  const stageTasksMap = new Map<number, ParsedTask[]>()
  for (const task of tasks) {
    const parsed = parseThreadLikeId(task.id)
    if (!parsed) continue

    if (!stageTasksMap.has(parsed.stage)) {
      stageTasksMap.set(parsed.stage, [])
    }

    stageTasksMap.get(parsed.stage)!.push({
      id: task.id,
      description: task.name,
      status: task.status,
      stageNumber: parsed.stage,
      taskGroupNumber: parsed.thread,
      subtaskNumber: 1,
      lineNumber: 0,
    })
  }

  return {
    streamId: stream.id,
    streamName: stream.name,
    size: stream.size,
    stages: stages.map((s) => ({
      number: s.number,
      title: s.title,
      status: s.status,
      tasks: stageTasksMap.get(s.number) || [],
      file: "tasks.json",
    })),
    totalTasks: counts.total,
    completedTasks: counts.completed + counts.cancelled,
    inProgressTasks: counts.in_progress,
    blockedTasks: counts.blocked,
    pendingTasks: counts.pending,
    percentComplete:
      counts.total > 0 ? Math.round(((counts.completed + counts.cancelled) / counts.total) * 100) : 0,
  }
}

/**
 * Get progress for a single workstream
 */
export function getStreamProgress(
  repoRoot: string,
  stream: StreamMetadata
): StreamProgress {
  const threads = getThreads(repoRoot, stream.id)
  if (threads.length === 0) {
    return getLegacyTaskProgress(repoRoot, stream)
  }

  const counts = getThreadCounts(repoRoot, stream.id)

  // Build stage info from threads
  const stages: ParsedStage[] = []
  const stageNumbers = new Set<number>()

  // Extract stage numbers from thread IDs
  for (const thread of threads) {
    const parsed = parseThreadLikeId(thread.threadId)
    if (parsed) stageNumbers.add(parsed.stage)
  }

  // Build stage summaries
  for (const stageNum of Array.from(stageNumbers).sort((a, b) => a - b)) {
    const stagePrefix = `${stageNum.toString().padStart(2, "0")}.`
    const stageThreads = threads.filter((t) => t.threadId.startsWith(stagePrefix))
    const stageName = stageThreads[0]?.stageName || `Stage ${stageNum}`

    stages.push({
      number: stageNum,
      title: stageName,
      status: calculateStageStatusFromThreads(stageThreads),
      taskCount: stageThreads.length,
      completedCount: stageThreads.filter((t) => t.status === "completed" || t.status === "cancelled").length,
    })
  }

  // Map threads to ParsedTask compatibility format for each stage
  const stageTasksMap = new Map<number, ParsedTask[]>()
  for (const thread of threads) {
    const parsed = parseThreadLikeId(thread.threadId)
    if (!parsed) continue

    if (!stageTasksMap.has(parsed.stage)) {
      stageTasksMap.set(parsed.stage, [])
    }
    stageTasksMap.get(parsed.stage)!.push(toParsedTaskFromThread(thread))
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
      file: "threads.json",
    })),
    totalTasks: counts.total,
    completedTasks: counts.completed + counts.cancelled,
    inProgressTasks: counts.in_progress,
    blockedTasks: counts.blocked,
    pendingTasks: counts.pending,
    percentComplete:
      counts.total > 0 ? Math.round(((counts.completed + counts.cancelled) / counts.total) * 100) : 0,
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
 * Format session status as icon
 */
function formatSessionStatusIcon(status: string): string {
  switch (status) {
    case "completed":
      return "✓"
    case "failed":
      return "✗"
    case "running":
      return "▶"
    case "interrupted":
      return "⏸"
    default:
      return "?"
  }
}

/**
 * Format detailed session history for console output
 */
export function formatSessionHistory(
  repoRoot: string,
  streamId: string,
  progress: StreamProgress
): string {
  const threads = getThreads(repoRoot, streamId)
  if (threads.length === 0) {
    return "\nNo thread session history found.\n"
  }
  const lines: string[] = []
  const bar = "=".repeat(80)
  
  lines.push(`\n${bar}`)
  lines.push(`SESSION HISTORY: ${streamId}`)
  lines.push(bar)
  
  for (const stage of progress.stages) {
    const stagePrefix = `${stage.number.toString().padStart(2, "0")}.`
    const stageThreads = threads.filter((thread) => thread.threadId.startsWith(stagePrefix))

    for (const thread of stageThreads) {
      const allSessions = thread.sessions || []
      if (allSessions.length === 0) continue
      
      lines.push(`\n${stage.title} - ${thread.threadName || thread.threadId} (${thread.threadId})`)
      lines.push("-".repeat(80))
      
      // Show session details
      for (let i = 0; i < allSessions.length; i++) {
        const session = allSessions[i]!
        const statusIcon = formatSessionStatusIcon(session.status)
        const duration = session.completedAt 
          ? `${Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)}m`
          : "ongoing"
        
        const exitInfo = session.exitCode !== undefined ? ` (exit: ${session.exitCode})` : ""
        
        lines.push(
          `  ${i + 1}. ${statusIcon} ${session.status.padEnd(12)} | ${session.agentName.padEnd(20)} | ${session.model.padEnd(30)} | ${duration}${exitInfo}`
        )
        lines.push(`     Started: ${new Date(session.startedAt).toLocaleString()}`)
        if (session.completedAt) {
          lines.push(`     Ended:   ${new Date(session.completedAt).toLocaleString()}`)
        }
      }
    }
  }
  
  lines.push(`\n${bar}\n`)
  return lines.join("\n")
}

/**
 * Get thread information from tasks including session data
 */
export interface ThreadInfo {
  threadId: string
  threadName: string
  sessionCount: number
  lastSessionStatus?: string
  hasRunningSession: boolean
  isResumable: boolean
}

/**
 * Extract thread information grouped by thread ID
 */
export function getThreadInfo(tasks: ParsedTask[]): Map<string, ThreadInfo> {
  const threadsMap = new Map<string, ThreadInfo>()
  
  // Group by thread-like IDs (stage.batch.thread)
  for (const task of tasks) {
    const parsed = parseThreadLikeId(task.id)
    if (!parsed) continue
    const threadId = `${parsed.stage.toString().padStart(2, "0")}.${parsed.batch.toString().padStart(2, "0")}.${parsed.thread.toString().padStart(2, "0")}`
    
    if (!threadsMap.has(threadId)) {
      threadsMap.set(threadId, {
        threadId,
        threadName: task.description,
        sessionCount: 0,
        hasRunningSession: false,
        isResumable: false
      })
    }
  }
  
  return threadsMap
}

/**
 * Get thread information with session data from full Task objects
 */
export function getThreadInfoWithSessions(repoRoot: string, streamId: string, stageNumber: number): Map<string, ThreadInfo> {
  const threads = getThreads(repoRoot, streamId)
  const stagePrefix = `${stageNumber.toString().padStart(2, "0")}.`
  const stageThreads = threads.filter((t) => t.threadId.startsWith(stagePrefix))
  
  const threadsMap = new Map<string, ThreadInfo>()
  
  for (const thread of stageThreads) {
    const threadId = thread.threadId
    
    if (!threadsMap.has(threadId)) {
      threadsMap.set(threadId, {
        threadId,
        threadName: thread.threadName || threadId,
        sessionCount: 0,
        hasRunningSession: false,
        isResumable: false
      })
    }
    
    const threadInfo = threadsMap.get(threadId)!
    
    // Count sessions
    if (thread.sessions) {
      threadInfo.sessionCount += thread.sessions.length
      
      // Check for running sessions
      const hasRunning = thread.sessions.some(s => s.status === "running")
      if (hasRunning) {
        threadInfo.hasRunningSession = true
      }
      
      // Check last session status
      if (thread.sessions.length > 0) {
        const lastSession = thread.sessions[thread.sessions.length - 1]
        threadInfo.lastSessionStatus = lastSession!.status
        
        // Thread is resumable if last session was interrupted or failed and the thread is not complete
        if ((lastSession!.status === "interrupted" || lastSession!.status === "failed") && 
            thread.status !== "completed") {
          threadInfo.isResumable = true
        }
      }
    }
  }
  
  return threadsMap
}

/**
 * Format progress for console output
 */
export function formatProgress(
  progress: StreamProgress,
  streamStatus?: StreamStatus,
  stream?: StreamMetadata,
  repoRoot?: string
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

  // Stage details with thread-level session info
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

    // Get thread info with sessions if repoRoot is provided
    let sessionSummary = ""
    if (repoRoot && stream) {
      const threadInfoMap = getThreadInfoWithSessions(repoRoot, stream.id, stage.number)
      const threadInfoList = Array.from(threadInfoMap.values())
      
      const totalSessions = threadInfoList.reduce((sum, t) => sum + t.sessionCount, 0)
      const runningCount = threadInfoList.filter(t => t.hasRunningSession).length
      const resumableCount = threadInfoList.filter(t => t.isResumable).length
      
      if (totalSessions > 0) {
        const indicators: string[] = []
        indicators.push(`${totalSessions}s`)
        if (runningCount > 0) indicators.push(`${runningCount}▶`)
        if (resumableCount > 0) indicators.push(`${resumableCount}⟲`)
        sessionSummary = ` [${indicators.join(" ")}]`
      }
    }

    lines.push(
      `| ${statusIcon} Stage ${stageNumPadded}: ${stageTitle} (${completedCount}/${taskCount})${sessionSummary}${approvalDisplay}`.padEnd(
        51
      ) + "|"
    )
  }

  lines.push(`+${bar}+`)

  return lines.join("\n")
}
