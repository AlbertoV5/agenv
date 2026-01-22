/**
 * tasks.json read/write operations
 *
 * This module handles all operations on the tasks.json file which stores
 * task tracking information in JSON format.
 */

import { existsSync, readFileSync } from "fs"
import { join } from "path"
import * as lockfile from "proper-lockfile"
import type { Task, TasksFile, TaskStatus, SessionRecord, SessionStatus } from "./types.ts"
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

// ============================================
// SESSION VALIDATION & MIGRATION
// ============================================

const VALID_SESSION_STATUSES: SessionStatus[] = ["running", "completed", "failed", "interrupted"]

/**
 * Validation error for session-related fields
 */
export interface SessionValidationError {
  taskId: string
  field: string
  message: string
}

/**
 * Validate a SessionRecord structure
 * Returns an array of validation errors (empty if valid)
 */
export function validateSessionRecord(
  session: unknown,
  taskId: string,
): SessionValidationError[] {
  const errors: SessionValidationError[] = []

  if (!session || typeof session !== "object") {
    errors.push({
      taskId,
      field: "session",
      message: "Session must be an object",
    })
    return errors
  }

  const s = session as Record<string, unknown>

  // Required fields
  if (typeof s.sessionId !== "string" || !s.sessionId) {
    errors.push({
      taskId,
      field: "sessionId",
      message: "sessionId is required and must be a non-empty string",
    })
  }

  if (typeof s.agentName !== "string" || !s.agentName) {
    errors.push({
      taskId,
      field: "agentName",
      message: "agentName is required and must be a non-empty string",
    })
  }

  if (typeof s.model !== "string" || !s.model) {
    errors.push({
      taskId,
      field: "model",
      message: "model is required and must be a non-empty string",
    })
  }

  if (typeof s.startedAt !== "string" || !s.startedAt) {
    errors.push({
      taskId,
      field: "startedAt",
      message: "startedAt is required and must be an ISO date string",
    })
  } else if (isNaN(Date.parse(s.startedAt as string))) {
    errors.push({
      taskId,
      field: "startedAt",
      message: "startedAt must be a valid ISO date string",
    })
  }

  if (typeof s.status !== "string" || !VALID_SESSION_STATUSES.includes(s.status as SessionStatus)) {
    errors.push({
      taskId,
      field: "status",
      message: `status must be one of: ${VALID_SESSION_STATUSES.join(", ")}`,
    })
  }

  // Optional fields validation
  if (s.completedAt !== undefined) {
    if (typeof s.completedAt !== "string") {
      errors.push({
        taskId,
        field: "completedAt",
        message: "completedAt must be a string if provided",
      })
    } else if (isNaN(Date.parse(s.completedAt))) {
      errors.push({
        taskId,
        field: "completedAt",
        message: "completedAt must be a valid ISO date string",
      })
    }
  }

  if (s.exitCode !== undefined && typeof s.exitCode !== "number") {
    errors.push({
      taskId,
      field: "exitCode",
      message: "exitCode must be a number if provided",
    })
  }

  return errors
}

/**
 * Validate task session fields (sessions array and currentSessionId)
 * Returns an array of validation errors (empty if valid)
 */
export function validateTaskSessions(task: Task): SessionValidationError[] {
  const errors: SessionValidationError[] = []

  // sessions is optional, but if present must be an array
  if (task.sessions !== undefined) {
    if (!Array.isArray(task.sessions)) {
      errors.push({
        taskId: task.id,
        field: "sessions",
        message: "sessions must be an array",
      })
    } else {
      // Validate each session record
      for (let i = 0; i < task.sessions.length; i++) {
        const sessionErrors = validateSessionRecord(task.sessions[i], task.id)
        for (const err of sessionErrors) {
          errors.push({
            ...err,
            field: `sessions[${i}].${err.field}`,
          })
        }
      }

      // Validate currentSessionId references a valid session
      if (task.currentSessionId !== undefined) {
        if (typeof task.currentSessionId !== "string") {
          errors.push({
            taskId: task.id,
            field: "currentSessionId",
            message: "currentSessionId must be a string",
          })
        } else {
          const sessionExists = task.sessions.some(
            (s) => s.sessionId === task.currentSessionId
          )
          if (!sessionExists && task.sessions.length > 0) {
            errors.push({
              taskId: task.id,
              field: "currentSessionId",
              message: `currentSessionId '${task.currentSessionId}' does not match any session in sessions array`,
            })
          }
        }
      }
    }
  } else if (task.currentSessionId !== undefined) {
    // currentSessionId without sessions array
    errors.push({
      taskId: task.id,
      field: "currentSessionId",
      message: "currentSessionId is set but sessions array is missing",
    })
  }

  return errors
}

