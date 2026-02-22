/**
 * Workstream completion operations
 */

import { join } from "path"
import { writeFileSync } from "fs"
import type { StreamMetadata, ThreadMetadata } from "./types.ts"
import { loadIndex, saveIndex, findStream } from "./index.ts"
import { setNestedField, getNestedField, parseValue } from "./utils.ts"
import { getWorkDir } from "./repo.ts"
import { getTasks } from "./tasks.ts"
import { getThreads, groupThreads } from "./threads.ts"
import { evaluateStream } from "./metrics.ts"

// ============================================
// TIMING HELPER FUNCTIONS
// ============================================

/**
 * Calculate the duration of a thread in milliseconds
 * Returns null if timestamps are missing or invalid
 */
function calculateThreadDuration(thread: ThreadMetadata): number | null {
  if (!thread.createdAt || !thread.updatedAt) {
    return null
  }
  const created = new Date(thread.createdAt).getTime()
  const updated = new Date(thread.updatedAt).getTime()
  if (isNaN(created) || isNaN(updated)) {
    return null
  }
  return Math.max(0, updated - created)
}

/**
 * Format milliseconds as human-readable duration
 * Examples: "1h 23m 45s", "45m 30s", "12s", "<1s"
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return "<1s"
  }

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  const remainingMinutes = minutes % 60
  const remainingSeconds = seconds % 60

  const parts: string[] = []
  if (hours > 0) {
    parts.push(`${hours}h`)
  }
  if (remainingMinutes > 0 || hours > 0) {
    parts.push(`${remainingMinutes}m`)
  }
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}s`)
  }

  return parts.join(" ")
}

/**
 * Stage timing metrics
 */
interface StageMetrics {
  stageName: string
  threadCount: number
  avgTimeMs: number
  totalTimeMs: number
}

/**
 * Calculate timing metrics grouped by stage
 * Only includes completed threads in calculations
 */
function calculateStageMetrics(threads: ThreadMetadata[]): StageMetrics[] {
  const stageMap = new Map<string, { durations: number[] }>()

  for (const thread of threads) {
    if (thread.status !== "completed") continue
    const duration = calculateThreadDuration(thread)
    if (duration === null) continue

    const stageName = thread.stageName || "Unknown Stage"
    if (!stageMap.has(stageName)) {
      stageMap.set(stageName, { durations: [] })
    }
    stageMap.get(stageName)!.durations.push(duration)
  }

  const results: StageMetrics[] = []
  for (const [stageName, data] of stageMap) {
    const totalTimeMs = data.durations.reduce((a, b) => a + b, 0)
    const avgTimeMs =
      data.durations.length > 0 ? totalTimeMs / data.durations.length : 0
    results.push({
      stageName,
      threadCount: data.durations.length,
      avgTimeMs,
      totalTimeMs,
    })
  }

  // Sort by stage name for consistent ordering
  return results.sort((a, b) => a.stageName.localeCompare(b.stageName))
}

/**
 * Agent timing metrics
 */
interface AgentMetrics {
  agentName: string
  threadCount: number
  avgTimeMs: number
}

/**
 * Calculate timing metrics grouped by assigned agent
 * Only includes completed threads in calculations
 */
function calculateAgentMetrics(threads: ThreadMetadata[]): AgentMetrics[] {
  const agentMap = new Map<string, { durations: number[] }>()

  for (const thread of threads) {
    if (thread.status !== "completed") continue
    const duration = calculateThreadDuration(thread)
    if (duration === null) continue

    const agentName = thread.assignedAgent || "default"
    if (!agentMap.has(agentName)) {
      agentMap.set(agentName, { durations: [] })
    }
    agentMap.get(agentName)!.durations.push(duration)
  }

  const results: AgentMetrics[] = []
  for (const [agentName, data] of agentMap) {
    const totalTimeMs = data.durations.reduce((a, b) => a + b, 0)
    const avgTimeMs =
      data.durations.length > 0 ? totalTimeMs / data.durations.length : 0
    results.push({
      agentName,
      threadCount: data.durations.length,
      avgTimeMs,
    })
  }

  // Sort by thread count descending, then by agent name
  return results.sort(
    (a, b) => b.threadCount - a.threadCount || a.agentName.localeCompare(b.agentName)
  )
}

/**
 * Overall timing metrics
 */
interface OverallTimingMetrics {
  totalDurationMs: number | null
  fastestThreadMs: number | null
  slowestThreadMs: number | null
}

/**
 * Calculate overall timing metrics from all threads
 */
