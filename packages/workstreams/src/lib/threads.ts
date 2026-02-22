/**
 * threads.json read/write operations
 *
 * This module handles all operations on the threads.json file which stores
 * thread-level metadata including session history and GitHub issue links.
 * This data is separated from tasks.json to keep task definitions clean.
 */

import { copyFileSync, existsSync, readFileSync, renameSync, unlinkSync } from "fs"
import { join } from "path"
import * as lockfile from "proper-lockfile"
import type {
  ThreadMetadata,
  ThreadsJson,
  SessionRecord,
  TasksFile,
  DiscoveredThread,
  ThreadStatus,
} from "./types.ts"
import type { ThreadSynthesis } from "./synthesis/types.ts"
import { atomicWriteFile } from "./index.ts"
import { getWorkDir } from "./repo.ts"
import { parseStreamDocument } from "./stream-parser.ts"

const THREADS_FILE_VERSION = "1.0.0"

type ThreadMetadataPatch = Partial<Omit<ThreadMetadata, "threadId">>

function parseThreadId(threadId: string): { stage: number; batch: number; thread: number } | null {
  const parts = threadId.split(".")
  if (parts.length !== 3) return null
  const parsed = parts.map((part) => Number.parseInt(part, 10))
  const stage = parsed[0]
  const batch = parsed[1]
  const thread = parsed[2]
  if (stage === undefined || batch === undefined || thread === undefined) return null
  if ([stage, batch, thread].some((n) => Number.isNaN(n))) return null
  return { stage, batch, thread }
}

function createDefaultThreadMetadata(
  threadId: string,
  data: ThreadMetadataPatch = {},
): ThreadMetadata {
  const now = new Date().toISOString()
  return {
    threadId,
    threadName: data.threadName || threadId,
    stageName: data.stageName || "",
    batchName: data.batchName || "",
    status: data.status || "pending",
    sessions: data.sessions || [],
    ...data,
    createdAt: data.createdAt || now,
    updatedAt: now,
  }
}

/**
 * Get the path to threads.json for a workstream
 */
export function getThreadsFilePath(repoRoot: string, streamId: string): string {
  const workDir = getWorkDir(repoRoot)
  return join(workDir, streamId, "threads.json")
}

/**
 * Create an empty threads.json structure
 */
export function createEmptyThreadsFile(streamId: string): ThreadsJson {
  return {
    version: THREADS_FILE_VERSION,
    stream_id: streamId,
    last_updated: new Date().toISOString(),
    threads: [],
  }
}

// ============================================
// BASIC READ/WRITE OPERATIONS
// ============================================

/**
 * Read threads.json from a workstream directory
 * Returns null if file doesn't exist
 */
export function loadThreads(
  repoRoot: string,
  streamId: string,
): ThreadsJson | null {
  const filePath = getThreadsFilePath(repoRoot, streamId)

  if (!existsSync(filePath)) {
    return null
  }

  const content = readFileSync(filePath, "utf-8")
  return JSON.parse(content) as ThreadsJson
}

/**
 * Write threads.json to a workstream directory
 */
export function saveThreads(
  repoRoot: string,
  streamId: string,
  threadsFile: ThreadsJson,
): void {
  const filePath = getThreadsFilePath(repoRoot, streamId)
  threadsFile.last_updated = new Date().toISOString()
  atomicWriteFile(filePath, JSON.stringify(threadsFile, null, 2))
}

// ============================================
// THREAD METADATA CRUD OPERATIONS
// ============================================

/**
 * Get metadata for a specific thread
 * Returns null if thread not found
 */
export function getThreadMetadata(
  repoRoot: string,
  streamId: string,
  threadId: string,
): ThreadMetadata | null {
  const threadsFile = loadThreads(repoRoot, streamId)
  if (!threadsFile) return null

  return threadsFile.threads.find((t) => t.threadId === threadId) || null
}

/**
 * Update metadata for a specific thread
 * Creates the thread if it doesn't exist
 * Returns the updated thread metadata
 */
export function updateThreadMetadata(
  repoRoot: string,
  streamId: string,
  threadId: string,
  data: ThreadMetadataPatch,
): ThreadMetadata {
  let threadsFile = loadThreads(repoRoot, streamId)

  if (!threadsFile) {
    threadsFile = createEmptyThreadsFile(streamId)
  }

  const threadIndex = threadsFile.threads.findIndex((t) => t.threadId === threadId)

  if (threadIndex === -1) {
    const newThread: ThreadMetadata = createDefaultThreadMetadata(threadId, data)
    threadsFile.threads.push(newThread)
    saveThreads(repoRoot, streamId, threadsFile)
    return newThread
  }

  // Update existing thread
  const thread = threadsFile.threads[threadIndex]!
  Object.assign(thread, data)
  thread.updatedAt = new Date().toISOString()
  if (!thread.createdAt) {
    thread.createdAt = thread.updatedAt
  }
  if (!thread.status) thread.status = "pending"
  if (!thread.threadName) thread.threadName = thread.threadId
  if (!thread.stageName) thread.stageName = ""
  if (!thread.batchName) thread.batchName = ""
  if (!thread.sessions) thread.sessions = []

  saveThreads(repoRoot, streamId, threadsFile)
  return thread
}