/**
 * Validate all tasks in a TasksFile for session integrity
 * Returns an array of validation errors (empty if all valid)
 */
export function validateTasksFileSessions(tasksFile: TasksFile): SessionValidationError[] {
  const errors: SessionValidationError[] = []

  for (const task of tasksFile.tasks) {
    const taskErrors = validateTaskSessions(task)
    errors.push(...taskErrors)
  }

  return errors
}

/**
 * Migrate a single task to include session fields
 * Adds empty sessions array if not present (for backwards compatibility)
 * Returns the migrated task (does not mutate original)
 */
export function migrateTaskSessions(task: Task): Task {
  // If sessions already exists (even if empty), no migration needed
  if (task.sessions !== undefined) {
    return task
  }

  // Add empty sessions array for new schema compliance
  return {
    ...task,
    sessions: [],
  }
}

/**
 * Migrate all tasks in a TasksFile to include session fields
 * Returns a new TasksFile with migrated tasks (does not mutate original)
 */
export function migrateTasksFileSessions(tasksFile: TasksFile): TasksFile {
  return {
    ...tasksFile,
    tasks: tasksFile.tasks.map(migrateTaskSessions),
  }
}

// ============================================
// SESSION MANAGEMENT FUNCTIONS
// ============================================

/**
 * Generate a unique session ID
 * Format: "ses_{timestamp}_{random}" for human-readability and uniqueness
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36) // Base36 for compactness
  const random = Math.random().toString(36).substring(2, 8)
  return `ses_${timestamp}_${random}`
}

/**
 * Start a new session for a task
 * Creates a SessionRecord with 'running' status and sets it as currentSessionId
 * Returns the created session record, or null if task not found
 */
export function startTaskSession(
  repoRoot: string,
  streamId: string,
  taskId: string,
  agentName: string,
  model: string,
): SessionRecord | null {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return null

  const taskIndex = tasksFile.tasks.findIndex((t) => t.id === taskId)
  if (taskIndex === -1) return null

  const task = tasksFile.tasks[taskIndex]!

  // Create new session record
  const sessionRecord: SessionRecord = {
    sessionId: generateSessionId(),
    agentName,
    model,
    startedAt: new Date().toISOString(),
    status: "running",
  }

  // Initialize sessions array if needed
  if (!task.sessions) {
    task.sessions = []
  }

  // Add session to array and set as current
  task.sessions.push(sessionRecord)
  task.currentSessionId = sessionRecord.sessionId
  task.updated_at = new Date().toISOString()

  writeTasksFile(repoRoot, streamId, tasksFile)
  return sessionRecord
}

/**
 * Complete a session for a task
 * Updates the session status and exit code, clears currentSessionId
 * Returns the updated session record, or null if not found
 */
export function completeTaskSession(
  repoRoot: string,
  streamId: string,
  taskId: string,
  sessionId: string,
  status: SessionStatus,
  exitCode?: number,
): SessionRecord | null {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return null

  const taskIndex = tasksFile.tasks.findIndex((t) => t.id === taskId)
  if (taskIndex === -1) return null

  const task = tasksFile.tasks[taskIndex]!

  if (!task.sessions) return null

  const sessionIndex = task.sessions.findIndex((s) => s.sessionId === sessionId)
  if (sessionIndex === -1) return null

  const session = task.sessions[sessionIndex]!

  // Update session with completion info
  session.status = status
  session.completedAt = new Date().toISOString()
  if (exitCode !== undefined) {
    session.exitCode = exitCode
  }

  // Clear currentSessionId since session is complete
  task.currentSessionId = undefined
  task.updated_at = new Date().toISOString()

  writeTasksFile(repoRoot, streamId, tasksFile)
  return session
}

/**
 * Get the current session for a task
 * Returns the session record if there's an active session, null otherwise
 */
