/**
 * Types for workstream generation, management, and implementation tracking
 */

// Stream size categories
export type StreamSize = "short" | "medium" | "long"

// Session estimate at time of stream creation
export interface SessionEstimate {
  length: number // estimated number of sessions
  unit: "session"
  session_minutes: [number, number] // [min, max] e.g., [30, 45]
  session_iterations: [number, number] // [min, max] e.g., [4, 8]
}

// Default session estimates by stream size
export const DEFAULT_SESSION_ESTIMATES: Record<StreamSize, SessionEstimate> = {
  short: {
    length: 2,
    unit: "session",
    session_minutes: [30, 45],
    session_iterations: [4, 8],
  },
  medium: {
    length: 4,
    unit: "session",
    session_minutes: [30, 45],
    session_iterations: [4, 8],
  },
  long: {
    length: 8,
    unit: "session",
    session_minutes: [30, 45],
    session_iterations: [4, 8],
  },
}

// Default structure by stream size
export const DEFAULT_STRUCTURE: Record<
  StreamSize,
  { stages: number; supertasks: number; subtasks: number }
> = {
  short: { stages: 1, supertasks: 1, subtasks: 3 },
  medium: { stages: 3, supertasks: 2, subtasks: 3 },
  long: { stages: 4, supertasks: 3, subtasks: 4 },
}

// Version info for generated workstreams
export interface GeneratedBy {
  workstreams: string // @agenv/workstreams version
}

// Individual workstream metadata
export interface StreamMetadata {
  id: string // e.g., "001-migrate-sql-to-orm"
  name: string // e.g., "migrate-sql-to-orm"
  order: number // e.g., 1
  status?: StreamStatus // computed from tasks or manually set (default: pending)
  approval?: ApprovalMetadata // HITL approval gate status (default: draft)
  size: StreamSize
  session_estimated: SessionEstimate
  created_at: string // ISO date
  updated_at: string // ISO date
  path: string // relative path from repo root
  generated_by: GeneratedBy // versions of tools that created this workstream
  files?: string[] // list of file names in the files/ directory
}

// The index.json structure
export interface WorkIndex {
  version: string
  last_updated: string
  current_stream?: string // ID of the currently active workstream
  streams: StreamMetadata[]
}

// Checklist data structures
export interface SubTask {
  id: string
  description: string
  status: "pending" | "in_progress" | "completed" | "blocked"
  notes?: string
}

export interface SuperTask {
  id: string
  title: string
  description: string
  subtasks: SubTask[]
}

export interface Stage {
  id: string
  number: number
  title: string
  description: string
  supertasks: SuperTask[]
}

// Template input for checklist generation
export interface ChecklistTemplateInput {
  stream_name: string
  stream_size: StreamSize
  stages?: {
    title: string
    description: string
    supertasks: {
      title: string
      description: string
      subtasks: string[]
    }[]
  }[]
}

// Template placeholders
export interface TemplatePlaceholders {
  STREAM_NAME: string
  STREAM_SIZE: StreamSize
  CREATED_DATE: string
  STAGE_NUMBER?: number
  STAGE_TITLE?: string
  STAGE_DESCRIPTION?: string
}

// Task status during implementation
export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked"
  | "cancelled"

// Stream status - computed from tasks or manually set
export type StreamStatus =
  | "pending" // No tasks started (default)
  | "in_progress" // Has tasks in progress
  | "completed" // All tasks completed
  | "on_hold" // Manually paused, won't work on for now

// Approval status for HITL gate
export type ApprovalStatus = "draft" | "approved" | "revoked"

/**
 * Approval metadata for human-in-the-loop gate
 * Plans must be approved before tasks can be created
 */
export interface ApprovalMetadata {
  status: ApprovalStatus
  approved_at?: string // ISO date when approved
  approved_by?: string // Optional: who approved (e.g., "user", "ci", agent name)
  revoked_at?: string // ISO date when revoked (if status changed after approval)
  revoked_reason?: string // Optional: why it was revoked
  plan_hash?: string // SHA-256 hash of PLAN.md at approval time for modification detection
}

// Stage status summary
export type StageStatus = "pending" | "in_progress" | "complete" | "blocked"

// Parsed task from checklist markdown
export interface ParsedTask {
  id: string // e.g., "1.2" for stage 1, task group 1, subtask 2
  description: string
  status: TaskStatus
  stageNumber?: number
  taskGroupNumber: number
  subtaskNumber: number
  lineNumber: number // for editing
}

// Parsed stage from checklist
export interface ParsedStage {
  number: number
  title: string
  status: StageStatus
  tasks: ParsedTask[]
  file: string // which file contains this stage
}

// Workstream progress summary
export interface StreamProgress {
  streamId: string
  streamName: string
  size: StreamSize
  stages: ParsedStage[]
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  blockedTasks: number
  pendingTasks: number
  percentComplete: number
}

// Update task command options
export interface UpdateTaskOptions {
  streamId: string
  taskId: string // e.g., "1.2" or "2.1.3" (stage.taskgroup.subtask)
  status: TaskStatus
  note?: string
  breadcrumb?: string
}

// Complete workstream command options
export interface CompleteStreamOptions {
  streamId: string
}

// ============================================
// NEW TYPES FOR PLAN.md + tasks.json STRUCTURE
// ============================================

/**
 * Constitution definition - the "how" of a stage
 * Contains requirements, inputs, outputs, and workflows
 */
