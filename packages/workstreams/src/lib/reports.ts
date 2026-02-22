/**
 * Stage report generation
 *
 * Generates stage completion reports from thread execution data.
 * Reports aggregate thread outcomes by batch for stage-gate review.
 */

import { join } from "path"
import { mkdirSync, readFileSync, writeFileSync } from "fs"
import type {
    ThreadMetadata,
    ThreadStatus,
    StageDefinition,
    ConsolidateError,
} from "./types.ts"
import { loadIndex, findStream } from "./index.ts"
import { getThreads } from "./threads.ts"
import { getTasks, parseTaskId } from "./tasks.ts"
import { getWorkDir } from "./repo.ts"
import { resolveByNameOrIndex } from "./utils.ts"
import { parseStreamDocument } from "./stream-parser.ts"
import { parsePlannerOutcomePayload } from "./planner-outcome.ts"

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
    status: ThreadStatus
    report?: string
}

function normalizeReportText(report: string | undefined, threadId: string): string | undefined {
    if (!report) return report

    const validation = parsePlannerOutcomePayload(report, threadId)
    if (validation.valid && validation.payload) {
        return validation.payload.report
    }

    return report
}

export interface StageMetrics {
    totalThreads: number
    completed: number
    inProgress: number
    pending: number
    blocked: number
    cancelled: number
    completionRate: number
}

function threadMetadataFromTasks(repoRoot: string, streamId: string): ThreadMetadata[] {
    const tasks = getTasks(repoRoot, streamId)
    const byThread = new Map<string, ThreadMetadata>()

    for (const task of tasks) {
        const parsed = parseTaskId(task.id)
        const threadId = `${parsed.stage.toString().padStart(2, "0")}.${parsed.batch.toString().padStart(2, "0")}.${parsed.thread.toString().padStart(2, "0")}`
        if (byThread.has(threadId)) continue

        byThread.set(threadId, {
            threadId,
            threadName: task.thread_name,
            batchName: task.batch_name,
            stageName: task.stage_name,
            status: task.status,
            report: task.report,
            breadcrumb: task.breadcrumb,
            assignedAgent: task.assigned_agent,
            sessions: task.sessions || [],
            currentSessionId: task.currentSessionId,
            createdAt: task.created_at,
            updatedAt: task.updated_at,
        })
    }

    return Array.from(byThread.values())
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

    // Get all threads for this stage
    const allThreads = getThreads(repoRoot, stream.id)
    const threadSource = allThreads.length > 0 ? allThreads : threadMetadataFromTasks(repoRoot, stream.id)
    const stageThreads = threadSource.filter((t) => {
        const parsed = parseTaskId(`${t.threadId}.01`)
        return parsed.stage === stageNumber
    })

    // Calculate metrics
    const metrics = calculateStageMetrics(stageThreads)

    // Determine overall stage status
    const status = determineStageStatus(stageThreads, metrics)

    // Group threads into batch/thread hierarchy
    const batches = groupThreadsIntoBatches(stageThreads, stageDef.batches)

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
 * Calculate metrics for a set of threads
 */
function calculateStageMetrics(threads: ThreadMetadata[]): StageMetrics {
    const total = threads.length
    const completed = threads.filter((t) => t.status === "completed").length
    const inProgress = threads.filter((t) => t.status === "in_progress").length
    const pending = threads.filter((t) => t.status === "pending").length
    const blocked = threads.filter((t) => t.status === "blocked").length
    const cancelled = threads.filter((t) => t.status === "cancelled").length

    return {
        totalThreads: total,
        completed,
        inProgress,
        pending,
        blocked,
        cancelled,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
    }
}

/**
 * Determine overall stage status from thread statuses
 */
function determineStageStatus(
    threads: ThreadMetadata[],
    metrics: StageMetrics,
): "complete" | "in_progress" | "pending" | "blocked" {
    if (threads.length === 0) return "pending"
    if (metrics.blocked > 0) return "blocked"
    if (metrics.completed === metrics.totalThreads) return "complete"
    if (metrics.inProgress > 0 || metrics.completed > 0) return "in_progress"
    return "pending"
}

/**
 * Group threads into batches for report rendering
 */
function groupThreadsIntoBatches(
    threads: ThreadMetadata[],
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

    // Group threads by batch and thread
    const grouped = new Map<number, Map<number, ThreadMetadata[]>>()
    for (const thread of threads) {
        const parsed = parseTaskId(`${thread.threadId}.01`)
        if (!grouped.has(parsed.batch)) {
            grouped.set(parsed.batch, new Map())
        }
        const batchThreads = grouped.get(parsed.batch)!
        if (!batchThreads.has(parsed.thread)) {
            batchThreads.set(parsed.thread, [])
        }
        batchThreads.get(parsed.thread)!.push(thread)
    }

    // Convert to BatchReportData
    const sortedBatches = Array.from(grouped.keys()).sort((a, b) => a - b)
    for (const batchNum of sortedBatches) {
        const batchInfo = batchMap.get(batchNum)
        const batchName = batchInfo?.name ?? `Batch ${batchNum.toString().padStart(2, "0")}`
        const batchThreads = grouped.get(batchNum)!

        const threads: ThreadReportData[] = []
        const sortedThreads = Array.from(batchThreads.keys()).sort((a, b) => a - b)
        for (const threadNum of sortedThreads) {
            const threadName =
                batchInfo?.threads.get(threadNum) ??
                `Thread ${threadNum.toString().padStart(2, "0")}`
            const group = batchThreads.get(threadNum)!
            const primary = group[0]
            if (!primary) continue

            threads.push({
                threadNumber: threadNum,
                threadName,
                tasks: [
                    {
                        id: primary.threadId,
                        name: primary.threadName || threadName,
                        status: primary.status || "pending",
                        report: normalizeReportText(primary.report, primary.threadId),
                    },
                ],
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
    lines.push(`> **Status:** ${formatStatus(report.status)} (${report.metrics.completed}/${report.metrics.totalThreads} threads)`)
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
            lines.push(`**Thread: ${thread.threadName}** (${completedCount}/${thread.tasks.length} threads)`)

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
    const blockedThreads = report.batches
        .flatMap((b) => b.threads)
        .flatMap((t) => t.tasks)
        .filter((t) => t.status === "blocked")

    lines.push("## Issues & Blockers")
    lines.push("")
    if (blockedThreads.length > 0) {
        for (const task of blockedThreads) {
            lines.push(`- **${task.id}:** ${task.name}`)
            if (task.report) {
                lines.push(`  > ${task.report}`)
            }
        }
    } else {
        lines.push("No blocked threads in this stage.")
    }
    lines.push("")

    // Metrics table
    lines.push("## Metrics")
    lines.push("")
    lines.push("| Metric | Value |")
    lines.push("|--------|-------|")
    lines.push(`| Threads | ${report.metrics.completed}/${report.metrics.totalThreads} complete |`)
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

function getStatusIcon(status: ThreadStatus): string {
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