/**
 * Delete thread metadata
 * Returns true if thread was deleted, false if not found
 */
export function deleteThreadMetadata(
  repoRoot: string,
  streamId: string,
  threadId: string,
): boolean {
  const threadsFile = loadThreads(repoRoot, streamId)
  if (!threadsFile) return false

  const threadIndex = threadsFile.threads.findIndex((t) => t.threadId === threadId)
  if (threadIndex === -1) return false

  threadsFile.threads.splice(threadIndex, 1)
  saveThreads(repoRoot, streamId, threadsFile)
  return true
}

/**
 * Get all thread metadata for a workstream
 */
export function getAllThreadMetadata(
  repoRoot: string,
  streamId: string,
): ThreadMetadata[] {
  const threadsFile = loadThreads(repoRoot, streamId)
  if (!threadsFile) return []
  return threadsFile.threads
}

export interface ThreadUpdateOptions {
  status?: ThreadStatus
  breadcrumb?: string
  report?: string
  assignedAgent?: string
}

export function getThreads(
  repoRoot: string,
  streamId: string,
  status?: ThreadStatus,
): ThreadMetadata[] {
  const all = getAllThreadMetadata(repoRoot, streamId)
  if (!status) return all
  return all.filter((thread) => thread.status === status)
}

export function updateThreadStatus(
  repoRoot: string,
  streamId: string,
  threadId: string,
  optionsOrStatus: ThreadUpdateOptions | ThreadStatus,
  legacyBreadcrumb?: string,
): ThreadMetadata | null {
  const existing = getThreadMetadata(repoRoot, streamId, threadId)
  if (!existing) return null

  const options =
    typeof optionsOrStatus === "string"
      ? { status: optionsOrStatus, breadcrumb: legacyBreadcrumb }
      : optionsOrStatus

  return updateThreadMetadata(repoRoot, streamId, threadId, {
    ...(options.status ? { status: options.status } : {}),
    ...(options.breadcrumb ? { breadcrumb: options.breadcrumb } : {}),
    ...(options.report ? { report: options.report } : {}),
    ...(options.assignedAgent ? { assignedAgent: options.assignedAgent } : {}),
  })
}

export async function updateThreadStatusLocked(
  repoRoot: string,
  streamId: string,
  threadId: string,
  options: ThreadUpdateOptions,
): Promise<ThreadMetadata | null> {
  const filePath = getThreadsFilePath(repoRoot, streamId)
  return withThreadsLock(filePath, () => updateThreadStatus(repoRoot, streamId, threadId, options))
}

export function getThreadCounts(
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
  const threads = getThreads(repoRoot, streamId)
  return {
    total: threads.length,
    pending: threads.filter((t) => t.status === "pending").length,
    in_progress: threads.filter((t) => t.status === "in_progress").length,
    completed: threads.filter((t) => t.status === "completed").length,
    blocked: threads.filter((t) => t.status === "blocked").length,
    cancelled: threads.filter((t) => t.status === "cancelled").length,
  }
}

export type GroupedThreadsByStage = Map<string, Map<string, ThreadMetadata[]>>

export function groupThreads(threads: ThreadMetadata[]): GroupedThreadsByStage {
  const grouped = new Map<string, Map<string, ThreadMetadata[]>>()
  for (const thread of threads) {
    const stageName = thread.stageName || "Stage 01"
    const batchName = thread.batchName || "Batch 01"
    if (!grouped.has(stageName)) grouped.set(stageName, new Map())
    const stageMap = grouped.get(stageName)!
    if (!stageMap.has(batchName)) stageMap.set(batchName, [])
    stageMap.get(batchName)!.push(thread)
  }
  return grouped
}

function getPromptRelativePathFromMetadata(
  stageNum: number,
  stageName: string,
  batchNum: number,
  batchName: string,
  threadName: string,
): string {
  const safeStageName = stageName.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()
  const safeBatchName = batchName.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()
  const safeThreadName = threadName.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()
  return join(
    "prompts",
    `${stageNum.toString().padStart(2, "0")}-${safeStageName}`,
    `${batchNum.toString().padStart(2, "0")}-${safeBatchName}`,
    `${safeThreadName}.md`,
  )
}

