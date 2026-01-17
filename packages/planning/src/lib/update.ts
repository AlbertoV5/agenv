/**
 * Task update operations
 */

import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import type { TaskStatus, PlanMetadata } from "./types.ts"
import { getPlansDir } from "./repo.ts"
import { statusToCheckbox, getDateString } from "./utils.ts"

export interface UpdateTaskArgs {
  repoRoot: string
  plan: PlanMetadata
  taskId: string
  status: TaskStatus
  note?: string
}

export interface UpdateTaskResult {
  updated: boolean
  file: string
  lineNumber?: number
  taskId: string
  status: TaskStatus
  note?: string
}

/**
 * Parse task ID into components
 * Short plans: "1.2" = taskGroup 1, subtask 2
 * Medium/Long: "2.1.3" = stage 2, taskGroup 1, subtask 3
 */
export function parseTaskId(taskId: string): {
  stage?: number
  taskGroup: number
  subtask: number
} {
  const parts = taskId.split(".").map((p) => parseInt(p, 10))

  if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
    return { taskGroup: parts[0], subtask: parts[1] }
  } else if (
    parts.length === 3 &&
    parts[0] !== undefined &&
    parts[1] !== undefined &&
    parts[2] !== undefined
  ) {
    return { stage: parts[0], taskGroup: parts[1], subtask: parts[2] }
  }

  throw new Error(
    `Invalid task ID format: ${taskId}. Expected "1.2" or "2.1.3"`
  )
}

/**
 * Find and update a task in markdown content
 */
