/**
 * Workstream completion operations
 */

import { join } from "path"
import { writeFileSync } from "fs"
import type { StreamMetadata, Task } from "./types.ts"
import { loadIndex, saveIndex, findStream } from "./index.ts"
import { setNestedField, getNestedField, parseValue } from "./utils.ts"
import { getWorkDir } from "./repo.ts"
import { getTasks } from "./tasks.ts"
import { evaluateStream } from "./metrics.ts"
import { getFilesRecursively } from "./files.ts"

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
 * Generate a COMPLETION.md summary for a workstream
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
  const tasks = getTasks(args.repoRoot, stream.id)
  const metrics = evaluateStream(args.repoRoot, stream.id)
  const filesDir = join(streamDir, "files")
  const files = getFilesRecursively(filesDir, filesDir)

  const lines: string[] = []
  lines.push(`# Completion: ${stream.name}`)
  lines.push("")
  lines.push(`**Stream ID:** \`${stream.id}\``)
  lines.push(`**Completed At:** ${new Date().toISOString()}`)
  lines.push("")

  lines.push("## Accomplishments")
  const completedTasks = tasks.filter((t) => t.status === "completed")
  if (completedTasks.length > 0) {
    for (const task of completedTasks) {
      lines.push(`- ${task.name}`)
    }
  } else {
    lines.push("_No tasks marked as completed._")
  }
  lines.push("")

  lines.push("## Key Insights")
  lines.push("- (Add insights and learnings here)")
  lines.push("")

  lines.push("## File References")
  if (files.length > 0) {
    lines.push("| File | Size |")
    lines.push("|------|------|")
    files.sort((a, b) => a.path.localeCompare(b.path))
    for (const file of files) {
      lines.push(`| [files/${file.path}](files/${file.path}) | ${formatSize(file.size)} |`)
    }
  } else {
    lines.push("_No files found in the output directory._")
  }
  lines.push("")

  lines.push("## Metrics")
  lines.push(`- **Total Tasks:** ${metrics.totalTasks}`)
  lines.push(`- **Completion Rate:** ${metrics.completionRate.toFixed(1)}%`)
  lines.push(`- **Status Counts:**`)
  lines.push(`  - Completed: ${metrics.statusCounts.completed}`)
  lines.push(`  - In Progress: ${metrics.statusCounts.in_progress}`)
  lines.push(`  - Pending: ${metrics.statusCounts.pending}`)
  lines.push(`  - Blocked: ${metrics.statusCounts.blocked}`)
  lines.push(`  - Cancelled: ${metrics.statusCounts.cancelled}`)
  lines.push("")

  const content = lines.join("\n")
  const outputPath = join(streamDir, "COMPLETION.md")
  writeFileSync(outputPath, content)

  return outputPath
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
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
