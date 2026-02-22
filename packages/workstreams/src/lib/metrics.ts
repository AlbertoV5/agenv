/**
 * Metrics and evaluation functions for workstreams
 *
 * Provides functions to calculate metrics, filter tasks, and analyze blockers.
 */

import type {
  Task,
  TaskStatus,
  ThreadStatus,
  EvaluationMetrics,
  BlockerAnalysis,
  FilterResult,
  StreamMetadata,
} from "./types.ts"
import { getTasks, parseTaskId } from "./tasks.ts"
import { getThreads } from "./threads.ts"
import { loadIndex, resolveStreamId, findStream } from "./index.ts"

/**
 * Evaluate a single workstream and return metrics
 */
export function evaluateStream(
  repoRoot: string,
  streamId: string
): EvaluationMetrics {
  const index = loadIndex(repoRoot)
  const stream = findStream(index, streamId)

  if (!stream) {
    throw new Error(`Workstream "${streamId}" not found`)
  }

  const tasks = getTasks(repoRoot, stream.id)
  const threads = getThreads(repoRoot, stream.id)

  const statusCounts: Record<TaskStatus, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    blocked: 0,
    cancelled: 0,
  }

  for (const task of tasks) {
    statusCounts[task.status]++
  }

  const threadStatusCounts: Record<ThreadStatus, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    blocked: 0,
    cancelled: 0,
  }
  for (const thread of threads) {
    threadStatusCounts[thread.status || "pending"]++
  }

  const total = threads.length > 0 ? threads.length : tasks.length
  const effectiveCounts = threads.length > 0 ? threadStatusCounts : statusCounts
  const completionRate = total > 0 ? (statusCounts.completed / total) * 100 : 0
  const blockedRate = total > 0 ? (effectiveCounts.blocked / total) * 100 : 0
  const cancelledRate = total > 0 ? (effectiveCounts.cancelled / total) * 100 : 0

  return {
    streamId: stream.id,
    streamName: stream.name,
    totalThreads: total,
    threadStatusCounts: effectiveCounts,
    totalTasks: total,
    statusCounts: effectiveCounts,
    completionRate,
    blockedRate,
    cancelledRate,
    inProgressCount: effectiveCounts.in_progress,
  }
}

/**
 * Evaluate all workstreams and return aggregated metrics
 */
export function evaluateAllStreams(repoRoot: string): EvaluationMetrics[] {
  const index = loadIndex(repoRoot)
  return index.streams.map((stream) => evaluateStream(repoRoot, stream.id))
}

/**
 * Filter tasks by name pattern
 */
export function filterTasks(
  tasks: Task[],
  pattern: string,
  isRegex: boolean = false
): FilterResult {
  let matchingTasks: Task[]

  if (isRegex) {
    const regex = new RegExp(pattern, "i")
    matchingTasks = tasks.filter((t) => regex.test(t.name))
  } else {
    const lowerPattern = pattern.toLowerCase()
    matchingTasks = tasks.filter((t) =>
      t.name.toLowerCase().includes(lowerPattern)
    )
  }

  return {
    matchingThreads: matchingTasks as never,
    totalThreads: tasks.length,
    matchingTasks,
    matchCount: matchingTasks.length,
    totalTasks: tasks.length,
  }
}

/**
 * Filter tasks by status
 */
export function filterTasksByStatus(
  tasks: Task[],
  statuses: TaskStatus[]
): Task[] {
  return tasks.filter((t) => statuses.includes(t.status))
}

/**
 * Analyze blocked tasks
 */
export function analyzeBlockers(
  repoRoot: string,
  streamId: string
): BlockerAnalysis {
  const tasks = getTasks(repoRoot, streamId)
  const blockedTasks = tasks.filter((t) => t.status === "blocked")
  const blockedThreads = getThreads(repoRoot, streamId).filter((t) => t.status === "blocked")

  const blockersByStage: Record<number, Task[]> = {}
  const blockersByBatch: Record<string, Task[]> = {}
  const blockersByStageThreads: Record<number, typeof blockedThreads> = {}
  const blockersByBatchThreads: Record<string, typeof blockedThreads> = {}
  for (const task of blockedTasks) {
    const { stage, batch } = parseTaskId(task.id)
    // By stage
    if (!blockersByStage[stage]) {
      blockersByStage[stage] = []
    }
    blockersByStage[stage].push(task)

    // By batch (stage.batch key)
    const batchKey = `${stage}.${batch.toString().padStart(2, "0")}`
    if (!blockersByBatch[batchKey]) {
      blockersByBatch[batchKey] = []
    }
    blockersByBatch[batchKey].push(task)
  }

  for (const thread of blockedThreads) {
    const parsed = parseTaskId(`${thread.threadId}.01`)
    if (!blockersByStageThreads[parsed.stage]) {
      blockersByStageThreads[parsed.stage] = []
    }
    blockersByStageThreads[parsed.stage]!.push(thread)

    const batchKey = `${parsed.stage}.${parsed.batch.toString().padStart(2, "0")}`
    if (!blockersByBatchThreads[batchKey]) {
      blockersByBatchThreads[batchKey] = []
    }
    blockersByBatchThreads[batchKey]!.push(thread)
  }

  const denominator = blockedThreads.length > 0 ? getThreads(repoRoot, streamId).length : tasks.length
  const blockedPercentage = denominator > 0 ? ((blockedThreads.length || blockedTasks.length) / denominator) * 100 : 0

  return {
    blockedThreads,
    blockersByStageThreads,
    blockersByBatchThreads,
    blockedTasks,
    blockersByStage,
    blockersByBatch,
    blockedPercentage,
  }
}

