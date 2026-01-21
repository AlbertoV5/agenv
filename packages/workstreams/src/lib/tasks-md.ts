/**
 * TASKS.md parser and generator
 *
 * Handles the human-readable TASKS.md intermediate format.
 */

import { Lexer, type Token, type Tokens } from "marked"
import type { Task, StreamDocument } from "./types.ts"
import { formatTaskId, parseTaskId } from "./tasks.ts"

/**
 * Generate TASKS.md content from a StreamDocument (PLAN.md structure)
 * Creates empty task checkboxes for each thread.
 */
export function generateTasksMdFromPlan(
  streamName: string,
  doc: StreamDocument,
): string {
  const lines: string[] = []

  lines.push(`# Tasks: ${streamName}`)
  lines.push("")

  for (const stage of doc.stages) {
    const stageIdPadded = stage.id.toString().padStart(2, "0")
    lines.push(`## Stage ${stageIdPadded}: ${stage.name}`)
    lines.push("")

    for (const batch of stage.batches) {
      lines.push(`### Batch ${batch.prefix}: ${batch.name}`)
      lines.push("")

      for (const thread of batch.threads) {
        const threadIdPadded = thread.id.toString().padStart(2, "0")
        lines.push(`#### Thread ${threadIdPadded}: ${thread.name}`)
        // Add a placeholder task to guide the user
        const taskId = formatTaskId(stage.id, batch.id, thread.id, 1)
        lines.push(`- [ ] Task ${taskId}: `)
        lines.push("")
      }
    }
  }

  return lines.join("\n")
}

/**
 * Generate TASKS.md content from existing Tasks
 * Groups tasks by Stage -> Batch -> Thread.
 */
export function generateTasksMdFromTasks(
  streamName: string,
  tasks: Task[],
): string {
  const lines: string[] = []

  lines.push(`# Tasks: ${streamName}`)
  lines.push("")

  // Group tasks
  const tasksByStage = new Map<number, Map<string, Map<number, Task[]>>>()
  const stageNames = new Map<number, string>()
  const batchNames = new Map<string, string>() // Keyed by batch_name for simplicity, or we can store properly
  const threadNames = new Map<string, string>() // Keyed by thread_name? No, thread ID/Name association is loose in tasks.

  // We need to group by ID hierarchy: Stage ID -> Batch ID -> Thread ID
  // But Task objects store names, not IDs directly (except in ID string).
  // We parse the ID to get the hierarchy.

  for (const task of tasks) {
    try {
      const { stage, batch, thread } = parseTaskId(task.id)

      if (!tasksByStage.has(stage)) {
        tasksByStage.set(stage, new Map())
        stageNames.set(stage, task.stage_name)
      }

      const batches = tasksByStage.get(stage)!
      // Use formatted batch (e.g. "00") as key
      const batchKey = batch.toString().padStart(2, "0")

      if (!batches.has(batchKey)) {
        batches.set(batchKey, new Map())
        batchNames.set(batchKey, task.batch_name)
      }

      const threads = batches.get(batchKey)!

      if (!threads.has(thread)) {
        threads.set(thread, [])
        threadNames.set(`${stage}.${batchKey}.${thread}`, task.thread_name)
      }

      threads.get(thread)!.push(task)
    } catch (e) {
      // Ignore invalid IDs
      continue
    }
  }

  // Sort and output
  const sortedStages = Array.from(tasksByStage.keys()).sort((a, b) => a - b)

  for (const stageId of sortedStages) {
    const batches = tasksByStage.get(stageId)!
    const stageIdPadded = stageId.toString().padStart(2, "0")
    const stageName = stageNames.get(stageId) || `Stage ${stageIdPadded}`
    lines.push(`## Stage ${stageIdPadded}: ${stageName}`)
    lines.push("")

    const sortedBatches = Array.from(batches.keys()).sort() // "00", "01" sorts correctly

    for (const batchKey of sortedBatches) {
      const threads = batches.get(batchKey)!
      const batchName = batchNames.get(batchKey) || `Batch ${batchKey}`
      lines.push(`### Batch ${batchKey}: ${batchName}`)
      lines.push("")

      const sortedThreads = Array.from(threads.keys()).sort((a, b) => a - b)

      for (const threadId of sortedThreads) {
        const threadTasks = threads.get(threadId)!
        // Sort tasks by ID
        threadTasks.sort((a, b) =>
          a.id.localeCompare(b.id, undefined, { numeric: true }),
        )

        const threadName =
          threadNames.get(`${stageId}.${batchKey}.${threadId}`) ||
          `Thread ${threadId}`
        const threadIdPadded = threadId.toString().padStart(2, "0")
        lines.push(`#### Thread ${threadIdPadded}: ${threadName}`)

        for (const task of threadTasks) {
          const check =
            task.status === "completed"
              ? "x"
              : task.status === "in_progress"
                ? "~"
                : task.status === "blocked"
                  ? "!"
                  : task.status === "cancelled"
                    ? "-"
                    : " "

          lines.push(`- [${check}] Task ${task.id}: ${task.name}`)
          if (task.report) {
            lines.push(`  > Report: ${task.report}`)
          }
        }
        lines.push("")
      }
    }
  }

  return lines.join("\n")
}

