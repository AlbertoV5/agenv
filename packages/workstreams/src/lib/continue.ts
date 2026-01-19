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
}

export function getContinueContext(
  repoRoot: string,
  streamId: string,
  streamName: string
): ContinueContext {
  const tasks = getTasks(repoRoot, streamId)

  return {
    activeTask: tasks.find((t) => t.status === "in_progress"),
    nextTask: tasks.find((t) => t.status === "pending"),
    lastCompletedTask: [...tasks].reverse().find((t) => t.status === "completed"),
    streamId,
    streamName,
  }
}
