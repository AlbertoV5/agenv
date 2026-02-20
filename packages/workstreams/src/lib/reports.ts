/**
 * Stage report generation
 *
 * Generates stage completion reports from task data.
 * Reports aggregate task reports by batch/thread for stage-gate review.
 */

import { join } from "path"
import { mkdirSync, readFileSync, writeFileSync } from "fs"
import type { Task, TaskStatus, StageDefinition, ConsolidateError } from "./types.ts"
import { loadIndex, findStream } from "./index.ts"
import { getTasks, parseTaskId } from "./tasks.ts"
import { getWorkDir } from "./repo.ts"
import { resolveByNameOrIndex } from "./utils.ts"
import { parseStreamDocument } from "./stream-parser.ts"

export interface StageReportData {
    stageNumber: number
    stageName: string
    stagePrefix: string
    streamId: string
    streamName: string
    generatedAt: string
    status: "complete" | "in_progress" | "pending" | "blocked"
    batches: BatchReportData[]
    metrics: StageMetrics
}

export interface BatchReportData {
    batchNumber: number
    batchName: string
    threads: ThreadReportData[]
}

export interface ThreadReportData {
    threadNumber: number
    threadName: string
    tasks: TaskReportData[]
}

export interface TaskReportData {
    id: string
    name: string
    status: TaskStatus
    report?: string
}

export interface StageMetrics {
    totalTasks: number
    completed: number
    inProgress: number
    pending: number
    blocked: number
    cancelled: number
    completionRate: number
}

/**
 * Generate a stage report
 */
export function generateStageReport(
    repoRoot: string,
    streamId: string,
    stageRef: number | string,
): StageReportData {
    const index = loadIndex(repoRoot)
    const stream = findStream(index, streamId)
    if (!stream) {
        throw new Error(`Workstream "${streamId}" not found`)
    }

    // Parse PLAN.md to get stage info
    const workDir = getWorkDir(repoRoot)
    const planPath = join(workDir, stream.id, "PLAN.md")
    const planContent = readFileSync(planPath, "utf-8")
    const errors: ConsolidateError[] = []
    const planDoc = parseStreamDocument(planContent, errors)

    if (!planDoc) {
        throw new Error(`Failed to parse PLAN.md: ${errors.map((e) => e.message).join(", ")}`)
    }

    // Resolve stage reference using resolveByNameOrIndex
    const stageRefStr = typeof stageRef === "number" ? stageRef.toString() : stageRef
    const stageDef = resolveByNameOrIndex<StageDefinition>(stageRefStr, planDoc.stages, "stage")
    const stageNumber = stageDef.id
    const stagePrefix = stageNumber.toString().padStart(2, "0")

    // Get all tasks for this stage
    const allTasks = getTasks(repoRoot, stream.id)
    const stageTasks = allTasks.filter((t) => {
        const parsed = parseTaskId(t.id)
        return parsed.stage === stageNumber
    })

    // Calculate metrics
    const metrics = calculateStageMetrics(stageTasks)

    // Determine overall stage status
    const status = determineStageStatus(stageTasks, metrics)

    // Group tasks into batch/thread hierarchy
    const batches = groupTasksIntoBatches(stageTasks, stageDef.batches)

    return {
        stageNumber,
        stageName: stageDef.name,
        stagePrefix,
        streamId: stream.id,
        streamName: stream.name,
        generatedAt: new Date().toISOString(),
        status,
        batches,
        metrics,
    }
}

/**
 * Calculate metrics for a set of tasks
 */
function calculateStageMetrics(tasks: Task[]): StageMetrics {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === "completed").length
    const inProgress = tasks.filter((t) => t.status === "in_progress").length
    const pending = tasks.filter((t) => t.status === "pending").length
    const blocked = tasks.filter((t) => t.status === "blocked").length
    const cancelled = tasks.filter((t) => t.status === "cancelled").length

    return {
        totalTasks: total,
        completed,
        inProgress,
        pending,
        blocked,
        cancelled,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
    }
}

/**
 * Determine overall stage status from task statuses
 */
function determineStageStatus(
    tasks: Task[],
    metrics: StageMetrics,
): "complete" | "in_progress" | "pending" | "blocked" {
    if (tasks.length === 0) return "pending"
    if (metrics.blocked > 0) return "blocked"
    if (metrics.completed === metrics.totalTasks) return "complete"
    if (metrics.inProgress > 0 || metrics.completed > 0) return "in_progress"
    return "pending"
}

/**
 * Group tasks into batches and threads
 */
