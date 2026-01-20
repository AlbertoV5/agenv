/**
 * File system management for workstreams
 */

import { existsSync, mkdirSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"
import { getWorkDir } from "./repo.ts"
import { parseTaskId } from "./tasks.ts"
import type { Task } from "./types.ts"

/**
 * File information for workstream outputs
 */
export interface FileInfo {
  name: string
  path: string
  size: number
}

/**
 * Get all files in a directory recursively
 */
export function getFilesRecursively(
  dir: string,
  baseDir: string,
  files: FileInfo[] = []
): FileInfo[] {
  if (!existsSync(dir)) {
    return files
  }

  const entries = readdirSync(dir)

  for (const entry of entries) {
    // Skip hidden files
    if (entry.startsWith(".")) continue

    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      getFilesRecursively(fullPath, baseDir, files)
    } else {
      files.push({
        name: entry,
        path: relative(baseDir, fullPath),
        size: stat.size,
      })
    }
  }

  return files
}

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