function discoverThreadsFromPlan(
  repoRoot: string,
  streamId: string,
  stageNum: number,
  batchNum: number,
): DiscoveredThread[] {
  const workDir = getWorkDir(repoRoot)
  const planPath = join(workDir, streamId, "PLAN.md")
  if (!existsSync(planPath)) return []

  const content = readFileSync(planPath, "utf-8")
  const errors: Array<{ message: string }> = []
  const doc = parseStreamDocument(content, errors)
  if (!doc) return []

  const stage = doc.stages.find((s) => s.id === stageNum)
  if (!stage) return []
  const batch = stage.batches.find((b) => b.id === batchNum)
  if (!batch) return []

  return batch.threads
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((thread) => ({
      threadId: `${String(stageNum).padStart(2, "0")}.${String(batchNum).padStart(2, "0")}.${String(
        thread.id,
      ).padStart(2, "0")}`,
      threadNum: thread.id,
      threadName: thread.name,
      stageName: stage.name,
      batchName: batch.name,
      stageNum,
      batchNum,
    }))
}

function discoverThreadsFromLegacyTasks(
  tasksFile: TasksFile,
  stageNum: number,
  batchNum: number,
): DiscoveredThread[] {
  const prefix = `${String(stageNum).padStart(2, "0")}.${String(batchNum).padStart(2, "0")}.`
  const byThread = new Map<string, typeof tasksFile.tasks>()
  for (const task of tasksFile.tasks) {
    if (!task.id.startsWith(prefix)) continue
    const threadId = extractThreadIdFromTaskId(task.id)
    if (!threadId) continue
    if (!byThread.has(threadId)) byThread.set(threadId, [])
    byThread.get(threadId)!.push(task)
  }

  const discovered: DiscoveredThread[] = []
  for (const [threadId, tasks] of byThread) {
    const first = tasks.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))[0]
    if (!first) continue
    const parsed = parseThreadId(threadId)
    if (!parsed) continue
    discovered.push({
      threadId,
      threadNum: parsed.thread,
      threadName: first.thread_name,
      stageName: first.stage_name,
      batchName: first.batch_name,
      stageNum: parsed.stage,
      batchNum: parsed.batch,
      assignedAgent: first.assigned_agent,
    })
  }

  return discovered.sort((a, b) => a.threadNum - b.threadNum)
}

export function discoverThreadsInBatch(
  repoRoot: string,
  streamId: string,
  stageNum: number,
  batchNum: number,
): DiscoveredThread[] | null {
  const stagePrefix = String(stageNum).padStart(2, "0")
  const batchPrefix = String(batchNum).padStart(2, "0")

  const planDiscovered = discoverThreadsFromPlan(repoRoot, streamId, stageNum, batchNum)
  if (planDiscovered.length > 0) {
    const existing = loadThreads(repoRoot, streamId) ?? createEmptyThreadsFile(streamId)
    const existingById = new Map(existing.threads.map((t) => [t.threadId, t]))
    let changed = false

    for (const thread of planDiscovered) {
      const current = existingById.get(thread.threadId)
      const promptPath = getPromptRelativePathFromMetadata(
        thread.stageNum,
        thread.stageName,
        thread.batchNum,
        thread.batchName,
        thread.threadName,
      )

      if (!current) {
        existing.threads.push(
          createDefaultThreadMetadata(thread.threadId, {
            threadName: thread.threadName,
            stageName: thread.stageName,
            batchName: thread.batchName,
            status: "pending",
            promptPath,
          }),
        )
        changed = true
      } else if (!current.threadName || !current.stageName || !current.batchName || !current.promptPath) {
        Object.assign(current, {
          threadName: current.threadName || thread.threadName,
          stageName: current.stageName || thread.stageName,
          batchName: current.batchName || thread.batchName,
          promptPath: current.promptPath || promptPath,
        })
        current.updatedAt = new Date().toISOString()
        changed = true
      }
    }

    if (changed) {
      existing.threads.sort((a, b) => a.threadId.localeCompare(b.threadId, undefined, { numeric: true }))
      saveThreads(repoRoot, streamId, existing)
    }

    return planDiscovered
  }

  const threadsFile = loadThreads(repoRoot, streamId)
  if (threadsFile && threadsFile.threads.length > 0) {
    const discovered: DiscoveredThread[] = []
    for (const thread of threadsFile.threads) {
      if (!thread.threadId.startsWith(`${stagePrefix}.${batchPrefix}.`)) continue
      const parsed = parseThreadId(thread.threadId)
      if (!parsed) continue
      discovered.push({
        threadId: thread.threadId,
        threadNum: parsed.thread,
        threadName: thread.threadName || thread.threadId,
        stageName: thread.stageName || `Stage ${stagePrefix}`,
        batchName: thread.batchName || `Batch ${batchPrefix}`,
        stageNum: parsed.stage,
        batchNum: parsed.batch,
        assignedAgent: thread.assignedAgent,
      })
    }
    discovered.sort((a, b) => a.threadNum - b.threadNum)
    if (discovered.length > 0) return discovered
  }

  const tasksPath = join(getWorkDir(repoRoot), streamId, "tasks.json")
  if (!existsSync(tasksPath)) return null
  const tasksFile = JSON.parse(readFileSync(tasksPath, "utf-8")) as TasksFile
  return discoverThreadsFromLegacyTasks(tasksFile, stageNum, batchNum)
}