export function getCurrentTaskSession(
  repoRoot: string,
  streamId: string,
  taskId: string,
): SessionRecord | null {
  const task = getTaskById(repoRoot, streamId, taskId)
  if (!task || !task.currentSessionId || !task.sessions) return null

  return task.sessions.find((s) => s.sessionId === task.currentSessionId) || null
}

/**
 * Get all sessions for a task
 * Returns empty array if task not found or has no sessions
 */
export function getTaskSessions(
  repoRoot: string,
  streamId: string,
  taskId: string,
): SessionRecord[] {
  const task = getTaskById(repoRoot, streamId, taskId)
  if (!task || !task.sessions) return []
  return task.sessions
}

// ============================================
// LOCKED SESSION OPERATIONS (for concurrent access)
// ============================================

/**
 * Execute a function with file lock on tasks.json
 * Used for safe concurrent writes from multiple parallel threads
 */
async function withTasksLock<T>(
  tasksPath: string,
  fn: () => T
): Promise<T> {
  const release = await lockfile.lock(tasksPath, {
    retries: { retries: 10, minTimeout: 50, maxTimeout: 500 }
  })
  try {
    return fn()
  } finally {
    await release()
  }
}

/**
 * Start a session for a task with file locking (safe for concurrent access)
 * Use this when multiple threads may write to tasks.json simultaneously
 * 
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param taskId - Task ID (format: "01.02.03.04")
 * @param agentName - Name of the agent running the session
 * @param model - Model being used
 * @param sessionId - Pre-generated session ID (use generateSessionId())
 * @returns The created session record, or null if task not found
 */
export async function startTaskSessionLocked(
  repoRoot: string,
  streamId: string,
  taskId: string,
  agentName: string,
  model: string,
  sessionId: string,
): Promise<SessionRecord | null> {
  const filePath = getTasksFilePath(repoRoot, streamId)
  
  if (!existsSync(filePath)) return null

  return withTasksLock(filePath, () => {
    const tasksFile = readTasksFile(repoRoot, streamId)
    if (!tasksFile) return null

    const taskIndex = tasksFile.tasks.findIndex((t) => t.id === taskId)
    if (taskIndex === -1) return null

    const task = tasksFile.tasks[taskIndex]!

    // Create new session record with provided session ID
    const sessionRecord: SessionRecord = {
      sessionId,
      agentName,
      model,
      startedAt: new Date().toISOString(),
      status: "running",
    }

    // Initialize sessions array if needed
    if (!task.sessions) {
      task.sessions = []
    }

    // Add session to array and set as current
    task.sessions.push(sessionRecord)
    task.currentSessionId = sessionRecord.sessionId
    task.updated_at = new Date().toISOString()

    writeTasksFile(repoRoot, streamId, tasksFile)
    return sessionRecord
  })
}

/**
 * Complete a session for a task with file locking (safe for concurrent access)
 * Use this when multiple threads may write to tasks.json simultaneously
 * 
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param taskId - Task ID (format: "01.02.03.04")
 * @param sessionId - Session ID to complete
 * @param status - Final session status
 * @param exitCode - Optional exit code
 * @returns The updated session record, or null if not found
 */
export async function completeTaskSessionLocked(
  repoRoot: string,
  streamId: string,
  taskId: string,
  sessionId: string,
  status: SessionStatus,
  exitCode?: number,
): Promise<SessionRecord | null> {
  const filePath = getTasksFilePath(repoRoot, streamId)
  
  if (!existsSync(filePath)) return null

  return withTasksLock(filePath, () => {
    const tasksFile = readTasksFile(repoRoot, streamId)
    if (!tasksFile) return null

    const taskIndex = tasksFile.tasks.findIndex((t) => t.id === taskId)
    if (taskIndex === -1) return null

    const task = tasksFile.tasks[taskIndex]!

    if (!task.sessions) return null

    const sessionIndex = task.sessions.findIndex((s) => s.sessionId === sessionId)
    if (sessionIndex === -1) return null

    const session = task.sessions[sessionIndex]!

    // Update session with completion info
    session.status = status
    session.completedAt = new Date().toISOString()
    if (exitCode !== undefined) {
      session.exitCode = exitCode
    }

    // Clear currentSessionId since session is complete
    task.currentSessionId = undefined
    task.updated_at = new Date().toISOString()

    writeTasksFile(repoRoot, streamId, tasksFile)
    return session
  })
}

