/**
 * PLAN.md editing utilities
 *
 * Functions for programmatically modifying PLAN.md structure.
 * Supports adding batches and threads to existing stages.
 */

import { readFileSync } from "fs"
import { atomicWriteFile } from "./index.ts"
import { getStreamPlanMdPath } from "./consolidate.ts"
import { parseStreamDocument } from "./stream-parser.ts"
import type { ConsolidateError } from "./types.ts"

export interface AppendBatchOptions {
  stageNumber: number
  name: string
  summary?: string
}

export interface AppendBatchResult {
  success: boolean
  batchNumber: number
  message: string
}

export interface AppendThreadOptions {
  stageNumber: number
  batchNumber: number
  name: string
  summary?: string
}

export interface AppendThreadResult {
  success: boolean
  threadNumber: number
  message: string
}

/**
 * Generate batch markdown template
 */
function generateBatchMarkdown(batchNum: number, name: string, summary?: string): string {
  const paddedNum = batchNum.toString().padStart(2, "0")
  const summaryText = summary || "<!-- What this batch accomplishes -->"

  return `##### Batch ${paddedNum}: ${name}

${summaryText}

###### Thread 01: <!-- Thread Name -->

**Summary:**
<!-- Short description of this parallelizable work unit -->

**Details:**
<!-- Any content - implementation notes, dependencies, goals, code examples, etc. -->`
}

/**
 * Generate thread markdown template
 */
function generateThreadMarkdown(threadNum: number, name: string, summary?: string): string {
  const paddedNum = threadNum.toString().padStart(2, "0")
  const summaryText = summary || "<!-- Short description of this parallelizable work unit -->"

  return `###### Thread ${paddedNum}: ${name}

**Summary:**
${summaryText}

**Details:**
<!-- Any content - implementation notes, dependencies, goals, code examples, etc. -->`
}

/**
 * Find the line where a stage section ends
 * Returns the line number where we should insert new content
 */
function findStageEnd(lines: string[], stageNumber: number): number {
  const stagePattern = new RegExp(`^###\\s+Stage\\s+0?${stageNumber}:`, "i")
  const nextStagePattern = /^###\s+Stage\s+\d+:/i
  const hrPattern = /^---/

  let inStage = false
  let lastContentLine = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    if (stagePattern.test(line)) {
      inStage = true
      lastContentLine = i
      continue
    }

    if (inStage) {
      // Check if we hit the next stage or end of document
      if (nextStagePattern.test(line) || hrPattern.test(line)) {
        return lastContentLine + 1
      }
      // Track last non-empty line
      if (line.trim().length > 0) {
        lastContentLine = i
      }
    }
  }

  // If we're in the stage and reached the end, return after last content
  if (inStage) {
    return lastContentLine + 1
  }

  return -1
}

/**
 * Find the line where a batch ends within a stage
 */
function findBatchEnd(lines: string[], stageNumber: number, batchNumber: number): number {
  const stagePattern = new RegExp(`^###\\s+Stage\\s+0?${stageNumber}:`, "i")
  const batchPattern = new RegExp(`^#####\\s+Batch\\s+0?${batchNumber}:`, "i")
  const nextBatchPattern = /^#####\s+Batch\s+\d+:/i
  const nextStagePattern = /^###\s+Stage\s+\d+:/i
  const h4Pattern = /^####\s+/
  const hrPattern = /^---/

  let inStage = false
  let inBatch = false
  let lastContentLine = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    if (stagePattern.test(line)) {
      inStage = true
      continue
    }

    if (!inStage) continue

    if (batchPattern.test(line)) {
      inBatch = true
      lastContentLine = i
      continue
    }

    if (inBatch) {
      // Check if we hit the next batch, stage, or end section
      if (nextBatchPattern.test(line) || nextStagePattern.test(line) || hrPattern.test(line)) {
        return lastContentLine + 1
      }
      // Track last non-empty line
      if (line.trim().length > 0) {
        lastContentLine = i
      }
    }
  }

  // If we're in the batch and reached the end
  if (inBatch) {
    return lastContentLine + 1
  }

  return -1
}

/**
 * Count existing batches in a stage
 */
function countBatchesInStage(content: string, stageNumber: number): number {
  const errors: ConsolidateError[] = []
  const doc = parseStreamDocument(content, errors)

  if (!doc) return 0

  const stage = doc.stages.find((s) => s.id === stageNumber)
  if (!stage) return 0

  return stage.batches.length
}

/**
 * Count existing threads in a batch
 */
function countThreadsInBatch(content: string, stageNumber: number, batchNumber: number): number {
  const errors: ConsolidateError[] = []
  const doc = parseStreamDocument(content, errors)

  if (!doc) return 0

  const stage = doc.stages.find((s) => s.id === stageNumber)
  if (!stage) return 0

  const batch = stage.batches.find((b) => b.id === batchNumber)
  if (!batch) return 0

  return batch.threads.length
}

/**
 * Append a new batch to an existing stage in PLAN.md
 */
export function appendBatchToStage(
  repoRoot: string,
  streamId: string,
  options: AppendBatchOptions
): AppendBatchResult {
  const planPath = getStreamPlanMdPath(repoRoot, streamId)
  const content = readFileSync(planPath, "utf-8")
  const lines = content.split("\n")

  // Count existing batches to determine new batch number
  const existingBatches = countBatchesInStage(content, options.stageNumber)
  const newBatchNumber = existingBatches + 1

  // Find where to insert (end of stage)
  const insertLine = findStageEnd(lines, options.stageNumber)

  if (insertLine === -1) {
    return {
      success: false,
      batchNumber: 0,
      message: `Stage ${options.stageNumber} not found in PLAN.md`,
    }
  }

  // Generate the batch markdown
  const batchMarkdown = generateBatchMarkdown(newBatchNumber, options.name, options.summary)

  // Insert the new batch
  lines.splice(insertLine, 0, "", batchMarkdown, "")

  // Write back
  atomicWriteFile(planPath, lines.join("\n"))

  return {
    success: true,
    batchNumber: newBatchNumber,
    message: `Added Batch ${newBatchNumber.toString().padStart(2, "0")}: ${options.name}`,
  }
}

/**
 * Append a new thread to an existing batch in PLAN.md
 */
export function appendThreadToBatch(
  repoRoot: string,
  streamId: string,
  options: AppendThreadOptions
): AppendThreadResult {
  const planPath = getStreamPlanMdPath(repoRoot, streamId)
  const content = readFileSync(planPath, "utf-8")
  const lines = content.split("\n")

  // Count existing threads to determine new thread number
  const existingThreads = countThreadsInBatch(
    content,
    options.stageNumber,
    options.batchNumber
  )
  const newThreadNumber = existingThreads + 1

  // Find where to insert (end of batch)
  const insertLine = findBatchEnd(lines, options.stageNumber, options.batchNumber)

  if (insertLine === -1) {
    return {
      success: false,
      threadNumber: 0,
      message: `Batch ${options.batchNumber} in Stage ${options.stageNumber} not found in PLAN.md`,
    }
  }

  // Generate the thread markdown
  const threadMarkdown = generateThreadMarkdown(newThreadNumber, options.name, options.summary)

  // Insert the new thread
  lines.splice(insertLine, 0, "", threadMarkdown)

  // Write back
  atomicWriteFile(planPath, lines.join("\n"))

  return {
    success: true,
    threadNumber: newThreadNumber,
    message: `Added Thread ${newThreadNumber.toString().padStart(2, "0")}: ${options.name}`,
  }
}