// ============================================
// FILE LOCKING FOR CONCURRENT ACCESS
// ============================================

/**
 * Execute a function with file lock on threads.json
 * Used for safe concurrent writes from multiple parallel threads
 */
async function withThreadsLock<T>(
  threadsPath: string,
  fn: () => T
): Promise<T> {
  // Create empty file if it doesn't exist (lockfile requires file to exist)
  if (!existsSync(threadsPath)) {
    atomicWriteFile(threadsPath, JSON.stringify(createEmptyThreadsFile(""), null, 2))
  }

  const release = await lockfile.lock(threadsPath, {
    retries: { retries: 10, minTimeout: 50, maxTimeout: 500 }
  })
  try {
    return fn()
  } finally {
    await release()
  }
}

/**
 * Update thread metadata with file locking (safe for concurrent access)
 */
export async function updateThreadMetadataLocked(
  repoRoot: string,
  streamId: string,
  threadId: string,
  data: ThreadMetadataPatch,
): Promise<ThreadMetadata> {
  const filePath = getThreadsFilePath(repoRoot, streamId)

  return withThreadsLock(filePath, () => {
    return updateThreadMetadata(repoRoot, streamId, threadId, data)
  })
}

/**
 * Atomic read-modify-write operation on threads.json with file locking
 */
export async function modifyThreads<T>(
  repoRoot: string,
  streamId: string,
  fn: (threadsFile: ThreadsJson) => T
): Promise<T> {
  const filePath = getThreadsFilePath(repoRoot, streamId)

  return withThreadsLock(filePath, () => {
    let threadsFile = loadThreads(repoRoot, streamId)
    if (!threadsFile) {
      threadsFile = createEmptyThreadsFile(streamId)
    }
    const result = fn(threadsFile)
    saveThreads(repoRoot, streamId, threadsFile)
    return result
  })
}

// ============================================
// SESSION MANAGEMENT ON THREADS
// ============================================

/**
 * Start a new session for a thread
 * Creates a SessionRecord with 'running' status and sets it as currentSessionId
 */
export function startThreadSession(
  repoRoot: string,
  streamId: string,
  threadId: string,
  agentName: string,
  model: string,
  sessionId: string,
): SessionRecord {
  const session: SessionRecord = {
    sessionId,
    agentName,
    model,
    startedAt: new Date().toISOString(),
    status: "running",
  }

  let threadsFile = loadThreads(repoRoot, streamId)
  if (!threadsFile) {
    threadsFile = createEmptyThreadsFile(streamId)
  }

  const threadIndex = threadsFile.threads.findIndex((t) => t.threadId === threadId)

  if (threadIndex === -1) {
    const parsed = parseThreadId(threadId)
    const stageNum = parsed?.stage ?? 0
    const batchNum = parsed?.batch ?? 0
    threadsFile.threads.push(
      createDefaultThreadMetadata(threadId, {
        threadName: `Thread ${String(parsed?.thread ?? 0).padStart(2, "0")}`,
        stageName: `Stage ${String(stageNum).padStart(2, "0")}`,
        batchName: `Batch ${String(batchNum).padStart(2, "0")}`,
        sessions: [session],
        currentSessionId: sessionId,
      }),
    )
  } else {
    // Add session to existing thread
    threadsFile.threads[threadIndex]!.sessions.push(session)
    threadsFile.threads[threadIndex]!.currentSessionId = sessionId
  }

  saveThreads(repoRoot, streamId, threadsFile)
  return session
}

/**
 * Complete a session for a thread
 * Updates the session status and clears currentSessionId
 */
export function completeThreadSession(
  repoRoot: string,
  streamId: string,
  threadId: string,
  sessionId: string,
  status: SessionRecord["status"],
  exitCode?: number,
): SessionRecord | null {
  const threadsFile = loadThreads(repoRoot, streamId)
  if (!threadsFile) return null

  const threadIndex = threadsFile.threads.findIndex((t) => t.threadId === threadId)
  if (threadIndex === -1) return null

  const thread = threadsFile.threads[threadIndex]!
  const sessionIndex = thread.sessions.findIndex((s) => s.sessionId === sessionId)
  if (sessionIndex === -1) return null

  const session = thread.sessions[sessionIndex]!
  session.status = status
  session.completedAt = new Date().toISOString()
  if (exitCode !== undefined) {
    session.exitCode = exitCode
  }

  // Clear currentSessionId
  thread.currentSessionId = undefined

  saveThreads(repoRoot, streamId, threadsFile)
  return session
}

/**
 * Start a session with file locking (safe for concurrent access)
 */
