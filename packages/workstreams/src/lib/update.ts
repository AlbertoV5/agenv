/**
 * Task update operations
 *
 * Updates task status in tasks.json
 */


import type { TaskStatus, StreamMetadata, Task } from "./types.ts"
import {
  updateTaskStatus,
  getTaskById,
  parseTaskId,
  parseThreadId,
  updateTasksByThread,
} from "./tasks.ts"
import { checkAndCloseThreadIssue, checkAndReopenThreadIssue } from "./github/sync.ts"

export interface UpdateTaskArgs {
  repoRoot: string
  stream: StreamMetadata
  taskId: string
  status: TaskStatus
  note?: string // Note: notes are not currently stored in tasks.json
  breadcrumb?: string
  report?: string
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

  // Check if task exists and track previous status
  const existingTask = getTaskById(args.repoRoot, args.stream.id, args.taskId)
  if (!existingTask) {
    throw new Error(
      `Task "${args.taskId}" not found in workstream "${args.stream.id}". ` +
      `Run "work add-task" to add tasks, or "work validate plan" to check the plan.`,
    )
  }
  const previousStatus = existingTask.status

  // Update the task
  const updatedTask = updateTaskStatus(
    args.repoRoot,
    args.stream.id,
    args.taskId,
    {
      status: args.status,
      breadcrumb: args.breadcrumb,
      report: args.report,
      assigned_agent: args.assigned_agent,
    },
  )

  if (!updatedTask) {
    throw new Error(`Failed to update task "${args.taskId}"`)
  }

  // Check if thread is complete and close GitHub issue if needed
  if (args.status === "completed") {
    checkAndCloseThreadIssue(args.repoRoot, args.stream.id, args.taskId)
      .then((result) => {
        if (result.closed && result.issueNumber) {
          console.log(`Closed GitHub issue #${result.issueNumber} (thread complete)`)
        }
      })
      .catch((error) => {
        // Don't fail the task update if GitHub fails
        console.error("Failed to check/close GitHub issue:", error)
      })
  }

  // Check if task changed from completed to in_progress/blocked and reopen issue if needed
  if (previousStatus === "completed" && (args.status === "in_progress" || args.status === "blocked")) {
    checkAndReopenThreadIssue(args.repoRoot, args.stream.id, args.taskId)
      .then((result) => {
        if (result.reopened && result.issueNumber) {
          console.log(`Reopened GitHub issue #${result.issueNumber} (task no longer completed)`)
        }
      })
      .catch((error) => {
        // Don't fail the task update if GitHub fails
        console.error("Failed to check/reopen GitHub issue:", error)
      })
  }

  return {
    updated: true,
    file: "tasks.json",
    taskId: args.taskId,
    status: args.status,
    task: updatedTask,
  }
}

export interface UpdateThreadTasksArgs {
  repoRoot: string
  stream: StreamMetadata
  threadId: string
  status: TaskStatus
  note?: string
  breadcrumb?: string
  report?: string
  assigned_agent?: string
}

export interface UpdateThreadTasksResult {
  updated: boolean
  file: string
  threadId: string
  status: TaskStatus
  tasks: Task[]
  count: number
}

/**
 * Update all tasks in a thread
 */
export function updateThreadTasks(args: UpdateThreadTasksArgs): UpdateThreadTasksResult {
  // Parse the thread ID

  let parsed: { stage: number; batch: number; thread: number }
  try {
    parsed = parseThreadId(args.threadId)
  } catch (e) {
    throw new Error(
      `Invalid thread ID: ${args.threadId}. Expected format "stage.batch.thread" (e.g., "01.01.02")`,
    )
  }

  // Update all tasks in the thread
  const updatedTasks = updateTasksByThread(
    args.repoRoot,
    args.stream.id,
    parsed.stage,
    parsed.batch,
    parsed.thread,
    {
      status: args.status,
      breadcrumb: args.breadcrumb,
      report: args.report,
      assigned_agent: args.assigned_agent,
    },
  )

  if (updatedTasks.length === 0) {
    throw new Error(
      `No tasks found in thread "${args.threadId}" in workstream "${args.stream.id}".`,
    )
  }

  // Handle GitHub issue sync for completion
  if (args.status === "completed") {
    // Use the first task ID to trigger thread issue close check
    const firstTaskId = updatedTasks[0]!.id
    checkAndCloseThreadIssue(args.repoRoot, args.stream.id, firstTaskId)
      .then((result) => {
        if (result.closed && result.issueNumber) {
          console.log(`Closed GitHub issue #${result.issueNumber} (thread complete)`)
        }
      })
      .catch((error) => {
        console.error("Failed to check/close GitHub issue:", error)
      })
  }

  // Handle GitHub issue sync for status change from completed
  if (args.status === "in_progress" || args.status === "blocked") {
    const firstTaskId = updatedTasks[0]!.id
    checkAndReopenThreadIssue(args.repoRoot, args.stream.id, firstTaskId)
      .then((result) => {
        if (result.reopened && result.issueNumber) {
          console.log(`Reopened GitHub issue #${result.issueNumber} (thread no longer completed)`)
        }
      })
      .catch((error) => {
        console.error("Failed to check/reopen GitHub issue:", error)
      })
  }

  return {
    updated: true,
    file: "tasks.json",
    threadId: args.threadId,
    status: args.status,
    tasks: updatedTasks,
    count: updatedTasks.length,
  }
}

// Re-export parseTaskId for backwards compatibility
export { parseTaskId } from "./tasks.ts"

