/**
 * Prompt generation for workstream threads
 *
 * Generates execution prompts for agents with full thread context,
 * including tasks, stage definition, parallel threads, and test requirements.
 */

import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { getWorkDir } from "./repo.ts"
import { parseStreamDocument } from "./stream-parser.ts"
import { getTasks, parseTaskId } from "./tasks.ts"
import type {
  Task,
  StageDefinition,
  BatchDefinition,
  ThreadDefinition,
  ConsolidateError,
} from "./types.ts"

// ============================================
// TYPES
// ============================================

/**
 * Thread identifier - parsed from "stage.batch.thread" format
 * Example: "01.01.02" = Stage 1, Batch 01, Thread 2
 */
export interface ThreadId {
  stage: number
  batch: number
  thread: number
}

/**
 * Context gathered for generating a thread execution prompt
 */
export interface PromptContext {
  threadId: ThreadId
  threadIdString: string
  streamId: string
  streamName: string
  thread: ThreadDefinition
  stage: StageDefinition
  batch: BatchDefinition
  tasks: Task[]
  parallelThreads: ThreadDefinition[]
  agentName?: string
  outputDir: string
}

/**
 * Options for generating a prompt
 */
export interface GeneratePromptOptions {
  includeTests?: boolean
  includeParallel?: boolean
}

// ============================================
// THREAD ID PARSING
// ============================================

/**
 * Parse thread ID from string format
 * Supports "stage.batch.thread" (e.g., "01.01.02")
 */
export function parseThreadId(threadIdStr: string): ThreadId | null {
  const parts = threadIdStr.split(".")

  if (parts.length !== 3) {
    return null
  }

  const parsed = parts.map((p) => parseInt(p, 10))
  if (parsed.some(isNaN)) {
    return null
  }

  return {
    stage: parsed[0]!,
    batch: parsed[1]!,
    thread: parsed[2]!,
  }
}

/**
 * Format thread ID components to string
 * All components are zero-padded to 2 digits
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

// ============================================
// CONTEXT GATHERING
// ============================================

/**
 * Get the full context needed to generate a thread prompt
 *
 * Gathers:
 * - Thread definition from PLAN.md
 * - Stage and batch context
 * - Tasks from tasks.json filtered to this thread
 * - Parallel threads in the same batch
 * - Agent assignment (if any)
 *
 * Throws if thread not found or PLAN.md parsing fails
 */
export function getPromptContext(
  repoRoot: string,
  streamId: string,
  threadIdStr: string,
): PromptContext {
  // Parse thread ID
  const threadId = parseThreadId(threadIdStr)
  if (!threadId) {
    throw new Error(
      `Invalid thread ID format: "${threadIdStr}". Expected "stage.batch.thread" (e.g., "01.01.02")`,
    )
  }

  // Load PLAN.md
  const workDir = getWorkDir(repoRoot)
  const planPath = join(workDir, streamId, "PLAN.md")

  if (!existsSync(planPath)) {
    throw new Error(`PLAN.md not found at ${planPath}`)
  }

  const planContent = readFileSync(planPath, "utf-8")
  const errors: ConsolidateError[] = []
  const doc = parseStreamDocument(planContent, errors)

  if (!doc) {
    throw new Error(
      `Failed to parse PLAN.md: ${errors.map((e) => e.message).join(", ")}`,
    )
  }

  // Find stage
  const stage = doc.stages.find((s) => s.id === threadId.stage)
  if (!stage) {
    const availableStages = doc.stages.map((s) => s.id).join(", ")
    throw new Error(
      `Stage ${threadId.stage} not found. Available stages: ${availableStages || "none"}`,
    )
  }

  // Find batch
  const batch = stage.batches.find((b) => b.id === threadId.batch)
  if (!batch) {
    const availableBatches = stage.batches
      .map((b) => `${b.prefix} (${b.name})`)
      .join(", ")
    throw new Error(
      `Batch ${threadId.batch} not found in stage ${threadId.stage}. Available batches: ${availableBatches || "none"}`,
    )
  }

  // Find thread
  const thread = batch.threads.find((t) => t.id === threadId.thread)
  if (!thread) {
    const availableThreads = batch.threads
      .map((t) => `${t.id} (${t.name})`)
      .join(", ")
    throw new Error(
      `Thread ${threadId.thread} not found in batch ${batch.prefix}. Available threads: ${availableThreads || "none"}`,
    )
  }

  // Get parallel threads (other threads in the same batch)
  const parallelThreads = batch.threads.filter((t) => t.id !== threadId.thread)

  // Load tasks filtered to this thread
  const allTasks = getTasks(repoRoot, streamId)
  const threadPrefix = `${threadId.stage.toString().padStart(2, "0")}.${threadId.batch.toString().padStart(2, "0")}.${threadId.thread.toString().padStart(2, "0")}.`
  const tasks = allTasks.filter((t) => t.id.startsWith(threadPrefix))

  // Get agent assignment from first task (they should all have the same agent)
  // We use this to personalize the prompt
  const assignedAgent = tasks.find((t) => t.assigned_agent)?.assigned_agent
  const agentName = assignedAgent

  // Calculate output directory path
  const safeBatchName = batch.name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()
  const safeThreadName = thread.name
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .toLowerCase()
  const outputDir = `work/${streamId}/files/stage-${threadId.stage}/${batch.prefix}-${safeBatchName}/${safeThreadName}`

  return {
    threadId,
    threadIdString: threadIdStr,
    streamId,
    streamName: doc.streamName,
    thread,
    stage,
    batch,
    tasks,
    parallelThreads,
    agentName,
    outputDir,
  }
}