export async function startThreadSessionLocked(
  repoRoot: string,
  streamId: string,
  threadId: string,
  agentName: string,
  model: string,
  sessionId: string,
): Promise<SessionRecord> {
  const filePath = getThreadsFilePath(repoRoot, streamId)

  return withThreadsLock(filePath, () => {
    return startThreadSession(repoRoot, streamId, threadId, agentName, model, sessionId)
  })
}

/**
 * Complete a session with file locking (safe for concurrent access)
 */
export async function completeThreadSessionLocked(
  repoRoot: string,
  streamId: string,
  threadId: string,
  sessionId: string,
  status: SessionRecord["status"],
  exitCode?: number,
): Promise<SessionRecord | null> {
  const filePath = getThreadsFilePath(repoRoot, streamId)

  return withThreadsLock(filePath, () => {
    return completeThreadSession(repoRoot, streamId, threadId, sessionId, status, exitCode)
  })
}

/**
 * Start multiple thread sessions atomically with file locking
 */
export async function startMultipleThreadSessionsLocked(
  repoRoot: string,
  streamId: string,
  sessions: Array<{
    threadId: string
    agentName: string
    model: string
    sessionId: string
  }>,
): Promise<SessionRecord[]> {
  const filePath = getThreadsFilePath(repoRoot, streamId)

  return withThreadsLock(filePath, () => {
    let threadsFile = loadThreads(repoRoot, streamId)
    if (!threadsFile) {
      threadsFile = createEmptyThreadsFile(streamId)
    }

    const createdSessions: SessionRecord[] = []
    const now = new Date().toISOString()

    for (const sessionInfo of sessions) {
      const session: SessionRecord = {
        sessionId: sessionInfo.sessionId,
        agentName: sessionInfo.agentName,
        model: sessionInfo.model,
        startedAt: now,
        status: "running",
      }

      const threadIndex = threadsFile.threads.findIndex(
        (t) => t.threadId === sessionInfo.threadId
      )

      if (threadIndex === -1) {
        const parsed = parseThreadId(sessionInfo.threadId)
        const stageNum = parsed?.stage ?? 0
        const batchNum = parsed?.batch ?? 0
        threadsFile.threads.push(
          createDefaultThreadMetadata(sessionInfo.threadId, {
            threadName: `Thread ${String(parsed?.thread ?? 0).padStart(2, "0")}`,
            stageName: `Stage ${String(stageNum).padStart(2, "0")}`,
            batchName: `Batch ${String(batchNum).padStart(2, "0")}`,
            sessions: [session],
            currentSessionId: sessionInfo.sessionId,
          }),
        )
      } else {
        threadsFile.threads[threadIndex]!.sessions.push(session)
        threadsFile.threads[threadIndex]!.currentSessionId = sessionInfo.sessionId
      }

      createdSessions.push(session)
    }

    saveThreads(repoRoot, streamId, threadsFile)
    return createdSessions
  })
}

/**
 * Complete multiple thread sessions atomically with file locking
 */
export async function completeMultipleThreadSessionsLocked(
  repoRoot: string,
  streamId: string,
  completions: Array<{
    threadId: string
    sessionId: string
    status: SessionRecord["status"]
    exitCode?: number
  }>,
): Promise<SessionRecord[]> {
  const filePath = getThreadsFilePath(repoRoot, streamId)

  return withThreadsLock(filePath, () => {
    const threadsFile = loadThreads(repoRoot, streamId)
    if (!threadsFile) return []

    const updatedSessions: SessionRecord[] = []
    const now = new Date().toISOString()

    for (const completion of completions) {
      const threadIndex = threadsFile.threads.findIndex(
        (t) => t.threadId === completion.threadId
      )
      if (threadIndex === -1) continue

      const thread = threadsFile.threads[threadIndex]!
      const sessionIndex = thread.sessions.findIndex(
        (s) => s.sessionId === completion.sessionId
      )
      if (sessionIndex === -1) continue

      const session = thread.sessions[sessionIndex]!
      session.status = completion.status
      session.completedAt = now
      if (completion.exitCode !== undefined) {
        session.exitCode = completion.exitCode
      }

      thread.currentSessionId = undefined
      updatedSessions.push(session)
    }

    if (updatedSessions.length > 0) {
      saveThreads(repoRoot, streamId, threadsFile)
    }

    return updatedSessions
  })
}

// ============================================
// GITHUB ISSUE MANAGEMENT
// ============================================

/**
 * @deprecated GitHub issue storage has been removed from threads.json.
 * Issues are now stored in github.json per-stage.
 * This function is a no-op kept for backward compatibility.
 */
export function setThreadGitHubIssue(
  _repoRoot: string,
  _streamId: string,
  _threadId: string,
  _issue: { number: number; url: string; state: "open" | "closed" },
): ThreadMetadata | null {
  // No-op: GitHub issues are now stored in github.json per-stage
  return null
}