function calculateOverallTimingMetrics(threads: ThreadMetadata[]): OverallTimingMetrics {
  const completedThreads = threads.filter((t) => t.status === "completed")

  // Get all valid timestamps for total duration
  const createdTimestamps: number[] = []
  const updatedTimestamps: number[] = []
  const durations: number[] = []

  for (const thread of completedThreads) {
    if (thread.createdAt) {
      const created = new Date(thread.createdAt).getTime()
      if (!isNaN(created)) {
        createdTimestamps.push(created)
      }
    }
    if (thread.updatedAt) {
      const updated = new Date(thread.updatedAt).getTime()
      if (!isNaN(updated)) {
        updatedTimestamps.push(updated)
      }
    }
    const duration = calculateThreadDuration(thread)
    if (duration !== null) {
      durations.push(duration)
    }
  }

  // Total duration: first created_at to last updated_at
  let totalDurationMs: number | null = null
  if (createdTimestamps.length > 0 && updatedTimestamps.length > 0) {
    const firstCreated = Math.min(...createdTimestamps)
    const lastUpdated = Math.max(...updatedTimestamps)
    totalDurationMs = lastUpdated - firstCreated
  }

  // Fastest and slowest tasks
  let fastestThreadMs: number | null = null
  let slowestThreadMs: number | null = null
  if (durations.length > 0) {
    fastestThreadMs = Math.min(...durations)
    slowestThreadMs = Math.max(...durations)
  }

  return {
    totalDurationMs,
    fastestThreadMs,
    slowestThreadMs,
  }
}

export interface CompleteStreamArgs {
  repoRoot: string
  streamId: string
}

export interface CompleteStreamResult {
  streamId: string
  completedAt: string
  completionPath: string
}

/**
 * Mark a workstream as complete
 * Sets the stream status to "completed" explicitly
 */
export function completeStream(args: CompleteStreamArgs): CompleteStreamResult {
  const index = loadIndex(args.repoRoot)
  const streamIndex = index.streams.findIndex(
    (s) => s.id === args.streamId || s.name === args.streamId
  )

  if (streamIndex === -1) {
    throw new Error(`Workstream "${args.streamId}" not found`)
  }

  const stream = index.streams[streamIndex]
  if (!stream) {
    throw new Error(`Workstream at index ${streamIndex} not found`)
  }

  const now = new Date().toISOString()

  // Set status to completed
  stream.status = "completed"
  stream.updated_at = now
  saveIndex(args.repoRoot, index)

  // Generate COMPLETION.md
  const completionPath = generateCompletionMd({
    repoRoot: args.repoRoot,
    streamId: stream.id,
  })

  return {
    streamId: stream.id,
    completedAt: now,
    completionPath,
  }
}

/**
 * Generate a METRICS.md summary for a workstream
 * Contains stream ID, completion timestamp, and task metrics
 */
