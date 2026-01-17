/**
 * Plan status parsing and progress tracking
 */

import { existsSync, readFileSync } from "fs"
import { join } from "path"
import type {
  PlanMetadata,
  ParsedTask,
  ParsedStage,
  PlanProgress,
  StageStatus,
} from "./types.ts"
import { getPlansDir } from "./repo.ts"
import { parseTaskStatus, parseStageStatus } from "./utils.ts"

/**
 * Parse tasks from checklist markdown content
 */
export function parseTasksFromContent(
  content: string,
  stageNumber?: number
): ParsedTask[] {
  const tasks: ParsedTask[] = []
  const lines = content.split("\n")

  let currentTaskGroup = 0
  let subtaskCounter = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Detect task group headers
    if (line.match(/^###\s+.*Task Group\s+(\d+)/i)) {
      const match = line.match(/Task Group\s+(\d+)/i)
      if (match?.[1]) {
        currentTaskGroup = parseInt(match[1], 10)
        subtaskCounter = 0
      }
      continue
    }

    // Detect stage headers that include task group (for inline stages)
    if (line.match(/^###\s+Stage\s+\d+\s*-\s*Task Group\s+(\d+)/i)) {
      const match = line.match(/Task Group\s+(\d+)/i)
      if (match?.[1]) {
        currentTaskGroup = parseInt(match[1], 10)
        subtaskCounter = 0
      }
      continue
    }

    // Parse task lines
    if (line.match(/^\s*-\s*\[[ xX~!-]\]/)) {
      subtaskCounter++
      const status = parseTaskStatus(line)
      const description = line.replace(/^\s*-\s*\[[ xX~!-]\]\s*/, "").trim()

      const taskId =
        stageNumber !== undefined
          ? `${stageNumber}.${currentTaskGroup}.${subtaskCounter}`
          : `${currentTaskGroup}.${subtaskCounter}`

      tasks.push({
        id: taskId,
        description,
        status,
        stageNumber,
        taskGroupNumber: currentTaskGroup,
        subtaskNumber: subtaskCounter,
        lineNumber: i + 1,
      })
    }
  }

  return tasks
}

/**
 * Parse short plan checklist (single file, no stages)
 */
export function parseShortPlan(checklistPath: string): ParsedStage[] {
  const indexPath = join(checklistPath, "INDEX.md")
  if (!existsSync(indexPath)) return []

  const content = readFileSync(indexPath, "utf-8")
  const tasks = parseTasksFromContent(content)

  // Short plans have a single implicit stage
  const completedCount = tasks.filter((t) => t.status === "completed").length
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length
  const blockedCount = tasks.filter((t) => t.status === "blocked").length

  let status: StageStatus = "pending"
  if (completedCount === tasks.length && tasks.length > 0) {
    status = "complete"
  } else if (inProgressCount > 0 || completedCount > 0) {
    status = "in_progress"
  } else if (blockedCount > 0) {
    status = "blocked"
  }

  return [
    {
      number: 1,
      title: "Implementation",
      status,
      tasks,
      file: "INDEX.md",
    },
  ]
}

/**
 * Parse medium plan checklist (inline stages in single file)
 */
export function parseMediumPlan(checklistPath: string): ParsedStage[] {
  const indexPath = join(checklistPath, "INDEX.md")
  if (!existsSync(indexPath)) return []

  const content = readFileSync(indexPath, "utf-8")
  const lines = content.split("\n")
  const stages: ParsedStage[] = []

  // First pass: extract stage info from overview table
  const stageInfo: Map<number, { title: string; status: StageStatus }> =
    new Map()
  let inTable = false

  for (const line of lines) {
    if (line.includes("| Stage | Title | Status |")) {
      inTable = true
      continue
    }
    if (inTable && line.startsWith("|")) {
      const match = line.match(/\|\s*(\d+)\s*\|([^|]+)\|([^|]+)\|/)
      if (match?.[1] && match[2] && match[3]) {
        const stageNum = parseInt(match[1], 10)
        const title = match[2]
          .trim()
          .replace(/<!--.*-->/, "")
          .trim()
        const status = parseStageStatus(match[3])
        stageInfo.set(stageNum, { title, status })
      }
    } else if (inTable && !line.startsWith("|")) {
      inTable = false
    }
  }

  // Second pass: extract tasks per stage
  let currentStage = 0
  let stageContent = ""

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const stageMatch = line.match(/^##\s+Stage\s+(\d+)/)

    if (stageMatch?.[1]) {
      // Save previous stage if exists
      if (currentStage > 0 && stageContent) {
        const info = stageInfo.get(currentStage) || {
          title: "",
          status: "pending" as StageStatus,
        }
        const tasks = parseTasksFromContent(stageContent, currentStage)
        stages.push({
          number: currentStage,
          title: info.title,
          status: info.status,
          tasks,
          file: "INDEX.md",
        })
      }

      currentStage = parseInt(stageMatch[1], 10)
      stageContent = ""
    } else if (currentStage > 0) {
      stageContent += line + "\n"
    }
  }

  // Don't forget last stage
  if (currentStage > 0 && stageContent) {
    const info = stageInfo.get(currentStage) || {
      title: "",
      status: "pending" as StageStatus,
    }
    const tasks = parseTasksFromContent(stageContent, currentStage)
    stages.push({
      number: currentStage,
      title: info.title,
      status: info.status,
      tasks,
      file: "INDEX.md",
    })
  }

  return stages
}

/**
 * Parse long plan checklist (separate stage files)
 */
export function parseLongPlan(checklistPath: string): ParsedStage[] {
  const indexPath = join(checklistPath, "INDEX.md")
  if (!existsSync(indexPath)) return []

  const indexContent = readFileSync(indexPath, "utf-8")
  const stages: ParsedStage[] = []

  // Extract stage info from index table
  const lines = indexContent.split("\n")
  let inTable = false

  for (const line of lines) {
    if (line.includes("| Stage | File | Title | Status |")) {
      inTable = true
      continue
    }
    if (inTable && line.startsWith("|")) {
      const match = line.match(/\|\s*(\d+)\s*\|[^|]+\|([^|]+)\|([^|]+)\|/)
      if (match?.[1] && match[2] && match[3]) {
        const stageNum = parseInt(match[1], 10)
        const title = match[2]
          .trim()
          .replace(/<!--.*-->/, "")
          .trim()
        const status = parseStageStatus(match[3])

        // Read stage file
        const stageFile = `STAGE_${stageNum}.md`
        const stageFilePath = join(checklistPath, stageFile)

        let tasks: ParsedTask[] = []
        if (existsSync(stageFilePath)) {
          const stageContent = readFileSync(stageFilePath, "utf-8")
          tasks = parseTasksFromContent(stageContent, stageNum)
        }

        stages.push({
          number: stageNum,
          title,
          status,
          tasks,
          file: stageFile,
        })
      }
    } else if (inTable && !line.startsWith("|")) {
      inTable = false
    }
  }

  return stages
}

/**
 * Get progress for a single plan
 */
export function getPlanProgress(
  repoRoot: string,
  plan: PlanMetadata
): PlanProgress {
  const plansDir = getPlansDir(repoRoot)
  const planDir = join(plansDir, plan.id)
  const checklistPath = join(planDir, "checklist")

  let stages: ParsedStage[]

  switch (plan.size) {
    case "short":
      stages = parseShortPlan(checklistPath)
      break
    case "medium":
      stages = parseMediumPlan(checklistPath)
      break
    case "long":
      stages = parseLongPlan(checklistPath)
      break
    default:
      stages = []
  }

  const allTasks = stages.flatMap((s) => s.tasks)
  const completedTasks = allTasks.filter((t) => t.status === "completed").length
  const inProgressTasks = allTasks.filter(
    (t) => t.status === "in_progress"
  ).length
  const blockedTasks = allTasks.filter((t) => t.status === "blocked").length
  const pendingTasks = allTasks.filter((t) => t.status === "pending").length

  return {
    planId: plan.id,
    planName: plan.name,
    size: plan.size,
    stages,
    totalTasks: allTasks.length,
    completedTasks,
    inProgressTasks,
    blockedTasks,
    pendingTasks,
    percentComplete:
      allTasks.length > 0
        ? Math.round((completedTasks / allTasks.length) * 100)
        : 0,
  }
}

/**
 * Format progress for console output
 */
export function formatProgress(progress: PlanProgress): string {
  const lines: string[] = []
  const bar = "-".repeat(50)

  lines.push(`+${bar}+`)
  lines.push(`| ${progress.planId.padEnd(48)} |`)
  lines.push(`+${bar}+`)

  // Progress bar
  const barWidth = 30
  const filled = Math.round((progress.percentComplete / 100) * barWidth)
  const progressBar = "#".repeat(filled) + ".".repeat(barWidth - filled)
  lines.push(
    `| Progress: [${progressBar}] ${progress.percentComplete}%`.padEnd(51) + "|"
  )

  // Task counts
  lines.push(
    `| Tasks: ${progress.completedTasks}/${progress.totalTasks} complete, ${progress.inProgressTasks} in-progress, ${progress.blockedTasks} blocked`.padEnd(
      51
    ) + "|"
  )

  lines.push(`+${bar}+`)

  // Stage details
  for (const stage of progress.stages) {
    const stageComplete = stage.tasks.filter(
      (t) => t.status === "completed"
    ).length
    const stageTotal = stage.tasks.length
    const statusIcon =
      stage.status === "complete"
        ? "[x]"
        : stage.status === "in_progress"
        ? "[~]"
        : stage.status === "blocked"
        ? "[!]"
        : "[ ]"

    const stageTitle = stage.title || `Stage ${stage.number}`
    lines.push(
      `| ${statusIcon} Stage ${stage.number}: ${stageTitle} (${stageComplete}/${stageTotal})`.padEnd(
        51
      ) + "|"
    )
  }

  lines.push(`+${bar}+`)

  return lines.join("\n")
}