export interface ConstitutionDefinition {
  requirements: string[]
  inputs: string[]
  outputs: string[]
  flows: string[]
}

/**
 * Stage question - an unknown or research to-do
 */
export interface StageQuestion {
  question: string
  resolved: boolean
  resolution?: string
}

/**
 * Thread definition - a parallelizable work unit within a batch
 * Each thread contains multiple tasks
 */
export interface ThreadDefinition {
  id: number // Thread number within batch (1, 2, 3...)
  name: string
  summary: string // Short description of the thread
  details: string // Any content - implementation notes, dependencies, goals, etc.
}

/**
 * Batch definition - an ordered group of threads within a stage
 * Batches use numeric prefixes for ordering (01, 02...)
 * Common patterns: 01-implementation, 02-testing
 */
export interface BatchDefinition {
  id: number // Batch number within stage (0, 1, 2...)
  prefix: string // Numeric prefix string (e.g., "01")
  name: string // Batch name (e.g., "setup", "implementation")
  summary: string // Short description of the batch
  threads: ThreadDefinition[]
}

/**
 * Stage definition - parsed from PLAN.md
 */
export interface StageDefinition {
  id: number // Stage number (1, 2, 3...)
  name: string
  definition: string // The "what" - what this stage accomplishes
  constitution: ConstitutionDefinition // The "how"
  questions: StageQuestion[]
  batches: BatchDefinition[] // Ordered groups of threads within this stage
}

/**
 * Stream document - the full PLAN.md structure
 */
export interface StreamDocument {
  streamName: string
  summary: string
  references: string[]
  stages: StageDefinition[]
}

/**
 * Task in tasks.json - generated from consolidation
 * ID format: "{stage}.{batch}.{thread}.{task}" (e.g., "01.00.02.03")
 * All components are zero-padded to 2 digits for consistent sorting
 */
export interface Task {
  id: string // e.g., "01.01.02.03" = stage 1, batch 1, thread 2, task 3
  name: string // Task description from PLAN.md
  thread_name: string // Parent thread name for context
  batch_name: string // Parent batch name for context
  stage_name: string // Parent stage name for context
  created_at: string // ISO date
  updated_at: string // ISO date
  status: TaskStatus
  breadcrumb?: string // Last action/status for recovery
  assigned_agent?: string // Agent assigned to this task
}

/**
 * tasks.json file structure
 */
export interface TasksFile {
  version: string // Schema version, e.g., "1.0.0"
  stream_id: string // Reference to the workstream ID
  last_updated: string // ISO date
  tasks: Task[]
}

/**
 * Error during consolidation
 */
export interface ConsolidateError {
  line?: number
  section?: string
  message: string
}

/**
 * Result of consolidating PLAN.md into JSON
 */
export interface ConsolidateResult {
  success: boolean
  streamDocument: StreamDocument | null
  tasksGenerated: Task[]
  errors: ConsolidateError[]
  warnings: string[]
}

// ============================================
// METRICS & EVALUATION TYPES
// ============================================

/**
 * Evaluation metrics for a workstream
 */
export interface EvaluationMetrics {
  streamId: string
  streamName: string
  totalTasks: number
  statusCounts: Record<TaskStatus, number>
  completionRate: number
  blockedRate: number
  cancelledRate: number
  inProgressCount: number
}

/**
 * Blocker analysis result
 */
export interface BlockerAnalysis {
  blockedTasks: Task[]
  blockersByStage: Record<number, Task[]>
  blockersByBatch: Record<string, Task[]> // key is "stage.batch" e.g., "1.00"
  blockedPercentage: number
}

/**
 * Task filter result
 */
export interface FilterResult {
  matchingTasks: Task[]
  matchCount: number
  totalTasks: number
}

// ============================================
// DOCUMENT & EXPORT TYPES
// ============================================

/**
 * Stage report for progress reports
 */
export interface StageReport {
  stageNumber: number
  stageName: string
  batchCount: number
  threadCount: number
  taskCount: number
  completedCount: number
  blockedCount: number
  inProgressCount: number
}

/**
 * Progress report structure
 */
export interface ProgressReport {
  streamId: string
  streamName: string
  generatedAt: string
  status: StreamStatus
  metrics: EvaluationMetrics
  stageReports: StageReport[]
}

/**
 * Changelog entry for completed tasks
 */
export interface ChangelogEntry {
  taskId: string
  taskName: string
  stageName: string
  threadName: string
  completedAt: string
}

/**
 * Export format options
 */
export type ExportFormat = "md" | "csv" | "json"

// ============================================
// AGENTS CONFIGURATION TYPES
// ============================================

/**
 * Agent definition - describes an available agent
 * Defined in work/AGENTS.md (shared across all workstreams)
 *
 * Format in AGENTS.md:
 * ### backend-orm-expert
 * **Description:** Specializes in database schema design...
 * **Best for:** Database setup, migration scripts...
 * **Model:** claude-opus
 */
export interface AgentDefinition {
  name: string // e.g., "backend-orm-expert" (from H3 heading)
  description: string // Multi-sentence description of specialization
  bestFor: string // Use cases summary
  model: string // e.g., "claude-opus", "claude-sonnet"
}

/**
 * Full agents configuration from AGENTS.md
 * Agent-to-task assignments are stored in tasks.json (Task.assigned_agent)
 */
export interface AgentsConfig {
  agents: AgentDefinition[]
}