/**
 * Start sessions for multiple tasks atomically with file locking
 * Use this when spawning parallel threads to record all sessions in one write
 * 
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param sessions - Array of session info to start (taskId + session details)
 * @returns Array of created session records (empty for tasks not found)
 */
export async function startMultipleSessionsLocked(
  repoRoot: string,
  streamId: string,
  sessions: Array<{
    taskId: string
    agentName: string
    model: string
    sessionId: string
  }>,
): Promise<SessionRecord[]> {
  const filePath = getTasksFilePath(repoRoot, streamId)
  
  if (!existsSync(filePath)) return []

  return withTasksLock(filePath, () => {
    const tasksFile = readTasksFile(repoRoot, streamId)
    if (!tasksFile) return []

    const createdSessions: SessionRecord[] = []
    const now = new Date().toISOString()

    for (const sessionInfo of sessions) {
      const taskIndex = tasksFile.tasks.findIndex((t) => t.id === sessionInfo.taskId)
      if (taskIndex === -1) continue

      const task = tasksFile.tasks[taskIndex]!

      // Create new session record
      const sessionRecord: SessionRecord = {
        sessionId: sessionInfo.sessionId,
        agentName: sessionInfo.agentName,
        model: sessionInfo.model,
        startedAt: now,
        status: "running",
      }

      // Initialize sessions array if needed
      if (!task.sessions) {
        task.sessions = []
      }

      // Add session to array and set as current
      task.sessions.push(sessionRecord)
      task.currentSessionId = sessionRecord.sessionId
      task.updated_at = now

      createdSessions.push(sessionRecord)
    }

    if (createdSessions.length > 0) {
      writeTasksFile(repoRoot, streamId, tasksFile)
    }

    return createdSessions
  })
}

/**
 * Complete sessions for multiple tasks atomically with file locking
 * Use this on batch completion to update all session statuses in one write
 * 
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param completions - Array of session completions (sessionId + status + optional exitCode)
 * @returns Array of updated session records
 */
export async function completeMultipleSessionsLocked(
  repoRoot: string,
  streamId: string,
  completions: Array<{
    taskId: string
    sessionId: string
    status: SessionStatus
    exitCode?: number
  }>,
): Promise<SessionRecord[]> {
  const filePath = getTasksFilePath(repoRoot, streamId)
  
  if (!existsSync(filePath)) return []

  return withTasksLock(filePath, () => {
    const tasksFile = readTasksFile(repoRoot, streamId)
    if (!tasksFile) return []

    const updatedSessions: SessionRecord[] = []
    const now = new Date().toISOString()

    for (const completion of completions) {
      const taskIndex = tasksFile.tasks.findIndex((t) => t.id === completion.taskId)
      if (taskIndex === -1) continue

      const task = tasksFile.tasks[taskIndex]!

      if (!task.sessions) continue

      const sessionIndex = task.sessions.findIndex((s) => s.sessionId === completion.sessionId)
      if (sessionIndex === -1) continue

      const session = task.sessions[sessionIndex]!

      // Update session with completion info
      session.status = completion.status
      session.completedAt = now
      if (completion.exitCode !== undefined) {
        session.exitCode = completion.exitCode
      }

      // Clear currentSessionId since session is complete
      task.currentSessionId = undefined
      task.updated_at = now

      updatedSessions.push(session)
    }

    if (updatedSessions.length > 0) {
      writeTasksFile(repoRoot, streamId, tasksFile)
    }

    return updatedSessions
  })
}

