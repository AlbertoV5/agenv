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
import { getAgentsConfig, getAgent } from "./agents.ts"
import type {
  Task,
  StageDefinition,
  BatchDefinition,
  ThreadDefinition,
  AgentDefinition,
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
 * Parsed test requirements from TESTS.md
 */
export interface TestRequirements {
  general: string[]
  perStage: string[]
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
  assignedAgent?: AgentDefinition
  testRequirements?: TestRequirements
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
// TESTS.MD LOADING
// ============================================

/**
 * Get the TESTS.md file path
 */
export function getTestsMdPath(repoRoot: string): string {
  return join(getWorkDir(repoRoot), "TESTS.md")
}

/**
 * Parse TESTS.md content into structured requirements
 */
export function parseTestsMd(content: string): TestRequirements {
  const result: TestRequirements = {
    general: [],
    perStage: [],
  }

  if (!content.trim()) {
    return result
  }

  const lines = content.split("\n")
  let currentSection: "general" | "perStage" | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect section headers
    if (/^##\s+General/i.test(trimmed)) {
      currentSection = "general"
      continue
    }
    if (/^##\s+Per-Stage/i.test(trimmed)) {
      currentSection = "perStage"
      continue
    }
    // Reset on other H2 headers
    if (/^##\s+/.test(trimmed) && currentSection) {
      currentSection = null
      continue
    }

    // Capture list items in current section
    if (currentSection && /^-\s+/.test(trimmed)) {
      const item = trimmed.replace(/^-\s+\[[ x]?\]\s*/, "").replace(/^-\s+/, "")
      if (item) {
        result[currentSection].push(item)
      }
    }
  }

  return result
}

/**
 * Load test requirements from work/TESTS.md
 * Returns null if file doesn't exist
 */
export function getTestRequirements(repoRoot: string): TestRequirements | null {
  const path = getTestsMdPath(repoRoot)
  if (!existsSync(path)) {
    return null
  }

  const content = readFileSync(path, "utf-8")
  return parseTestsMd(content)
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
 * - Test requirements (if TESTS.md exists)
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
  let assignedAgent: AgentDefinition | undefined
  const assignedAgentName = tasks.find((t) => t.assigned_agent)?.assigned_agent
  if (assignedAgentName) {
    const agentsConfig = getAgentsConfig(repoRoot)
    if (agentsConfig) {
      assignedAgent = getAgent(agentsConfig, assignedAgentName) || undefined
    }
  }

  // Load test requirements
  const testRequirements = getTestRequirements(repoRoot) || undefined

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
    assignedAgent,
    testRequirements,
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

  // Header
  lines.push(`# Thread Execution: ${context.thread.name}`)
  lines.push("")

  // Context section
  lines.push("## Context")
  lines.push(
    `- **Workstream:** ${context.streamName} (\`${context.streamId}\`)`,
  )
  lines.push(
    `- **Location:** Stage ${context.stage.id} > Batch ${context.batch.prefix}-${context.batch.name} > Thread ${context.thread.id}`,
  )
  lines.push(
    `- **Assigned Agent:** ${context.assignedAgent ? `${context.assignedAgent.name} (${context.assignedAgent.model})` : "Unassigned"}`,
  )
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
  lines.push("## Tasks")
  if (context.tasks.length > 0) {
    lines.push("| ID | Task | Status |")
    lines.push("|----|------|--------|")
    for (const task of context.tasks) {
      lines.push(`| ${task.id} | ${task.name} | ${task.status} |`)
    }
  } else {
    lines.push("(No tasks found for this thread)")
  }
  lines.push("")

  // Stage context
  lines.push("## Stage Context")
  lines.push(`**Stage ${context.stage.id}: ${context.stage.name}**`)
  lines.push("")
  lines.push(context.stage.definition || "(No definition provided)")
  lines.push("")

  // Constitution
  lines.push("### Constitution")
  const c = context.stage.constitution
  if (c.structure.length > 0) {
    lines.push("**Structure:**")
    for (const item of c.structure) {
      lines.push(`- ${item}`)
    }
    lines.push("")
  }
  if (c.inputs.length > 0) {
    lines.push("**Inputs:**")
    for (const input of c.inputs) {
      lines.push(`- ${input}`)
    }
    lines.push("")
  }
  if (c.outputs.length > 0) {
    lines.push("**Outputs:**")
    for (const output of c.outputs) {
      lines.push(`- ${output}`)
    }
    lines.push("")
  }

  // Parallel threads
  if (opts.includeParallel && context.parallelThreads.length > 0) {
    lines.push(`## Parallel Threads (Batch ${context.batch.prefix})`)
    lines.push("Other threads executing in parallel:")
    lines.push("| Thread | Name | Summary |")
    lines.push("|--------|------|---------|")
    for (const t of context.parallelThreads) {
      const summary =
        t.summary.slice(0, 60) + (t.summary.length > 60 ? "..." : "")
      lines.push(`| ${t.id} | ${t.name} | ${summary} |`)
    }
    lines.push("")
  }

  // Test requirements
  if (opts.includeTests && context.testRequirements) {
    const tr = context.testRequirements
    lines.push("## Test Requirements")
    if (tr.general.length > 0) {
      lines.push("**General:**")
      for (const item of tr.general) {
        lines.push(`- ${item}`)
      }
    }
    if (tr.perStage.length > 0) {
      lines.push("**Per-Stage:**")
      for (const item of tr.perStage) {
        lines.push(`- ${item}`)
      }
    }
    lines.push("")
  }

  // Output location
  lines.push("## Output Location")
  lines.push(`Work in output directory: \`${context.outputDir}/\``)
  lines.push("")

  // Execution instructions
  lines.push("## Execution Instructions")
  lines.push("1. Reference PLAN.md for context and approach")
  lines.push("2. Complete each task in order, updating status as you progress")
  lines.push(
    "3. Create descriptive markdown documentation in the output directory (e.g., usage.md, schema.md)",
  )
  if (context.testRequirements) {
    lines.push("4. Run tests after completion (see test requirements above)")
    lines.push(
      '5. Log breadcrumbs for recovery: `work update --task "<id>" --breadcrumb "..."`',
    )
  } else {
    lines.push(
      '4. Log breadcrumbs for recovery: `work update --task "<id>" --breadcrumb "..."`',
    )
  }
  lines.push("")

  return lines.join("\n")
}

/**
 * Generate the thread execution prompt as JSON (for programmatic use)
 */
export function generateThreadPromptJson(context: PromptContext): object {
  return {
    threadId: context.threadIdString,
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
    assignedAgent: context.assignedAgent
      ? {
          name: context.assignedAgent.name,
          model: context.assignedAgent.model,
          description: context.assignedAgent.description,
          bestFor: context.assignedAgent.bestFor,
        }
      : null,
    testRequirements: context.testRequirements || null,
    outputDir: context.outputDir,
  }
}