/**
 * Format metrics for display
 */
export function formatMetricsOutput(
  metrics: EvaluationMetrics,
  options: { compact?: boolean } = {}
): string {
  if (options.compact) {
    return `${metrics.streamName}: ${metrics.threadStatusCounts.completed}/${metrics.totalThreads} (${metrics.completionRate.toFixed(0)}%) | ${metrics.threadStatusCounts.blocked} blocked | ${metrics.threadStatusCounts.in_progress} in progress`
  }

  const lines: string[] = []
  lines.push(`Workstream: ${metrics.streamId} (${metrics.streamName})`)
  lines.push(``)
  lines.push(`Threads: ${metrics.totalThreads}`)
  lines.push(`  Completed:   ${metrics.threadStatusCounts.completed} (${metrics.completionRate.toFixed(1)}%)`)
  lines.push(`  In Progress: ${metrics.threadStatusCounts.in_progress}`)
  lines.push(`  Pending:     ${metrics.threadStatusCounts.pending}`)
  lines.push(`  Blocked:     ${metrics.threadStatusCounts.blocked} (${metrics.blockedRate.toFixed(1)}%)`)
  lines.push(`  Cancelled:   ${metrics.threadStatusCounts.cancelled}`)

  return lines.join("\n")
}

/**
 * Format blocker analysis for display
 */
export function formatBlockerAnalysis(analysis: BlockerAnalysis): string {
  if (analysis.blockedThreads.length === 0) {
    return "No blocked threads."
  }

  const lines: string[] = []
  lines.push(`Blocked Threads: ${analysis.blockedThreads.length} (${analysis.blockedPercentage.toFixed(1)}%)`)
  lines.push(``)

  const stages = Object.keys(analysis.blockersByStageThreads)
    .map(Number)
    .sort((a, b) => a - b)

  for (const stage of stages) {
    const tasks = analysis.blockersByStageThreads[stage]!
    lines.push(`Stage ${stage}:`)
    for (const task of tasks) {
      lines.push(`  [${task.threadId}] ${task.threadName}`)
    }
  }

  return lines.join("\n")
}

/**
 * Aggregate metrics from multiple workstreams
 */
export function aggregateMetrics(
  metricsList: EvaluationMetrics[]
): EvaluationMetrics {
  const aggregate: EvaluationMetrics = {
    streamId: "all",
    streamName: "All Workstreams",
    totalThreads: 0,
    threadStatusCounts: {
      pending: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
      cancelled: 0,
    },
    totalTasks: 0,
    statusCounts: {
      pending: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
      cancelled: 0,
    },
    completionRate: 0,
    blockedRate: 0,
    cancelledRate: 0,
    inProgressCount: 0,
  }

  for (const metrics of metricsList) {
    aggregate.totalThreads += metrics.totalThreads
    aggregate.totalTasks += metrics.totalThreads
    aggregate.threadStatusCounts.pending += metrics.threadStatusCounts.pending
    aggregate.threadStatusCounts.in_progress += metrics.threadStatusCounts.in_progress
    aggregate.threadStatusCounts.completed += metrics.threadStatusCounts.completed
    aggregate.threadStatusCounts.blocked += metrics.threadStatusCounts.blocked
    aggregate.threadStatusCounts.cancelled += metrics.threadStatusCounts.cancelled
    aggregate.statusCounts.pending += metrics.statusCounts.pending
    aggregate.statusCounts.in_progress += metrics.statusCounts.in_progress
    aggregate.statusCounts.completed += metrics.statusCounts.completed
    aggregate.statusCounts.blocked += metrics.statusCounts.blocked
    aggregate.statusCounts.cancelled += metrics.statusCounts.cancelled
    aggregate.inProgressCount += metrics.inProgressCount
  }

  if (aggregate.totalThreads > 0) {
    aggregate.completionRate =
      (aggregate.threadStatusCounts.completed / aggregate.totalThreads) * 100
    aggregate.blockedRate =
      (aggregate.threadStatusCounts.blocked / aggregate.totalThreads) * 100
    aggregate.cancelledRate =
      (aggregate.threadStatusCounts.cancelled / aggregate.totalThreads) * 100
  }

  return aggregate
}