function updateTaskInContent(
  content: string,
  taskGroup: number,
  subtask: number,
  newStatus: TaskStatus,
  stageNumber?: number
): { updated: boolean; content: string; lineNumber?: number } {
  const lines = content.split("\n")
  let currentTaskGroup = 0
  let subtaskCounter = 0
  let inCorrectStage = stageNumber === undefined

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Check for stage header (for medium plans with inline stages)
    if (stageNumber !== undefined) {
      const stageMatch = line.match(/^##\s+Stage\s+(\d+)/)
      if (stageMatch?.[1]) {
        const foundStage = parseInt(stageMatch[1], 10)
        inCorrectStage = foundStage === stageNumber
        if (inCorrectStage) {
          currentTaskGroup = 0
          subtaskCounter = 0
        }
        continue
      }
    }

    // Detect task group headers
    if (
      line.match(/^###\s+.*Task Group\s+(\d+)/i) ||
      line.match(/^###\s+Stage\s+\d+\s*-\s*Task Group\s+(\d+)/i)
    ) {
      const match = line.match(/Task Group\s+(\d+)/i)
      if (match?.[1]) {
        currentTaskGroup = parseInt(match[1], 10)
        subtaskCounter = 0
      }
      continue
    }

    // Only process if we're in correct stage (for staged plans)
    if (!inCorrectStage) continue

    // Check for task line
    if (line.match(/^\s*-\s*\[[ xX~!-]\]/) && currentTaskGroup === taskGroup) {
      subtaskCounter++

      if (subtaskCounter === subtask) {
        // Found the task - update it
        const newCheckbox = statusToCheckbox(newStatus)
        const updatedLine = line.replace(/\[[ xX~!-]\]/, newCheckbox)
        lines[i] = updatedLine

        return {
          updated: true,
          content: lines.join("\n"),
          lineNumber: i + 1,
        }
      }
    }
  }

  return { updated: false, content }
}

/**
 * Add or update notes section for a task group
 */
function addNoteToContent(
  content: string,
  taskGroup: number,
  note: string,
  stageNumber?: number
): string {
  const lines = content.split("\n")
  let currentTaskGroup = 0
  let inCorrectStage = stageNumber === undefined
  let notesLineIndex = -1
  let insertAfterLine = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Check for stage header
    if (stageNumber !== undefined) {
      const stageMatch = line.match(/^##\s+Stage\s+(\d+)/)
      if (stageMatch?.[1]) {
        const foundStage = parseInt(stageMatch[1], 10)
        inCorrectStage = foundStage === stageNumber
        continue
      }
    }

    // Detect task group headers
    if (
      line.match(/^###\s+.*Task Group\s+(\d+)/i) ||
      line.match(/^###\s+Stage\s+\d+\s*-\s*Task Group\s+(\d+)/i)
    ) {
      const match = line.match(/Task Group\s+(\d+)/i)
      if (match?.[1]) {
        // Save insert position for previous task group if we were tracking it
        if (
          inCorrectStage &&
          currentTaskGroup === taskGroup &&
          insertAfterLine > 0
        ) {
          break
        }
        currentTaskGroup = parseInt(match[1], 10)
        notesLineIndex = -1
      }
      continue
    }

    if (!inCorrectStage || currentTaskGroup !== taskGroup) continue

    // Track the last task line
    if (line.match(/^\s*-\s*\[[ xX~!-]\]/)) {
      insertAfterLine = i
    }

    // Check for existing Notes section
    if (line.match(/^\*\*Notes:\*\*/)) {
      notesLineIndex = i
    }
  }

  // If we found a Notes section, add to it
  if (notesLineIndex > 0) {
    // Find the end of notes section (next section or end of content)
    let insertAt = notesLineIndex + 1
    while (insertAt < lines.length) {
      const checkLine = lines[insertAt]
      if (checkLine?.match(/^(###|##|-\s*\[)/)) break
      insertAt++
    }
    // Insert before the next section
    lines.splice(insertAt, 0, `- ${note}`)
  } else if (insertAfterLine > 0) {
    // Create new Notes section after the last task
    lines.splice(insertAfterLine + 1, 0, "", "**Notes:**", "", `- ${note}`)
  }

  return lines.join("\n")
}

/**
 * Update last updated timestamp
 */
function updateTimestamp(content: string): string {
  const today = getDateString()
  return content.replace(/\*Last updated:.*\*/, `*Last updated: ${today}*`)
}

/**
 * Update a task's status in a plan
 */
export function updateTask(args: UpdateTaskArgs): UpdateTaskResult {
  const plansDir = getPlansDir(args.repoRoot)
  const taskParts = parseTaskId(args.taskId)
  const planDir = join(plansDir, args.plan.id)
  const checklistPath = join(planDir, "checklist")

  let targetFile: string
  let stageNumber: number | undefined

  if (args.plan.size === "short") {
    targetFile = join(checklistPath, "INDEX.md")
  } else if (args.plan.size === "medium") {
    targetFile = join(checklistPath, "INDEX.md")
    stageNumber = taskParts.stage
  } else {
    // Long plan - check if stage specified
    if (taskParts.stage !== undefined) {
      targetFile = join(checklistPath, `STAGE_${taskParts.stage}.md`)
      stageNumber = undefined // Stage file already scoped
    } else {
      throw new Error(
        "Long plans require stage number in task ID (e.g., 2.1.3)"
      )
    }
  }

  if (!existsSync(targetFile)) {
    throw new Error(`Checklist file not found: ${targetFile}`)
  }

  let content = readFileSync(targetFile, "utf-8")

  // Update task status
  const result = updateTaskInContent(
    content,
    taskParts.taskGroup,
    taskParts.subtask,
    args.status,
    stageNumber
  )

  if (!result.updated) {
    throw new Error(`Task ${args.taskId} not found in ${targetFile}`)
  }

  content = result.content

  // Add note if provided
  if (args.note) {
    content = addNoteToContent(
      content,
      taskParts.taskGroup,
      args.note,
      stageNumber
    )
  }

  // Update timestamp
  content = updateTimestamp(content)

  // Write back
  writeFileSync(targetFile, content)

  return {
    updated: true,
    file: targetFile,
    lineNumber: result.lineNumber,
    taskId: args.taskId,
    status: args.status,
    note: args.note,
  }
}
