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
} from "./tasks.ts"
import { updateThreadStatus, getThreadMetadata } from "./threads.ts"

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
export async function updateTask(args: UpdateTaskArgs): Promise<UpdateTaskResult> {
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

export interface UpdateThreadResult {
  updated: boolean
  file: string
  threadId: string
  status: TaskStatus
}

/**
 * Update all tasks in a thread
 */
export async function updateThreadTasks(args: UpdateThreadTasksArgs): Promise<UpdateThreadTasksResult> {
  // Parse the thread ID

  try {
    parseThreadId(args.threadId)
  } catch (e) {
    throw new Error(
      `Invalid thread ID: ${args.threadId}. Expected format "stage.batch.thread" (e.g., "01.01.02")`,
    )
  }

  const updatedThread = updateThreadStatus(
    args.repoRoot,
    args.stream.id,
    args.threadId,
    {
      status: args.status,
      breadcrumb: args.breadcrumb,
      report: args.report,
      assignedAgent: args.assigned_agent,
    },
  )

  if (!updatedThread) {
    const existingThread = getThreadMetadata(args.repoRoot, args.stream.id, args.threadId)
    if (!existingThread) {
      throw new Error(
        `No tasks found in thread "${args.threadId}" in workstream "${args.stream.id}".`,
      )
    }
    throw new Error(
      `No tasks found in thread "${args.threadId}" in workstream "${args.stream.id}".`,
    )
  }

  const syntheticTask: Task = {
    id: `${args.threadId}.01`,
    name: updatedThread.threadName || args.threadId,
    thread_name: updatedThread.threadName || args.threadId,
    batch_name: updatedThread.batchName || "",
    stage_name: updatedThread.stageName || "",
    created_at: updatedThread.createdAt || new Date().toISOString(),
    updated_at: updatedThread.updatedAt || new Date().toISOString(),
    status: updatedThread.status || args.status,
    report: updatedThread.report,
    breadcrumb: updatedThread.breadcrumb,
    assigned_agent: updatedThread.assignedAgent,
  }

  return {
    updated: true,
    file: "threads.json",
    threadId: args.threadId,
    status: args.status,
    tasks: [syntheticTask],
    count: 1,
  }
}

/**
 * Update a thread's status in threads.json.
 * Thread-first canonical update path.
 */
export async function updateThread(args: UpdateThreadTasksArgs): Promise<UpdateThreadResult> {
  try {
    parseThreadId(args.threadId)
  } catch {
    throw new Error(
      `Invalid thread ID: ${args.threadId}. Expected format "stage.batch.thread" (e.g., "01.01.02")`,
    )
  }

  const updatedThread = updateThreadStatus(
    args.repoRoot,
    args.stream.id,
    args.threadId,
    {
      status: args.status,
      breadcrumb: args.breadcrumb,
      report: args.report,
      assignedAgent: args.assigned_agent,
    },
  )

  if (!updatedThread) {
    throw new Error(
      `Thread "${args.threadId}" not found in workstream "${args.stream.id}". ` +
        `Run "work approve plan" to sync thread metadata from PLAN.md.`,
    )
  }

  return {
    updated: true,
    file: "threads.json",
    threadId: args.threadId,
    status: args.status,
  }
}

// Re-export parseTaskId for backwards compatibility
export { parseTaskId } from "./tasks.ts"