/**
 * Read tasks.json from a workstream directory
 * Automatically migrates older tasks to include session fields
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
  const tasksFile = JSON.parse(content) as TasksFile

  // Migrate tasks to include session fields if missing
  return migrateTasksFileSessions(tasksFile)
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
  report?: string
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
  if (opts.report) task.report = opts.report
  if (opts.assigned_agent) task.assigned_agent = opts.assigned_agent

  task.updated_at = new Date().toISOString()

  writeTasksFile(repoRoot, streamId, tasksFile)
  return task
}

/**
 * Add tasks to tasks.json
 * Preserves existing task status and session data if task with same ID exists
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
      // Update existing task but preserve status, timestamps, and session data
      existingTasksMap.set(newTask.id, {
        ...newTask,
        status: existing.status,
        created_at: existing.created_at,
        updated_at: existing.updated_at,
        // Preserve session tracking data
        sessions: existing.sessions,
        currentSessionId: existing.currentSessionId,
      })
    } else {
      // Add new task (migrate to include sessions if needed)
      existingTasksMap.set(newTask.id, migrateTaskSessions(newTask))
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

// ============================================
// THREAD DISCOVERY FROM TASKS.JSON
// ============================================

/**
 * Discovered thread metadata from tasks.json
 * Contains all info needed to spawn thread execution
 */
export interface DiscoveredThread {
  threadId: string // Format: "SS.BB.TT" (e.g., "01.01.02")
  threadNum: number // Thread number within batch
  threadName: string // Thread name from first task
  stageName: string // Stage name from first task
  batchName: string // Batch name from first task
  stageNum: number // Stage number
  batchNum: number // Batch number
  firstTaskId: string // ID of first task in thread (for session tracking)
  assignedAgent?: string // Agent assignment from first task
  githubIssue?: Task["github_issue"] // GitHub issue from first task (if any)
  taskCount: number // Number of tasks in this thread
}

/**
 * Discover threads in a batch from tasks.json
 * Groups tasks by thread ID pattern (SS.BB.TT.*) and extracts metadata from first task
 * 
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param stageNum - Stage number to filter (1-99)
 * @param batchNum - Batch number to filter (1-99)
 * @returns Array of discovered threads sorted by thread number, or null if tasks file not found
 */
export function discoverThreadsInBatch(
  repoRoot: string,
  streamId: string,
  stageNum: number,
  batchNum: number,
): DiscoveredThread[] | null {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return null

  // Build the batch prefix for filtering
  const stageStr = stageNum.toString().padStart(2, "0")
  const batchStr = batchNum.toString().padStart(2, "0")
  const batchPrefix = `${stageStr}.${batchStr}.`

  // Group tasks by thread ID (SS.BB.TT)
  const threadMap = new Map<string, Task[]>()

  for (const task of tasksFile.tasks) {
    if (!task.id.startsWith(batchPrefix)) continue

    try {
      const parsed = parseTaskId(task.id)
      const threadId = formatThreadId(parsed.stage, parsed.batch, parsed.thread)

      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, [])
      }
      threadMap.get(threadId)!.push(task)
    } catch {
      // Skip invalid task IDs
    }
  }

  // Convert to DiscoveredThread array
  const threads: DiscoveredThread[] = []

  for (const [threadId, tasks] of threadMap) {
    // Sort tasks by ID to get first task
    tasks.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    const firstTask = tasks[0]!

    const parsed = parseTaskId(firstTask.id)

    threads.push({
      threadId,
      threadNum: parsed.thread,
      threadName: firstTask.thread_name,
      stageName: firstTask.stage_name,
      batchName: firstTask.batch_name,
      stageNum: parsed.stage,
      batchNum: parsed.batch,
      firstTaskId: firstTask.id,
      assignedAgent: firstTask.assigned_agent,
      githubIssue: firstTask.github_issue,
      taskCount: tasks.length,
    })
  }

  // Sort by thread number
  threads.sort((a, b) => a.threadNum - b.threadNum)

  return threads
}

/**
 * Get batch metadata from tasks.json
 * Returns stage and batch names derived from tasks in the batch
 * 
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID  
 * @param stageNum - Stage number
 * @param batchNum - Batch number
 * @returns Object with stageName and batchName, or null if no tasks found
 */
export function getBatchMetadata(
  repoRoot: string,
  streamId: string,
  stageNum: number,
  batchNum: number,
): { stageName: string; batchName: string } | null {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return null

  const stageStr = stageNum.toString().padStart(2, "0")
  const batchStr = batchNum.toString().padStart(2, "0")
  const batchPrefix = `${stageStr}.${batchStr}.`

  // Find first task in batch
  const firstTask = tasksFile.tasks.find((t) => t.id.startsWith(batchPrefix))
  if (!firstTask) return null

  return {
    stageName: firstTask.stage_name,
    batchName: firstTask.batch_name,
  }
}