/**
 * Parse TASKS.md content to extract Tasks
 */
export function parseTasksMd(
  content: string,
  streamId: string,
): { tasks: Task[]; errors: string[] } {
  const lexer = new Lexer()
  const tokens = lexer.lex(content)
  const tasks: Task[] = []
  const errors: string[] = []

  let currentStage: { id: number; name: string } | null = null
  let currentBatch: { id: number; name: string } | null = null
  let currentThread: { id: number; name: string } | null = null

  for (const token of tokens) {
    if (token.type === "heading") {
      const heading = token as Tokens.Heading

      // H2: Stage N: {name}
      if (heading.depth === 2) {
        const match = heading.text.match(/^Stage\s+(\d+):\s*(.*)$/i)
        if (match) {
          currentStage = {
            id: parseInt(match[1]!, 10),
            name: match[2]!.trim(),
          }
          currentBatch = null
          currentThread = null
        } else {
          // Warning?
        }
      }

      // H3: Batch NN: {name}
      else if (heading.depth === 3 && currentStage) {
        const match = heading.text.match(/^Batch\s+(\d{1,2}):\s*(.*)$/i)
        if (match) {
          currentBatch = {
            id: parseInt(match[1]!, 10),
            name: match[2]!.trim(),
          }
          currentThread = null
        }
      }

      // H4: Thread N: {name}
      else if (heading.depth === 4 && currentStage && currentBatch) {
        const match = heading.text.match(/^Thread\s+(\d+):\s*(.*)$/i)
        if (match) {
          currentThread = {
            id: parseInt(match[1]!, 10),
            name: match[2]!.trim(),
          }
        }
      }
    }

    if (
      token.type === "list" &&
      currentStage &&
      currentBatch &&
      currentThread
    ) {
      const list = token as Tokens.List
      for (const item of list.items) {
        let text: string | undefined = item.text
        let statusChar = ""

        if (item.task) {
          // It was parsed as a GFM task ([ ] or [x])
          statusChar = item.checked ? "x" : " "
        } else {
          // Not a GFM task (e.g. [~], [!], [-]), check explicitly
          // marked puts the full text in item.text including the brackets
          const checkMatch = text.match(/^\s*\[([xX~!\-\s])\]\s+(.*)$/)
          if (checkMatch && checkMatch[1]) {
            statusChar = checkMatch[1].toLowerCase()
            text = checkMatch[2]
          } else {
            continue // Not a task item
          }
        }

        if (text) {
          // Check for report in text
          let report: string | undefined
          const reportMatch = text.match(/>\s*Report:\s*(.*)/i)
          if (reportMatch) {
            report = reportMatch[1]!.trim()
            // Remove report from text for description parsing, assuming it's at the end
            text = text.replace(/>\s*Report:\s*.*$/i, "").trim()
          }

          // Now parse "Task ID: Desc" from text
          // Use 'm' flag to handle multiline if marked preserves it, but we cleaned it above check
          // We'll just take the first line as description if there are newlines still
          const contentMatch = text.match(/^\s*(?:Task\s+([\d\.]+):\s*)?([^\n]*)/i)

          if (contentMatch) {
            const idString = contentMatch[1]
            const description = contentMatch[2]?.trim()

            if (description) {
              // Determine status
              const status =
                statusChar === "x"
                  ? "completed"
                  : statusChar === "~"
                    ? "in_progress"
                    : statusChar === "!"
                      ? "blocked"
                      : statusChar === "-"
                        ? "cancelled"
                        : "pending"

              let taskId = idString

              if (taskId) {
                // Validate ID matches hierarchy
                try {
                  const parsed = parseTaskId(taskId)
                  if (
                    parsed.stage !== currentStage.id ||
                    parsed.batch !== currentBatch.id ||
                    parsed.thread !== currentThread.id
                  ) {
                    errors.push(
                      `Task ID ${taskId} does not match hierarchy (Stage ${currentStage.id}, Batch ${currentBatch.id}, Thread ${currentThread.id})`,
                    )
                    continue
                  }
                } catch (e) {
                  errors.push(`Invalid task ID format: ${taskId}`)
                  continue
                }
              } else {
                errors.push(
                  `Task missing ID: "${description}". Format should be "- [ ] Task 01.01.01.01: Description"`,
                )
                continue
              }

              const now = new Date().toISOString()
              const task: Task = {
                id: taskId!,
                name: description,
                stage_name: currentStage.name,
                batch_name: currentBatch.name,
                thread_name: currentThread.name,
                status,
                created_at: now,
                updated_at: now,
                report,
              }

              tasks.push(task)
            }
          }
        }
      }
    }
  }

  return { tasks, errors }
}
