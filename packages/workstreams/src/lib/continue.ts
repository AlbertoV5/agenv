/**
 * Logic for the 'continue' command
 */

import { getTasks } from "./tasks.ts"
import { getThreads } from "./threads.ts"
import type { Task, ThreadMetadata } from "./types.ts"

export interface ContinueContext {
  activeThread?: ThreadMetadata
  nextThread?: ThreadMetadata
  lastCompletedThread?: ThreadMetadata
  /** @deprecated Use activeThread */
  activeTask?: Task
  /** @deprecated Use nextThread */
  nextTask?: Task
  /** @deprecated Use lastCompletedThread */
  lastCompletedTask?: Task
  streamId: string
  streamName: string
  assignedAgent?: string
}

function toTaskCompat(thread: ThreadMetadata): Task {
  const now = new Date().toISOString()
  return {
    id: `${thread.threadId}.01`,
    name: thread.threadName || thread.threadId,
    thread_name: thread.threadName || thread.threadId,
    batch_name: thread.batchName || "",
    stage_name: thread.stageName || "",
    created_at: thread.createdAt || now,
    updated_at: thread.updatedAt || now,
    status: thread.status || "pending",
    breadcrumb: thread.breadcrumb,
    report: thread.report,
    assigned_agent: thread.assignedAgent,
    sessions: thread.sessions,
    currentSessionId: thread.currentSessionId,
  }
}

export function getContinueContext(
  repoRoot: string,
  streamId: string,
  streamName: string,
): ContinueContext {
  const threads = getThreads(repoRoot, streamId)

  if (threads.length > 0) {
    const activeThread = threads.find((t) => t.status === "in_progress")
    const nextThread = threads.find((t) => t.status === "pending")
    const lastCompletedThread = [...threads]
      .reverse()
      .find((t) => t.status === "completed")

    const targetThread = activeThread || nextThread

    return {
      activeThread,
      nextThread,
      lastCompletedThread,
      activeTask: activeThread ? toTaskCompat(activeThread) : undefined,
      nextTask: nextThread ? toTaskCompat(nextThread) : undefined,
      lastCompletedTask: lastCompletedThread ? toTaskCompat(lastCompletedThread) : undefined,
      streamId,
      streamName,
      assignedAgent: targetThread?.assignedAgent,
    }
  }

  const tasks = getTasks(repoRoot, streamId)
  const activeTask = tasks.find((t) => t.status === "in_progress")
  const nextTask = tasks.find((t) => t.status === "pending")

  // Get assigned agent directly from task
  const targetTask = activeTask || nextTask
  const assignedAgent = targetTask?.assigned_agent || undefined

  return {
    activeThread: undefined,
    nextThread: undefined,
    lastCompletedThread: undefined,
    activeTask,
    nextTask,
    lastCompletedTask: [...tasks]
      .reverse()
      .find((t) => t.status === "completed"),
    streamId,
    streamName,
    assignedAgent,
  }
}