/**
 * Set GitHub metadata for a task
 */
export function setTaskGitHubMeta(
  repoRoot: string,
  streamId: string,
  taskId: string,
  meta: NonNullable<Task["github_issue"]>,
): Task | null {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return null

  const taskIndex = tasksFile.tasks.findIndex((t) => t.id === taskId)
  if (taskIndex === -1) return null

  const task = tasksFile.tasks[taskIndex]!
  task.github_issue = meta
  task.updated_at = new Date().toISOString()

  writeTasksFile(repoRoot, streamId, tasksFile)
  return task
}

/**
 * Parse a task ID into components
 */
export function parseTaskId(taskId: string): {
  stage: number
  batch: number
  thread: number
  task: number
} {
  const parts = taskId.split(".")
  if (parts.length === 4) {
    const parsed = parts.map((p) => parseInt(p, 10))
    if (parsed.every((n) => !isNaN(n))) {
      return {
        stage: parsed[0]!,
        batch: parsed[1]!,
        thread: parsed[2]!,
        task: parsed[3]!,
      }
    }
  }

  throw new Error(
    `Invalid task ID format: ${taskId}. Expected "stage.batch.thread.task" (e.g., "01.01.02.03")`,
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
 * Parse a thread ID into components
 * Thread ID format: "stage.batch.thread" (e.g., "01.01.02")
 */
export function parseThreadId(threadId: string): {
  stage: number
  batch: number
  thread: number
} {
  const parts = threadId.split(".")
  if (parts.length === 3) {
    const parsed = parts.map((p) => parseInt(p, 10))
    if (parsed.every((n) => !isNaN(n))) {
      return {
        stage: parsed[0]!,
        batch: parsed[1]!,
        thread: parsed[2]!,
      }
    }
  }

  throw new Error(
    `Invalid thread ID format: ${threadId}. Expected "stage.batch.thread" (e.g., "01.01.02")`,
  )
}

/**
 * Format thread ID from components
 * All components are zero-padded to 2 digits for consistent sorting
 */
export function formatThreadId(
  stage: number,
  batch: number,
  thread: number,
): string {
  const stageStr = stage.toString().padStart(2, "0")
  const batchStr = batch.toString().padStart(2, "0")
  const threadStr = thread.toString().padStart(2, "0")
  return `${stageStr}.${batchStr}.${threadStr}`
}

/**
 * Get all tasks in a thread
 */
export function getTasksByThread(
  repoRoot: string,
  streamId: string,
  stageNumber: number,
  batchNumber: number,
  threadNumber: number,
): Task[] {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return []

  const stageStr = stageNumber.toString().padStart(2, "0")
  const batchStr = batchNumber.toString().padStart(2, "0")
  const threadStr = threadNumber.toString().padStart(2, "0")
  const threadPrefix = `${stageStr}.${batchStr}.${threadStr}.`

  return tasksFile.tasks.filter((t) => t.id.startsWith(threadPrefix))
}

/**
 * Update all tasks in a thread
 * Returns the updated tasks
 */
export function updateTasksByThread(
  repoRoot: string,
  streamId: string,
  stageNumber: number,
  batchNumber: number,
  threadNumber: number,
  options: TaskUpdateOptions,
): Task[] {
  const tasksFile = readTasksFile(repoRoot, streamId)
  if (!tasksFile) return []

  const stageStr = stageNumber.toString().padStart(2, "0")
  const batchStr = batchNumber.toString().padStart(2, "0")
  const threadStr = threadNumber.toString().padStart(2, "0")
  const threadPrefix = `${stageStr}.${batchStr}.${threadStr}.`

  const updatedTasks: Task[] = []
  const now = new Date().toISOString()

  for (const task of tasksFile.tasks) {
    if (task.id.startsWith(threadPrefix)) {
      if (options.status) task.status = options.status
      if (options.breadcrumb) task.breadcrumb = options.breadcrumb
      if (options.report) task.report = options.report
      if (options.assigned_agent) task.assigned_agent = options.assigned_agent
      task.updated_at = now
      updatedTasks.push(task)
    }
  }

  if (updatedTasks.length > 0) {
    writeTasksFile(repoRoot, streamId, tasksFile)
  }

  return updatedTasks
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