/**
 * @deprecated GitHub issue storage has been removed from threads.json.
 * Issues are now stored in github.json per-stage.
 * This function returns null for backward compatibility.
 */
export function getThreadGitHubIssue(
  _repoRoot: string,
  _streamId: string,
  _threadId: string,
): null {
  // No-op: GitHub issues are now stored in github.json per-stage
  return null
}

// ============================================
// SYNTHESIS OUTPUT MANAGEMENT
// ============================================

/**
 * Set synthesis output for a thread
 * 
 * Stores the synthesis result from a synthesis agent run.
 * Uses file locking for safe concurrent access.
 * 
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param threadId - Thread ID (e.g., "01.02.03")
 * @param synthesis - The synthesis output to store
 * @returns Promise that resolves when the synthesis is saved
 */
export async function setSynthesisOutput(
  repoRoot: string,
  streamId: string,
  threadId: string,
  synthesis: ThreadSynthesis,
): Promise<void> {
  const filePath = getThreadsFilePath(repoRoot, streamId)

  await withThreadsLock(filePath, () => {
    let threadsFile = loadThreads(repoRoot, streamId)
    if (!threadsFile) {
      threadsFile = createEmptyThreadsFile(streamId)
    }

    const threadIndex = threadsFile.threads.findIndex((t) => t.threadId === threadId)

    if (threadIndex === -1) {
      console.warn(`[threads] setSynthesisOutput: Thread ${threadId} not found in stream ${streamId}`)
      return
    }

    threadsFile.threads[threadIndex]!.synthesis = synthesis
    saveThreads(repoRoot, streamId, threadsFile)
  })
}

/**
 * Get synthesis output for a thread
 * 
 * Retrieves the synthesis result if it exists for the thread.
 * 
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param threadId - Thread ID (e.g., "01.02.03")
 * @returns The synthesis output if found, null otherwise
 */
export function getSynthesisOutput(
  repoRoot: string,
  streamId: string,
  threadId: string,
): ThreadSynthesis | null {
  const thread = getThreadMetadata(repoRoot, streamId, threadId)
  
  if (!thread) {
    console.warn(`[threads] getSynthesisOutput: Thread ${threadId} not found in stream ${streamId}`)
    return null
  }

  return thread.synthesis || null
}

// ============================================
// CONVENIENCE HELPERS
// ============================================

/**
 * Get the last (most recent) session for a thread
 *
 * Sessions are sorted by startedAt timestamp descending,
 * returning the most recently started session.
 *
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param threadId - Thread ID (e.g., "01.02.03")
 * @returns Most recent session record, or null if no sessions exist
 */
export function getLastSessionForThread(
  repoRoot: string,
  streamId: string,
  threadId: string,
): SessionRecord | null {
  const thread = getThreadMetadata(repoRoot, streamId, threadId)
  if (!thread || thread.sessions.length === 0) {
    return null
  }

  // Sort by startedAt descending and return most recent
  const sortedSessions = [...thread.sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  )

  return sortedSessions[0] || null
}

/**
 * Get the opencode session ID for a thread
 *
 * This is the session ID captured from opencode after a multi run,
 * which can be used to resume the session in opencode TUI.
 *
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param threadId - Thread ID (e.g., "01.02.03")
 * @returns Opencode session ID string, or null if not set
 */
export function getOpencodeSessionId(
  repoRoot: string,
  streamId: string,
  threadId: string,
): string | null {
  const thread = getThreadMetadata(repoRoot, streamId, threadId)
  return thread?.opencodeSessionId || null
}

/**
 * Set the working agent session ID for a thread (legacy/backwards compatibility)
 *
 * Note: In post-session synthesis mode, the working agent session is stored
 * as the primary opencodeSessionId since synthesis runs headless. This field
 * is maintained for backwards compatibility with older synthesis mode.
 *
 * This session ID can be used to resume the working agent's session directly.
 *
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param threadId - Thread ID (e.g., "01.02.03")
 * @param sessionId - The working agent's opencode session ID
 * @returns Updated thread metadata object containing the new workingAgentSessionId
 */
export function setWorkingAgentSessionId(
  repoRoot: string,
  streamId: string,
  threadId: string,
  sessionId: string,
): ThreadMetadata {
  return updateThreadMetadata(repoRoot, streamId, threadId, {
    workingAgentSessionId: sessionId,
  })
}

/**
 * Get the working agent session ID for a thread
 *
 * Returns the opencode session ID of the working agent specifically.
 * When synthesis is enabled, this is different from opencodeSessionId
 * (which would be the synthesis agent's session).
 *
 * Use this when available, falling back to `opencodeSessionId`
 * for backwards compatibility.
 *
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param threadId - Thread ID (e.g., "01.02.03")
 * @returns The session ID string if found, or null if the thread has no working agent session
 */