export function generateCompletionMd(args: {
  repoRoot: string
  streamId: string
}): string {
  const index = loadIndex(args.repoRoot)
  const stream = findStream(index, args.streamId)
  if (!stream) {
    throw new Error(`Workstream "${args.streamId}" not found`)
  }

  const workDir = getWorkDir(args.repoRoot)
  const streamDir = join(workDir, stream.id)
  const threads = getThreads(args.repoRoot, stream.id)
  const threadSource = threads.length > 0 ? threads : getTasks(args.repoRoot, stream.id).map((task) => ({
    threadId: task.id.split(".").slice(0, 3).join("."),
    threadName: task.thread_name,
    stageName: task.stage_name,
    batchName: task.batch_name,
    status: task.status,
    report: task.report,
    breadcrumb: task.breadcrumb,
    assignedAgent: task.assigned_agent,
    sessions: task.sessions || [],
    currentSessionId: task.currentSessionId,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  }))
  const metrics = evaluateStream(args.repoRoot, stream.id)

  // Count unique stages, batches, threads
  const grouped = groupThreads(threadSource)
  let stageCount = 0
  let batchCount = 0
  let threadCount = 0
  for (const stageMap of grouped.values()) {
    stageCount++
    for (const batchMap of stageMap.values()) {
      batchCount++
      threadCount += batchMap.length
    }
  }

  // Calculate timing metrics
  const overallTiming = calculateOverallTimingMetrics(threadSource)
  const stageMetrics = calculateStageMetrics(threadSource)
  const agentMetrics = calculateAgentMetrics(threadSource)

  const lines: string[] = []
  lines.push(`# Metrics: ${stream.name}`)
  lines.push("")
  lines.push(`**Stream ID:** \`${stream.id}\``)
  lines.push(`**Completed At:** ${new Date().toISOString()}`)
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Threads | ${metrics.threadStatusCounts.completed}/${metrics.totalThreads} |`)
  lines.push(`| Completion Rate | ${metrics.completionRate.toFixed(1)}% |`)
  lines.push(`| Stages | ${stageCount} |`)
  lines.push(`| Batches | ${batchCount} |`)
  lines.push(`| Threads | ${threadCount} |`)
  lines.push(
    `| Total Duration | ${overallTiming.totalDurationMs !== null ? formatDuration(overallTiming.totalDurationMs) : "-"} |`
  )
  lines.push(
    `| Fastest Thread | ${overallTiming.fastestThreadMs !== null ? formatDuration(overallTiming.fastestThreadMs) : "-"} |`
  )
  lines.push(
    `| Slowest Thread | ${overallTiming.slowestThreadMs !== null ? formatDuration(overallTiming.slowestThreadMs) : "-"} |`
  )
  lines.push("")
  lines.push("## Status Breakdown")
  lines.push("")
  lines.push(`| Status | Count |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Completed | ${metrics.statusCounts.completed} |`)
  lines.push(`| In Progress | ${metrics.statusCounts.in_progress} |`)
  lines.push(`| Pending | ${metrics.statusCounts.pending} |`)
  lines.push(`| Blocked | ${metrics.statusCounts.blocked} |`)
  lines.push(`| Cancelled | ${metrics.statusCounts.cancelled} |`)
  lines.push("")

  // Stage Performance section
  lines.push("## Stage Performance")
  lines.push("")
  if (stageMetrics.length > 0) {
    lines.push(`| Stage | Threads | Avg Time | Total Time |`)
    lines.push(`|-------|-------|----------|------------|`)
    for (const stage of stageMetrics) {
      lines.push(
        `| ${stage.stageName} | ${stage.threadCount} | ${formatDuration(stage.avgTimeMs)} | ${formatDuration(stage.totalTimeMs)} |`
      )
    }
  } else {
    lines.push("No completed tasks with timing data.")
  }
  lines.push("")

  // Agent Performance section
  lines.push("## Agent Performance")
  lines.push("")
  if (agentMetrics.length > 0) {
    lines.push(`| Agent | Threads | Avg Time |`)
    lines.push(`|-------|-------|----------|`)
    for (const agent of agentMetrics) {
      lines.push(
        `| ${agent.agentName} | ${agent.threadCount} | ${formatDuration(agent.avgTimeMs)} |`
      )
    }
  } else {
    lines.push("No completed tasks with timing data.")
  }
  lines.push("")

  const content = lines.join("\n")
  const outputPath = join(streamDir, "METRICS.md")
  writeFileSync(outputPath, content)

  return outputPath
}

export interface UpdateIndexFieldArgs {
  repoRoot: string
  streamId: string
  field: string
  value: string
}

export interface UpdateIndexFieldResult {
  streamId: string
  field: string
  previousValue: unknown
  newValue: unknown
}

/**
 * Update a specific field in a stream's index entry
 */
export function updateIndexField(
  args: UpdateIndexFieldArgs
): UpdateIndexFieldResult {
  const index = loadIndex(args.repoRoot)
  const streamIndex = index.streams.findIndex(
    (s) => s.id === args.streamId || s.name === args.streamId
  )

  if (streamIndex === -1) {
    throw new Error(`Workstream "${args.streamId}" not found`)
  }

  const stream = index.streams[streamIndex]
  if (!stream) {
    throw new Error(`Workstream at index ${streamIndex} not found`)
  }

  // Get current value
  const currentValue = getNestedField(
    stream as unknown as Record<string, unknown>,
    args.field
  )
  const parsedValue = parseValue(args.value)

  // Update the field
  setNestedField(
    stream as unknown as Record<string, unknown>,
    args.field,
    parsedValue
  )

  // Update timestamps
  stream.updated_at = new Date().toISOString()
  saveIndex(args.repoRoot, index)

  return {
    streamId: stream.id,
    field: args.field,
    previousValue: currentValue,
    newValue: parsedValue,
  }
}

/**
 * Format stream info for display
 */
export function formatStreamInfo(stream: StreamMetadata): string {
  const lines: string[] = [
    `Workstream: ${stream.id}`,
    `|- name: ${stream.name}`,
    `|- order: ${stream.order}`,
    `|- size: ${stream.size}`,
    `|- path: ${stream.path}`,
    `|- created_at: ${stream.created_at}`,
    `|- updated_at: ${stream.updated_at}`,
    `|- session_estimated:`,
    `|  |- length: ${stream.session_estimated.length}`,
    `|  |- unit: ${stream.session_estimated.unit}`,
    `|  |- session_minutes: [${stream.session_estimated.session_minutes.join(", ")}]`,
    `|  +- session_iterations: [${stream.session_estimated.session_iterations.join(", ")}]`,
    `+- generated_by:`,
    `   +- workstreams: ${stream.generated_by.workstreams}`,
  ]

  return lines.join("\n")
}
