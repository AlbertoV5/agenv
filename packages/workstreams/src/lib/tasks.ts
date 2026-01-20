/**
 * tasks.json read/write operations
 *
 * This module handles all operations on the tasks.json file which stores
 * task tracking information in JSON format.
 */

import { existsSync, readFileSync } from "fs"
import { join } from "path"
import type { Task, TasksFile, TaskStatus } from "./types.ts"
import { atomicWriteFile } from "./index.ts"
import { getWorkDir } from "./repo.ts"

const TASKS_FILE_VERSION = "1.0.0"

/**
 * Get the path to tasks.json for a workstream
 */
export function getTasksFilePath(repoRoot: string, streamId: string): string {
  const workDir = getWorkDir(repoRoot)
  return join(workDir, streamId, "tasks.json")
}

/**
 * Create an empty tasks.json structure
 */
export function createEmptyTasksFile(streamId: string): TasksFile {
  return {
    version: TASKS_FILE_VERSION,
    stream_id: streamId,
    last_updated: new Date().toISOString(),
    tasks: [],
  }
}

/**
 * Read tasks.json from a workstream directory
 * Returns null if file doesn't exist
 */
export function readTasksFile(
  repoRoot: string,
  streamId: string,
): TasksFile | null {
  const filePath = getTasksFilePath(repoRoot, streamId)

  if (!existsSync(filePath)) {
    return null
  }

  const content = readFileSync(filePath, "utf-8")
  return JSON.parse(content) as TasksFile
}

/**
 * Write tasks.json to a workstream directory
 */
export function writeTasksFile(
  repoRoot: string,
  streamId: string,
  tasksFile: TasksFile,
): void {
  const filePath = getTasksFilePath(repoRoot, streamId)
  tasksFile.last_updated = new Date().toISOString()
  atomicWriteFile(filePath, JSON.stringify(tasksFile, null, 2))
}

/**
 * Get a specific task by ID
 * Returns null if task not found
 */
export function getTaskById(
  repoRoot: string,
  streamId: string,
  taskId: string,
): Task | null {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return null

  return tasksFile.tasks.find((t) => t.id === taskId) || null
}

/**
 * Get all tasks, optionally filtered by status
 */
export function getTasks(
  repoRoot: string,
  streamId: string,
  status?: TaskStatus,
): Task[] {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return []

  if (status) {
    return tasksFile.tasks.filter((t) => t.status === status)
  }
  return tasksFile.tasks
}

export interface TaskUpdateOptions {
  status?: TaskStatus
  breadcrumb?: string
  assigned_agent?: string
}

/**
 * Update a task's status
 * Returns the updated task, or null if not found
 */
export function updateTaskStatus(
  repoRoot: string,
  streamId: string,
  taskId: string,
  optionsOrStatus: TaskUpdateOptions | TaskStatus,
  legacyBreadcrumb?: string,
): Task | null {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return null

  const taskIndex = tasksFile.tasks.findIndex((t) => t.id === taskId)
  if (taskIndex === -1) return null

  const task = tasksFile.tasks[taskIndex]!

  let opts: TaskUpdateOptions
  if (typeof optionsOrStatus === "string") {
    opts = { status: optionsOrStatus, breadcrumb: legacyBreadcrumb }
  } else {
    opts = optionsOrStatus
  }

  if (opts.status) task.status = opts.status
  if (opts.breadcrumb) task.breadcrumb = opts.breadcrumb
  if (opts.assigned_agent) task.assigned_agent = opts.assigned_agent

  task.updated_at = new Date().toISOString()

  writeTasksFile(repoRoot, streamId, tasksFile)
  return task
}

/**
 * Add tasks to tasks.json
 * Preserves existing task status if task with same ID exists
 */