export function getWorkingAgentSessionId(
  repoRoot: string,
  streamId: string,
  threadId: string,
): string | null {
  const thread = getThreadMetadata(repoRoot, streamId, threadId)
  return thread?.workingAgentSessionId || null
}

// ============================================
// MIGRATION UTILITIES
// ============================================

/**
 * Extract thread ID from task ID
 * Task ID format: "SS.BB.TT.NN" -> Thread ID: "SS.BB.TT"
 */
function extractThreadIdFromTaskId(taskId: string): string | null {
  const parts = taskId.split(".")
  if (parts.length !== 4) return null
  return `${parts[0]}.${parts[1]}.${parts[2]}`
}

/**
 * Migration result structure
 */
export interface MigrationResult {
  threadsCreated: number
  sessionsMigrated: number
  errors: string[]
}

export interface MigrateTasksToThreadsOptions {
  archiveTasksJson?: boolean
  removeTasksJson?: boolean
  backupTasksJson?: boolean
}

export interface MigrateTasksToThreadsResult extends MigrationResult {
  migrated: boolean
  tasksJsonFound: boolean
  taskCount: number
  threadsTouched: number
  backupPath?: string
  archivePath?: string
  removedTasksJson: boolean
}

function deriveThreadStatus(taskStatuses: ThreadStatus[]): ThreadStatus {
  if (taskStatuses.length === 0) return "pending"
  if (taskStatuses.every((status) => status === "completed")) return "completed"
  if (taskStatuses.every((status) => status === "cancelled")) return "cancelled"
  if (taskStatuses.includes("blocked")) return "blocked"
  if (taskStatuses.includes("in_progress")) return "in_progress"
  if (taskStatuses.includes("pending")) return "pending"
  if (taskStatuses.includes("cancelled")) return "cancelled"
  return "pending"
}

function mergeReportParts(parts: string[]): string | undefined {
  const unique = Array.from(
    new Set(parts.map((part) => part.trim()).filter((part) => part.length > 0)),
  )
  if (unique.length === 0) return undefined
  return unique.join("\n\n")
}

function migrateTasksDataToThreads(
  repoRoot: string,
  streamId: string,
  tasksFile: TasksFile,
): MigrationResult & { taskCount: number; threadsTouched: number } {
  const result: MigrationResult & { taskCount: number; threadsTouched: number } = {
    threadsCreated: 0,
    sessionsMigrated: 0,
    errors: [],
    taskCount: tasksFile.tasks.length,
    threadsTouched: 0,
  }

  let threadsFile = loadThreads(repoRoot, streamId)
  if (!threadsFile) {
    threadsFile = createEmptyThreadsFile(streamId)
  }

  const threadMap = new Map<string, ThreadMetadata>()
  for (const thread of threadsFile.threads) {
    threadMap.set(thread.threadId, thread)
  }

  const tasksByThread = new Map<string, typeof tasksFile.tasks>()
  for (const task of tasksFile.tasks) {
    const threadId = extractThreadIdFromTaskId(task.id)
    if (!threadId) {
      result.errors.push(`Invalid task ID format: ${task.id}`)
      continue
    }

    if (!tasksByThread.has(threadId)) {
      tasksByThread.set(threadId, [])
    }
    tasksByThread.get(threadId)!.push(task)
  }

  for (const [threadId, tasks] of tasksByThread) {
    let thread = threadMap.get(threadId)
    const seedTask = tasks
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))[0]

    if (!thread) {
      thread = createDefaultThreadMetadata(threadId, {
        threadName: seedTask?.thread_name || threadId,
        stageName: seedTask?.stage_name || "",
        batchName: seedTask?.batch_name || "",
        status: deriveThreadStatus(tasks.map((task) => task.status)),
        sessions: [],
      })
      threadMap.set(threadId, thread)
      result.threadsCreated++
    }

    result.threadsTouched++

    if (!thread.threadName && seedTask?.thread_name) thread.threadName = seedTask.thread_name
    if (!thread.stageName && seedTask?.stage_name) thread.stageName = seedTask.stage_name
    if (!thread.batchName && seedTask?.batch_name) thread.batchName = seedTask.batch_name

    const migratedStatus = deriveThreadStatus(tasks.map((task) => task.status))
    if (!thread.status || thread.status === "pending") {
      thread.status = migratedStatus
    }

    if (!thread.assignedAgent) {
      const assigned = tasks.find((task) => task.assigned_agent)?.assigned_agent
      if (assigned) thread.assignedAgent = assigned
    }

    const mergedReport = mergeReportParts([
      thread.report || "",
      ...tasks.map((task) => task.report || ""),
    ])
    if (mergedReport) thread.report = mergedReport

    if (!thread.breadcrumb) {
      const breadcrumbTask = tasks.find((task) => task.breadcrumb)
      if (breadcrumbTask?.breadcrumb) {
        thread.breadcrumb = breadcrumbTask.breadcrumb
      }
    }

    if (!thread.currentSessionId) {
      const currentSessionTask = tasks.find((task) => task.currentSessionId)
      if (currentSessionTask?.currentSessionId) {
        thread.currentSessionId = currentSessionTask.currentSessionId
      }
    }

    const existingSessionIds = new Set(thread.sessions.map((session) => session.sessionId))
    for (const task of tasks) {
      for (const session of task.sessions || []) {
        if (existingSessionIds.has(session.sessionId)) continue
        thread.sessions.push(session)
        existingSessionIds.add(session.sessionId)
        result.sessionsMigrated++
      }
    }

    thread.updatedAt = new Date().toISOString()
  }

  threadsFile.threads = Array.from(threadMap.values()).sort((a, b) =>
    a.threadId.localeCompare(b.threadId, undefined, { numeric: true }),
  )
  saveThreads(repoRoot, streamId, threadsFile)

  return result
}

