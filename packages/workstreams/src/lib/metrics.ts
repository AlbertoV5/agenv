/**
 * Metrics and evaluation functions for workstreams
 *
 * Provides functions to calculate metrics, filter tasks, and analyze blockers.
 */

import type {
  Task,
  TaskStatus,
  EvaluationMetrics,
  BlockerAnalysis,
  FilterResult,
  StreamMetadata,
} from "./types.ts"
import { getTasks, parseTaskId } from "./tasks.ts"
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

  const total = tasks.length
  const completionRate = total > 0 ? (statusCounts.completed / total) * 100 : 0
  const blockedRate = total > 0 ? (statusCounts.blocked / total) * 100 : 0
  const cancelledRate = total > 0 ? (statusCounts.cancelled / total) * 100 : 0

  return {
    streamId: stream.id,
    streamName: stream.name,
    totalTasks: total,
    statusCounts,
    completionRate,
    blockedRate,
    cancelledRate,
    inProgressCount: statusCounts.in_progress,
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

  const blockersByStage: Record<number, Task[]> = {}
  const blockersByBatch: Record<string, Task[]> = {}
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

  const blockedPercentage =
    tasks.length > 0 ? (blockedTasks.length / tasks.length) * 100 : 0

  return {
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
    return `${metrics.streamName}: ${metrics.statusCounts.completed}/${metrics.totalTasks} (${metrics.completionRate.toFixed(0)}%) | ${metrics.statusCounts.blocked} blocked | ${metrics.statusCounts.in_progress} in progress`
  }

  const lines: string[] = []
  lines.push(`Workstream: ${metrics.streamId} (${metrics.streamName})`)
  lines.push(``)
  lines.push(`Tasks: ${metrics.totalTasks}`)
  lines.push(`  Completed:   ${metrics.statusCounts.completed} (${metrics.completionRate.toFixed(1)}%)`)
  lines.push(`  In Progress: ${metrics.statusCounts.in_progress}`)
  lines.push(`  Pending:     ${metrics.statusCounts.pending}`)
  lines.push(`  Blocked:     ${metrics.statusCounts.blocked} (${metrics.blockedRate.toFixed(1)}%)`)
  lines.push(`  Cancelled:   ${metrics.statusCounts.cancelled}`)

  return lines.join("\n")
}

/**
 * Format blocker analysis for display
 */
export function formatBlockerAnalysis(analysis: BlockerAnalysis): string {
  if (analysis.blockedTasks.length === 0) {
    return "No blocked tasks."
  }

  const lines: string[] = []
  lines.push(`Blocked Tasks: ${analysis.blockedTasks.length} (${analysis.blockedPercentage.toFixed(1)}%)`)
  lines.push(``)

  const stages = Object.keys(analysis.blockersByStage)
    .map(Number)
    .sort((a, b) => a - b)

  for (const stage of stages) {
    const tasks = analysis.blockersByStage[stage]!
    lines.push(`Stage ${stage}:`)
    for (const task of tasks) {
      lines.push(`  [${task.id}] ${task.name}`)
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
    aggregate.totalTasks += metrics.totalTasks
    aggregate.statusCounts.pending += metrics.statusCounts.pending
    aggregate.statusCounts.in_progress += metrics.statusCounts.in_progress
    aggregate.statusCounts.completed += metrics.statusCounts.completed
    aggregate.statusCounts.blocked += metrics.statusCounts.blocked
    aggregate.statusCounts.cancelled += metrics.statusCounts.cancelled
    aggregate.inProgressCount += metrics.inProgressCount
  }

  if (aggregate.totalTasks > 0) {
    aggregate.completionRate =
      (aggregate.statusCounts.completed / aggregate.totalTasks) * 100
    aggregate.blockedRate =
      (aggregate.statusCounts.blocked / aggregate.totalTasks) * 100
    aggregate.cancelledRate =
      (aggregate.statusCounts.cancelled / aggregate.totalTasks) * 100
  }

  return aggregate
}