function groupTasksIntoBatches(
    tasks: Task[],
    batchDefs: { id: number; name: string; threads: { id: number; name: string }[] }[],
): BatchReportData[] {
    const batches: BatchReportData[] = []

    // Create a lookup map for batch/thread names
    const batchMap = new Map<number, { name: string; threads: Map<number, string> }>()
    for (const batch of batchDefs) {
        const threadMap = new Map<number, string>()
        for (const thread of batch.threads) {
            threadMap.set(thread.id, thread.name)
        }
        batchMap.set(batch.id, { name: batch.name, threads: threadMap })
    }

    // Group tasks by batch and thread
    const grouped = new Map<number, Map<number, Task[]>>()
    for (const task of tasks) {
        const parsed = parseTaskId(task.id)
        if (!grouped.has(parsed.batch)) {
            grouped.set(parsed.batch, new Map())
        }
        const batchTasks = grouped.get(parsed.batch)!
        if (!batchTasks.has(parsed.thread)) {
            batchTasks.set(parsed.thread, [])
        }
        batchTasks.get(parsed.thread)!.push(task)
    }

    // Convert to BatchReportData
    const sortedBatches = Array.from(grouped.keys()).sort((a, b) => a - b)
    for (const batchNum of sortedBatches) {
        const batchInfo = batchMap.get(batchNum)
        const batchName = batchInfo?.name ?? `Batch ${batchNum.toString().padStart(2, "0")}`
        const batchTasks = grouped.get(batchNum)!

        const threads: ThreadReportData[] = []
        const sortedThreads = Array.from(batchTasks.keys()).sort((a, b) => a - b)
        for (const threadNum of sortedThreads) {
            const threadName =
                batchInfo?.threads.get(threadNum) ??
                `Thread ${threadNum.toString().padStart(2, "0")}`
            const threadTasks = batchTasks.get(threadNum)!

            // Sort tasks by ID
            threadTasks.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))

            threads.push({
                threadNumber: threadNum,
                threadName,
                tasks: threadTasks.map((t) => ({
                    id: t.id,
                    name: t.name,
                    status: t.status,
                    report: t.report,
                })),
            })
        }

        batches.push({
            batchNumber: batchNum,
            batchName,
            threads,
        })
    }

    return batches
}

/**
 * Format stage report as markdown
 */
export function formatStageReportMarkdown(report: StageReportData): string {
    const lines: string[] = []

    lines.push(`# Stage Report: ${report.stageName} (Stage ${report.stagePrefix})`)
    lines.push("")
    lines.push(`> **Generated:** ${report.generatedAt}  `)
    lines.push(`> **Status:** ${formatStatus(report.status)} (${report.metrics.completed}/${report.metrics.totalTasks} tasks)`)
    lines.push("")

    lines.push("## Summary")
    lines.push("")
    lines.push(`Stage ${report.stagePrefix} (${report.stageName}) progress summary.`)
    lines.push("")

    lines.push("## Completed Work")
    lines.push("")

    for (const batch of report.batches) {
        lines.push(`### Batch ${batch.batchNumber.toString().padStart(2, "0")}: ${batch.batchName}`)
        lines.push("")

        for (const thread of batch.threads) {
            const completedCount = thread.tasks.filter((t) => t.status === "completed").length
            lines.push(`**Thread: ${thread.threadName}** (${completedCount}/${thread.tasks.length} tasks)`)

            for (const task of thread.tasks) {
                const statusIcon = getStatusIcon(task.status)
                lines.push(`- ${statusIcon} ${task.name}`)
                if (task.report) {
                    lines.push(`  > ${task.report}`)
                }
            }
            lines.push("")
        }
    }

    // Issues section
    const blockedTasks = report.batches
        .flatMap((b) => b.threads)
        .flatMap((t) => t.tasks)
        .filter((t) => t.status === "blocked")

    lines.push("## Issues & Blockers")
    lines.push("")
    if (blockedTasks.length > 0) {
        for (const task of blockedTasks) {
            lines.push(`- **${task.id}:** ${task.name}`)
            if (task.report) {
                lines.push(`  > ${task.report}`)
            }
        }
    } else {
        lines.push("No blocked tasks in this stage.")
    }
    lines.push("")

    // Metrics table
    lines.push("## Metrics")
    lines.push("")
    lines.push("| Metric | Value |")
    lines.push("|--------|-------|")
    lines.push(`| Tasks | ${report.metrics.completed}/${report.metrics.totalTasks} complete |`)
    lines.push(`| Completion Rate | ${report.metrics.completionRate.toFixed(1)}% |`)
    lines.push(`| Batches | ${report.batches.length} |`)
    lines.push(`| Threads | ${report.batches.reduce((acc, b) => acc + b.threads.length, 0)} |`)
    lines.push(`| Blocked | ${report.metrics.blocked} |`)
    lines.push("")

    return lines.join("\n")
}

function formatStatus(status: string): string {
    switch (status) {
        case "complete":
            return "Complete"
        case "in_progress":
            return "In Progress"
        case "pending":
            return "Pending"
        case "blocked":
            return "Blocked"
        default:
            return status
    }
}

function getStatusIcon(status: TaskStatus): string {
    switch (status) {
        case "completed":
            return "✓"
        case "in_progress":
            return "◐"
        case "pending":
            return "○"
        case "blocked":
            return "✗"
        case "cancelled":
            return "−"
        default:
            return "?"
    }
}

/**
 * Save a stage report to the reports directory
 */
export function saveStageReport(
    repoRoot: string,
    streamId: string,
    report: StageReportData,
): string {
    const workDir = getWorkDir(repoRoot)
    const reportsDir = join(workDir, streamId, "reports")

    // Ensure reports directory exists
    mkdirSync(reportsDir, { recursive: true })

    // Format filename: {stage-prefix}-{stage-name-slug}.md
    const slug = report.stageName.toLowerCase().replace(/\s+/g, "-")
    const filename = `${report.stagePrefix}-${slug}.md`
    const outputPath = join(reportsDir, filename)

    const content = formatStageReportMarkdown(report)
    writeFileSync(outputPath, content)

    return outputPath
}