export function migrateTasksToThreads(
  repoRoot: string,
  streamId: string,
  options: MigrateTasksToThreadsOptions = {},
): MigrateTasksToThreadsResult {
  const tasksPath = join(getWorkDir(repoRoot), streamId, "tasks.json")
  const backupEnabled = options.backupTasksJson !== false

  if (!existsSync(tasksPath)) {
    return {
      migrated: false,
      tasksJsonFound: false,
      taskCount: 0,
      threadsTouched: 0,
      threadsCreated: 0,
      sessionsMigrated: 0,
      errors: [],
      removedTasksJson: false,
    }
  }

  const tasksFile = JSON.parse(readFileSync(tasksPath, "utf-8")) as TasksFile
  const migration = migrateTasksDataToThreads(repoRoot, streamId, tasksFile)

  const timestamp = new Date().toISOString().replace(/[:]/g, "-")
  let backupPath: string | undefined
  if (backupEnabled) {
    backupPath = `${tasksPath}.bak-${timestamp}`
    copyFileSync(tasksPath, backupPath)
  }

  let archivePath: string | undefined
  let removedTasksJson = false
  if (options.archiveTasksJson) {
    archivePath = `${tasksPath}.archived-${timestamp}`
    renameSync(tasksPath, archivePath)
    removedTasksJson = true
  } else if (options.removeTasksJson) {
    unlinkSync(tasksPath)
    removedTasksJson = true
  }

  return {
    migrated: true,
    tasksJsonFound: true,
    taskCount: migration.taskCount,
    threadsTouched: migration.threadsTouched,
    threadsCreated: migration.threadsCreated,
    sessionsMigrated: migration.sessionsMigrated,
    errors: migration.errors,
    backupPath,
    archivePath,
    removedTasksJson,
  }
}

/**
 * Migrate session and GitHub issue data from tasks.json to threads.json
 * This is a one-time migration utility for transitioning to the new structure.
 * 
 * The migration:
 * 1. Reads tasks.json and extracts sessions and githubIssue from tasks
 * 2. Groups them by thread ID
 * 3. Creates/updates thread entries in threads.json
 * 4. Does NOT modify tasks.json (caller should clean up after verifying migration)
 * 
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @returns Migration result with counts and any errors
 */
export function migrateFromTasksJson(
  repoRoot: string,
  streamId: string,
  tasksFile: TasksFile,
): MigrationResult {
  const migration = migrateTasksDataToThreads(repoRoot, streamId, tasksFile)
  return {
    threadsCreated: migration.threadsCreated,
    sessionsMigrated: migration.sessionsMigrated,
    errors: migration.errors,
  }
}

/**
 * Validate that migration was successful by comparing threads.json with tasks.json
 * Returns a list of discrepancies if any
 */
export function validateMigration(
  repoRoot: string,
  streamId: string,
  tasksFile: TasksFile,
): string[] {
  const issues: string[] = []

  const threadsFile = loadThreads(repoRoot, streamId)
  if (!threadsFile) {
    issues.push("threads.json does not exist")
    return issues
  }

  // Build thread map for quick lookup
  const threadMap = new Map<string, ThreadMetadata>()
  for (const thread of threadsFile.threads) {
    threadMap.set(thread.threadId, thread)
  }

  // Check each task's data is reflected in threads.json
  for (const task of tasksFile.tasks) {
    const threadId = extractThreadIdFromTaskId(task.id)
    if (!threadId) continue

    const thread = threadMap.get(threadId)
    if (!thread) {
      issues.push(`Thread ${threadId} not found in threads.json`)
      continue
    }

    // Check sessions are present
    if (task.sessions) {
      for (const session of task.sessions) {
        const found = thread.sessions.some((s) => s.sessionId === session.sessionId)
        if (!found) {
          issues.push(`Session ${session.sessionId} from task ${task.id} not found in thread ${threadId}`)
        }
      }
    }

    // GitHub issues are now stored in github.json per-stage, not in threads.json
    // Migration validation for github_issue is no longer performed
  }

  return issues
}
