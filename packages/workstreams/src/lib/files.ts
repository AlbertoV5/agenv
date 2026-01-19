/**
 * File system management for workstreams
 */

import { join } from "path"
import { existsSync, mkdirSync } from "fs"
import { getWorkDir } from "./repo.ts"
import { parseTaskId } from "./tasks.ts"
import type { Task } from "./types.ts"

/**
 * Get the output directory path for a task
 * Format: files/stage-{N}/{batchPrefix}-{batchName}/{threadName}
 */
export function getTaskFilesDir(
  repoRoot: string,
  streamId: string,
  task: Task
): string {
  const workDir = getWorkDir(repoRoot)
  const { stage, batch } = parseTaskId(task.id)
  
  const batchPrefix = batch.toString().padStart(2, "0")
  // Sanitize names for filesystem safety (basic)
  const safeBatchName = task.batch_name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()
  const safeThreadName = task.thread_name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()
  
  // Construct path components
  const stageDir = `stage-${stage}`
  const batchDir = `${batchPrefix}-${safeBatchName}`
  const threadDir = safeThreadName
  
  return join(workDir, streamId, "files", stageDir, batchDir, threadDir)
}

/**
 * Ensure the output directory for a task exists
 */
export function ensureTaskFilesDir(
  repoRoot: string,
  streamId: string,
  task: Task
): string {
  const dirPath = getTaskFilesDir(repoRoot, streamId, task)
  
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
  
  return dirPath
}