export function addTasks(
  repoRoot: string,
  streamId: string,
  newTasks: Task[],
): TasksFile {
  let tasksFile = readTasksFile(repoRoot, streamId)

  if (!tasksFile) {
    tasksFile = createEmptyTasksFile(streamId)
  }

  // Create a map of existing tasks by ID
  const existingTasksMap = new Map(tasksFile.tasks.map((t) => [t.id, t]))

  // Add new tasks, updating if they already exist
  for (const newTask of newTasks) {
    const existing = existingTasksMap.get(newTask.id)
    if (existing) {
      // Update existing task but preserve status
      existingTasksMap.set(newTask.id, {
        ...newTask,
        status: existing.status,
        created_at: existing.created_at,
        updated_at: existing.updated_at,
      })
    } else {
      // Add new task
      existingTasksMap.set(newTask.id, newTask)
    }
  }

  // Convert map back to array, sorted by ID
  tasksFile.tasks = Array.from(existingTasksMap.values()).sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  )
  writeTasksFile(repoRoot, streamId, tasksFile)

  return tasksFile
}

/**
 * Get task counts by status
 */
export function getTaskCounts(
  repoRoot: string,
  streamId: string,
): {
  total: number
  pending: number
  in_progress: number
  completed: number
  blocked: number
  cancelled: number
} {
  const tasks = getTasks(repoRoot, streamId)

  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
    cancelled: tasks.filter((t) => t.status === "cancelled").length,
  }
}

/**
 * Group tasks by stage and thread
 * Returns a nested structure: { stageName: { threadName: Task[] } }
 */
export function groupTasksByStageAndThread(
  tasks: Task[],
): Map<string, Map<string, Task[]>> {
  const grouped = new Map<string, Map<string, Task[]>>()

  for (const task of tasks) {
    if (!grouped.has(task.stage_name)) {
      grouped.set(task.stage_name, new Map())
    }
    const stageMap = grouped.get(task.stage_name)!

    if (!stageMap.has(task.thread_name)) {
      stageMap.set(task.thread_name, [])
    }
    stageMap.get(task.thread_name)!.push(task)
  }

  // Sort tasks within each thread by ID
  for (const stageMap of grouped.values()) {
    for (const tasks of stageMap.values()) {
      tasks.sort((a, b) => {
        const aParts = a.id.split(".").map(Number)
        const bParts = b.id.split(".").map(Number)
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] ?? 0
          const bVal = bParts[i] ?? 0
          if (aVal !== bVal) return aVal - bVal
        }
        return 0
      })
    }
  }

  return grouped
}

/**
 * Parse task ID into components
 * Returns { stage, batch, thread, task } numbers
 * Supports both legacy 3-part format (treated as batch 0) and new 4-part format
 */
export function parseTaskId(taskId: string): {
  stage: number
  batch: number
  thread: number
  task: number
} {
  const parts = taskId.split(".")

  // New 4-part format: stage.batch.thread.task
  if (parts.length === 4) {
    const parsed = parts.map((p) => parseInt(p, 10))
    if (parsed.some(isNaN)) {
      throw new Error(
        `Invalid task ID format: ${taskId}. Expected "stage.batch.thread.task" (e.g., "01.00.02.03")`,
      )
    }
    return {
      stage: parsed[0]!,
      batch: parsed[1]!,
      thread: parsed[2]!,
      task: parsed[3]!,
    }
  }

  throw new Error(
    `Invalid task ID format: ${taskId}. Expected "stage.batch.thread.task" (e.g., "01.00.02.03")`,
  )
}

/**
 * Format task ID from components
 * All components are zero-padded to 2 digits for consistent sorting
 */
export function formatTaskId(
  stage: number,
  batch: number,
  thread: number,
  task: number,
): string {
  const stageStr = stage.toString().padStart(2, "0")
  const batchStr = batch.toString().padStart(2, "0")
  const threadStr = thread.toString().padStart(2, "0")
  const taskStr = task.toString().padStart(2, "0")
  return `${stageStr}.${batchStr}.${threadStr}.${taskStr}`
}

/**
 * Delete a single task by ID
 * Returns the deleted task, or null if not found
 */
export function deleteTask(
  repoRoot: string,
  streamId: string,
  taskId: string,
): Task | null {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return null

  const taskIndex = tasksFile.tasks.findIndex((t) => t.id === taskId)
  if (taskIndex === -1) return null

  const [deletedTask] = tasksFile.tasks.splice(taskIndex, 1)
  writeTasksFile(repoRoot, streamId, tasksFile)
  return deletedTask!
}