// ============================================
// PROMPT GENERATION
// ============================================

/**
 * Generate the thread execution prompt as markdown
 */
export function generateThreadPrompt(
  context: PromptContext,
  options?: GeneratePromptOptions,
): string {
  const opts = {
    includeTests: true,
    includeParallel: true,
    ...options,
  }

  const lines: string[] = []

  // Greeting
  lines.push(`Hello Agent!`)
  lines.push("")

  // Context
  lines.push(
    `You are working on the "${context.batch.name}" batch at the "${context.stage.name}" stage of the "${context.streamName}" workstream.`,
  )
  lines.push("")

  lines.push("This is the thread you are responsible for:")
  lines.push("")
  // Thread title and id
  lines.push(`"${context.thread.name}" (${context.thread.id})`)
  lines.push("")

  // Thread summary
  lines.push("## Thread Summary")
  lines.push(context.thread.summary || "(No summary provided)")
  lines.push("")

  // Thread details
  lines.push("## Thread Details")
  lines.push(context.thread.details || "(No details provided)")
  lines.push("")

  // Tasks section
  lines.push("Your tasks are:")
  if (context.tasks.length > 0) {
    for (const task of context.tasks) {
      lines.push(`- [ ] ${task.id} ${task.name}`)
    }
  } else {
    lines.push("(No tasks found for this thread)")
  }
  lines.push("")

  // Output location
  lines.push(
    `Your working directory for creating additional documentation or scripts (if any) is: \`${context.outputDir}/\``,
  )
  lines.push("")

  // Format batch ID for command suggestion
  const batchId = `${context.stage.id.toString().padStart(2, "0")}.${context.batch.id.toString().padStart(2, "0")}`

  // Skill instruction
  lines.push("Use the `implementing-workstream-plans` skill.")
  lines.push(
    `When listing tasks, use \`work list --tasks --batch "${batchId}"\` to see tasks for this batch only.`,
  )
  lines.push("")

  return lines.join("\n")
}

/**
 * Generate the thread execution prompt as JSON (for programmatic use)
 */
export function generateThreadPromptJson(context: PromptContext): object {
  return {
    threadId: context.threadIdString,
    agentName: context.agentName,
    stream: {
      id: context.streamId,
      name: context.streamName,
    },
    location: {
      stage: {
        id: context.stage.id,
        name: context.stage.name,
      },
      batch: {
        id: context.batch.id,
        prefix: context.batch.prefix,
        name: context.batch.name,
      },
      thread: {
        id: context.thread.id,
        name: context.thread.name,
      },
    },
    thread: {
      summary: context.thread.summary,
      details: context.thread.details,
    },
    tasks: context.tasks.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      breadcrumb: t.breadcrumb,
    })),
    stageContext: {
      definition: context.stage.definition,
      constitution: context.stage.constitution,
    },
    parallelThreads: context.parallelThreads.map((t) => ({
      id: t.id,
      name: t.name,
      summary: t.summary,
    })),
    outputDir: context.outputDir,
  }
}
