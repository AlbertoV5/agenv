/**
 * Logic for the 'continue' command
 */

import { getTasks } from "./tasks.ts"
import type { Task } from "./types.ts"

export interface ContinueContext {
  activeTask?: Task
  nextTask?: Task
  lastCompletedTask?: Task
  streamId: string
  streamName: string
  assignedAgent?: string // Agent assigned to active task (from task.assigned_agent)
}

export function getContinueContext(
  repoRoot: string,
  streamId: string,
  streamName: string,
): ContinueContext {
  const tasks = getTasks(repoRoot, streamId)
  const activeTask = tasks.find((t) => t.status === "in_progress")
  const nextTask = tasks.find((t) => t.status === "pending")

  // Get assigned agent directly from task
  const targetTask = activeTask || nextTask
  const assignedAgent = targetTask?.assigned_agent || undefined

  return {
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