/**
 * Delete all tasks in a stage
 * Returns the deleted tasks
 */
export function deleteTasksByStage(
  repoRoot: string,
  streamId: string,
  stageNumber: number,
): Task[] {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return []

  const stagePrefix = `${stageNumber.toString().padStart(2, "0")}.`
  const deletedTasks: Task[] = []

  tasksFile.tasks = tasksFile.tasks.filter((t) => {
    if (t.id.startsWith(stagePrefix)) {
      deletedTasks.push(t)
      return false
    }
    return true
  })

  if (deletedTasks.length > 0) {
    writeTasksFile(repoRoot, streamId, tasksFile)
  }

  return deletedTasks
}

/**
 * Delete all tasks in a thread
 * Returns the deleted tasks
 */
export function deleteTasksByThread(
  repoRoot: string,
  streamId: string,
  stageNumber: number,
  batchNumber: number,
  threadNumber: number,
): Task[] {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return []

  const batchStr = batchNumber.toString().padStart(2, "0")
  const stageStr = stageNumber.toString().padStart(2, "0")
  const threadPrefix = `${stageStr}.${batchStr}.${threadNumber}.`
  const deletedTasks: Task[] = []

  tasksFile.tasks = tasksFile.tasks.filter((t) => {
    if (t.id.startsWith(threadPrefix)) {
      deletedTasks.push(t)
      return false
    }
    return true
  })

  if (deletedTasks.length > 0) {
    writeTasksFile(repoRoot, streamId, tasksFile)
  }

  return deletedTasks
}

/**
 * Delete all tasks in a batch
 * Returns the deleted tasks
 */
export function deleteTasksByBatch(
  repoRoot: string,
  streamId: string,
  stageNumber: number,
  batchNumber: number,
): Task[] {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return []

  const batchStr = batchNumber.toString().padStart(2, "0")
  const stageStr = stageNumber.toString().padStart(2, "0")
  const batchPrefix = `${stageStr}.${batchStr}.`
  const deletedTasks: Task[] = []

  tasksFile.tasks = tasksFile.tasks.filter((t) => {
    if (t.id.startsWith(batchPrefix)) {
      deletedTasks.push(t)
      return false
    }
    return true
  })

  if (deletedTasks.length > 0) {
    writeTasksFile(repoRoot, streamId, tasksFile)
  }

  return deletedTasks
}

/**
 * Group tasks by stage, batch, and thread
 * Returns a nested structure: { stageName: { batchName: { threadName: Task[] } } }
 */
export function groupTasksByStageAndBatchAndThread(
  tasks: Task[],
): Map<string, Map<string, Map<string, Task[]>>> {
  const grouped = new Map<string, Map<string, Map<string, Task[]>>>()

  for (const task of tasks) {
    // Stage level
    if (!grouped.has(task.stage_name)) {
      grouped.set(task.stage_name, new Map())
    }
    const stageMap = grouped.get(task.stage_name)!

    // Batch level
    const batchName = task.batch_name || "Batch 01"
    if (!stageMap.has(batchName)) {
      stageMap.set(batchName, new Map())
    }
    const batchMap = stageMap.get(batchName)!

    // Thread level
    if (!batchMap.has(task.thread_name)) {
      batchMap.set(task.thread_name, [])
    }
    batchMap.get(task.thread_name)!.push(task)
  }

  // Sort tasks within each thread by ID
  for (const stageMap of grouped.values()) {
    for (const batchMap of stageMap.values()) {
      for (const threadTasks of batchMap.values()) {
        threadTasks.sort((a, b) => {
          const aParts = a.id.split(".").map(Number)
          const bParts = b.id.split(".").map(Number)
          for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aVal = aParts[i] ?? 0
            const bVal = bParts[i] ?? 0
            if (aVal !== bVal) return aVal - bVal
          }
          return 0
        })
      }
    }
  }

  return grouped
}
