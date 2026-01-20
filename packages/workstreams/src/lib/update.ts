/**
 * Task update operations
 *
 * Updates task status in tasks.json
 */

import type { TaskStatus, StreamMetadata, Task } from "./types.ts"
import { updateTaskStatus, getTaskById, parseTaskId } from "./tasks.ts"
import { ensureTaskFilesDir } from "./files.ts"

export interface UpdateTaskArgs {
  repoRoot: string
  stream: StreamMetadata
  taskId: string
  status: TaskStatus
  note?: string // Note: notes are not currently stored in tasks.json
  breadcrumb?: string
  assigned_agent?: string
}

export interface UpdateTaskResult {
  updated: boolean
  file: string
  taskId: string
  status: TaskStatus
  task: Task | null
}

/**
 * Update a task's status in a workstream
 */
export function updateTask(args: UpdateTaskArgs): UpdateTaskResult {
  // Validate task ID format
  try {
    parseTaskId(args.taskId)
  } catch (e) {
    throw new Error(
      `Invalid task ID: ${args.taskId}. Expected format "stage.batch.thread.task" (e.g., "01.01.02.03")`,
    )
  }

  // Check if task exists
  const existingTask = getTaskById(args.repoRoot, args.stream.id, args.taskId)
  if (!existingTask) {
    throw new Error(
      `Task "${args.taskId}" not found in workstream "${args.stream.id}". ` +
        `Run "work consolidate --stream ${args.stream.id}" first to generate tasks from PLAN.md.`,
    )
  }

  // Update the task
  const updatedTask = updateTaskStatus(
    args.repoRoot,
    args.stream.id,
    args.taskId,
    {
      status: args.status,
      breadcrumb: args.breadcrumb,
      assigned_agent: args.assigned_agent,
    },
  )

  if (!updatedTask) {
    throw new Error(`Failed to update task "${args.taskId}"`)
  }

  // Ensure output directory exists when task is started
  if (args.status === "in_progress") {
    ensureTaskFilesDir(args.repoRoot, args.stream.id, updatedTask)
  }

  return {
    updated: true,
    file: "tasks.json",
    taskId: args.taskId,
    status: args.status,
    task: updatedTask,
  }
}

// Re-export parseTaskId for backwards compatibility
export { parseTaskId } from "./tasks.ts"
