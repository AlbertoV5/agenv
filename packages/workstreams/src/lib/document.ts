/**
 * Document generation functions for workstreams
 *
 * Provides functions to generate reports, changelogs, and exports.
 */

import type {
  Task,
  TaskStatus,
  StreamStatus,
  ProgressReport,
  StageReport,
  ChangelogEntry,
  ExportFormat,
} from "./types.ts"
import { getTasks, groupTasksByStageAndThread, parseTaskId } from "./tasks.ts"
import { loadIndex, findStream } from "./index.ts"
import { getStreamStatus } from "./status.ts"
import { evaluateStream } from "./metrics.ts"

/**
 * Generate a progress report for a workstream
 */
export function generateReport(
  repoRoot: string,
  streamId: string
): ProgressReport {
  const index = loadIndex(repoRoot)
  const stream = findStream(index, streamId)

  if (!stream) {
    throw new Error(`Workstream "${streamId}" not found`)
  }

  const tasks = getTasks(repoRoot, stream.id)
  const metrics = evaluateStream(repoRoot, stream.id)
  const status = getStreamStatus(repoRoot, stream)

  // Group tasks by stage
  const tasksByStage = new Map<number, Task[]>()
  for (const task of tasks) {
    const { stage } = parseTaskId(task.id)
    if (!tasksByStage.has(stage)) {
      tasksByStage.set(stage, [])
    }
    tasksByStage.get(stage)!.push(task)
  }

  // Build stage reports
  const stageReports: StageReport[] = []
  const stageNumbers = Array.from(tasksByStage.keys()).sort((a, b) => a - b)

  for (const stageNum of stageNumbers) {
    const stageTasks = tasksByStage.get(stageNum)!
    const firstTask = stageTasks[0]

    // Count unique batches and threads
    const batches = new Set(stageTasks.map((t) => parseTaskId(t.id).batch))
    const threads = new Set(stageTasks.map((t) => {
      const { batch, thread } = parseTaskId(t.id)
      return `${batch}.${thread}`
    }))

    stageReports.push({
      stageNumber: stageNum,
      stageName: firstTask?.stage_name ?? `Stage ${stageNum}`,
      batchCount: batches.size,
      threadCount: threads.size,
      taskCount: stageTasks.length,
      completedCount: stageTasks.filter((t) => t.status === "completed").length,
      blockedCount: stageTasks.filter((t) => t.status === "blocked").length,
      inProgressCount: stageTasks.filter((t) => t.status === "in_progress")
        .length,
    })
  }

  return {
    streamId: stream.id,
    streamName: stream.name,
    generatedAt: new Date().toISOString(),
    status,
    metrics,
    stageReports,
  }
}

/**
 * Format a progress report as markdown
 */
export function formatReportMarkdown(report: ProgressReport): string {
  const lines: string[] = []

  lines.push(`# Progress Report: ${report.streamName}`)
  lines.push(``)
  lines.push(`**Generated:** ${new Date(report.generatedAt).toLocaleString()}`)
  lines.push(`**Status:** ${report.status}`)
  lines.push(``)

  // Summary
  lines.push(`## Summary`)
  lines.push(``)
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Total Tasks | ${report.metrics.totalTasks} |`)
  lines.push(
    `| Completed | ${report.metrics.statusCounts.completed} (${report.metrics.completionRate.toFixed(1)}%) |`
  )
  lines.push(`| In Progress | ${report.metrics.statusCounts.in_progress} |`)
  lines.push(`| Pending | ${report.metrics.statusCounts.pending} |`)
  lines.push(
    `| Blocked | ${report.metrics.statusCounts.blocked} (${report.metrics.blockedRate.toFixed(1)}%) |`
  )
  lines.push(`| Cancelled | ${report.metrics.statusCounts.cancelled} |`)
  lines.push(``)

  // Stage breakdown
  if (report.stageReports.length > 0) {
    lines.push(`## Stages`)
    lines.push(``)

    for (const stage of report.stageReports) {
      const completionPct =
        stage.taskCount > 0
          ? ((stage.completedCount / stage.taskCount) * 100).toFixed(0)
          : 0
      lines.push(`### Stage ${stage.stageNumber}: ${stage.stageName}`)
      lines.push(``)
      lines.push(`- **Batches:** ${stage.batchCount}`)
      lines.push(`- **Threads:** ${stage.threadCount}`)
      lines.push(
        `- **Tasks:** ${stage.completedCount}/${stage.taskCount} (${completionPct}%)`
      )
      if (stage.inProgressCount > 0) {
        lines.push(`- **In Progress:** ${stage.inProgressCount}`)
      }
      if (stage.blockedCount > 0) {
        lines.push(`- **Blocked:** ${stage.blockedCount}`)
      }
      lines.push(``)
    }
  }

  return lines.join("\n")
}

/**
 * Generate changelog entries from completed tasks
 */
export function generateChangelog(
  repoRoot: string,
  streamId: string,
  since?: Date
): ChangelogEntry[] {
  const tasks = getTasks(repoRoot, streamId, "completed")

  let filteredTasks = tasks

  if (since) {
    filteredTasks = tasks.filter((t) => new Date(t.updated_at) >= since)
  }

  // Sort by completion date (most recent first)
  filteredTasks.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )

  return filteredTasks.map((task) => ({
    taskId: task.id,
    taskName: task.name,
    stageName: task.stage_name,
    threadName: task.thread_name,
    completedAt: task.updated_at,
  }))
}

/**
 * Format changelog entries as markdown
 */
