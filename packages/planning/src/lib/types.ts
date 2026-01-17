/**
 * Types for plan generation, management, and implementation tracking
 */

// Plan size categories
export type PlanSize = "short" | "medium" | "long"

// Session configuration at time of plan creation
export interface SessionConfig {
  length: number // estimated number of sessions
  unit: "session"
  session_minutes: [number, number] // [min, max] e.g., [30, 45]
  session_iterations: [number, number] // [min, max] e.g., [4, 8]
}

// Default session configurations by plan size
export const DEFAULT_SESSION_CONFIGS: Record<PlanSize, SessionConfig> = {
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

// Default structure by plan size
export const DEFAULT_STRUCTURE: Record<
  PlanSize,
  { stages: number; supertasks: number; subtasks: number }
> = {
  short: { stages: 1, supertasks: 1, subtasks: 3 },
  medium: { stages: 3, supertasks: 2, subtasks: 3 },
  long: { stages: 4, supertasks: 3, subtasks: 4 },
}

// Reference synthesis info
export interface SynthesisInfo {
  synthesized: boolean
  reference_path?: string // path in docs/references
  synthesized_at?: string // ISO date
}

// Individual plan metadata
export interface PlanMetadata {
  id: string // e.g., "001-migrate-sql-to-orm"
  name: string // e.g., "migrate-sql-to-orm"
  order: number // e.g., 1
  size: PlanSize
  session: SessionConfig
  created_at: string // ISO date
  updated_at: string // ISO date
  synthesis: SynthesisInfo
  path: string // relative path from repo root
}

// The index.json structure
export interface PlansIndex {
  version: string
  last_updated: string
  plans: PlanMetadata[]
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
  plan_name: string
  plan_size: PlanSize
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
  PLAN_NAME: string
  PLAN_SIZE: PlanSize
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

// Plan progress summary
export interface PlanProgress {
  planId: string
  planName: string
  size: PlanSize
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
  planId: string
  taskId: string // e.g., "1.2" or "2.1.3" (stage.taskgroup.subtask)
  status: TaskStatus
  note?: string
}

// Complete plan command options
export interface CompletePlanOptions {
  planId: string
  referencePath?: string
}