export function formatChangelogMarkdown(entries: ChangelogEntry[]): string {
  if (entries.length === 0) {
    return "No completed tasks found."
  }

  const lines: string[] = []
  lines.push(`# Changelog`)
  lines.push(``)
  lines.push(`_${entries.length} completed tasks_`)
  lines.push(``)

  // Group by date
  const byDate = new Map<string, ChangelogEntry[]>()
  for (const entry of entries) {
    const date = new Date(entry.completedAt).toLocaleDateString()
    if (!byDate.has(date)) {
      byDate.set(date, [])
    }
    byDate.get(date)!.push(entry)
  }

  for (const [date, dateEntries] of byDate) {
    lines.push(`## ${date}`)
    lines.push(``)
    for (const entry of dateEntries) {
      lines.push(`- **[${entry.taskId}]** ${entry.taskName}`)
      lines.push(`  - Stage: ${entry.stageName}`)
      lines.push(`  - Thread: ${entry.threadName}`)
    }
    lines.push(``)
  }

  return lines.join("\n")
}

/**
 * Export workstream data as CSV
 */
export function exportStreamAsCSV(repoRoot: string, streamId: string): string {
  const tasks = getTasks(repoRoot, streamId)

  const headers = [
    "task_id",
    "name",
    "stage_name",
    "thread_name",
    "status",
    "created_at",
    "updated_at",
  ]

  const rows = tasks.map((task) => [
    task.id,
    `"${task.name.replace(/"/g, '""')}"`,
    `"${task.stage_name.replace(/"/g, '""')}"`,
    `"${task.thread_name.replace(/"/g, '""')}"`,
    task.status,
    task.created_at,
    task.updated_at,
  ])

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
}

/**
 * Export workstream data as JSON
 */
export function exportStreamAsJSON(repoRoot: string, streamId: string): string {
  const index = loadIndex(repoRoot)
  const stream = findStream(index, streamId)

  if (!stream) {
    throw new Error(`Workstream "${streamId}" not found`)
  }

  const tasks = getTasks(repoRoot, stream.id)
  const metrics = evaluateStream(repoRoot, stream.id)
  const status = getStreamStatus(repoRoot, stream)

  return JSON.stringify(
    {
      stream: {
        id: stream.id,
        name: stream.name,
        status,
        created_at: stream.created_at,
        updated_at: stream.updated_at,
      },
      metrics,
      tasks,
    },
    null,
    2
  )
}

/**
 * Export workstream as markdown summary
 */
export function exportStreamAsMarkdown(repoRoot: string, streamId: string): string {
  const report = generateReport(repoRoot, streamId)
  const tasks = getTasks(repoRoot, streamId)
  const grouped = groupTasksByStageAndThread(tasks)

  const lines: string[] = []

  // Header
  lines.push(`# ${report.streamName}`)
  lines.push(``)
  lines.push(`**Status:** ${report.status}`)
  lines.push(
    `**Progress:** ${report.metrics.statusCounts.completed}/${report.metrics.totalTasks} tasks (${report.metrics.completionRate.toFixed(0)}%)`
  )
  lines.push(``)

  // Task list by stage/thread
  lines.push(`## Tasks`)
  lines.push(``)

  for (const [stageName, threads] of grouped) {
    lines.push(`### ${stageName}`)
    lines.push(``)

    for (const [threadName, threadTasks] of threads) {
      lines.push(`#### ${threadName}`)
      lines.push(``)

      for (const task of threadTasks) {
        const checkbox = task.status === "completed" ? "[x]" : "[ ]"
        const statusNote =
          task.status === "blocked"
            ? " (blocked)"
            : task.status === "in_progress"
              ? " (in progress)"
              : task.status === "cancelled"
                ? " (cancelled)"
                : ""
        lines.push(`- ${checkbox} **${task.id}**: ${task.name}${statusNote}`)
      }
      lines.push(``)
    }
  }

  return lines.join("\n")
}

/**
 * Export workstream in specified format
 */
export function exportStream(
  repoRoot: string,
  streamId: string,
  format: ExportFormat
): string {
  switch (format) {
    case "csv":
      return exportStreamAsCSV(repoRoot, streamId)
    case "json":
      return exportStreamAsJSON(repoRoot, streamId)
    case "md":
      return exportStreamAsMarkdown(repoRoot, streamId)
    default:
      throw new Error(`Unknown export format: ${format}`)
  }
}

/**
 * Generate a brief summary of a workstream
 */
export function generateSummary(
  repoRoot: string,
  streamId: string,
  detailed: boolean = false
): string {
  const report = generateReport(repoRoot, streamId)
  const m = report.metrics

  if (!detailed) {
    return `${report.streamName}: ${m.statusCounts.completed}/${m.totalTasks} tasks completed (${m.completionRate.toFixed(0)}%), ${m.statusCounts.in_progress} in progress, ${m.statusCounts.blocked} blocked.`
  }

  const lines: string[] = []
  lines.push(
    `**${report.streamName}** is ${report.status} with ${m.completionRate.toFixed(0)}% of tasks completed.`
  )
  lines.push(``)
  lines.push(
    `Out of ${m.totalTasks} total tasks, ${m.statusCounts.completed} are completed, ${m.statusCounts.in_progress} are in progress, and ${m.statusCounts.pending} are pending.`
  )

  if (m.statusCounts.blocked > 0) {
    lines.push(
      ` There are ${m.statusCounts.blocked} blocked tasks that need attention.`
    )
  }

  if (report.stageReports.length > 1) {
    lines.push(``)
    lines.push(`The workstream spans ${report.stageReports.length} stages:`)
    for (const stage of report.stageReports) {
      const pct =
        stage.taskCount > 0
          ? ((stage.completedCount / stage.taskCount) * 100).toFixed(0)
          : 0
      lines.push(
        `- Stage ${stage.stageNumber} (${stage.stageName}): ${pct}% complete`
      )
    }
  }

  return lines.join("\n")
}
