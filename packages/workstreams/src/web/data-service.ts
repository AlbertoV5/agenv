/**
 * Data service layer for web API
 *
 * Wraps existing lib functions for web API use with error handling
 * and structured responses suitable for JSON output.
 */

import { existsSync, readFileSync } from "fs"
import { join } from "path"
import {
  loadIndex,
  findStream,
  getCurrentStreamId,
} from "../lib/index.ts"
import { getRepoRoot } from "../lib/repo.ts"
import {
  getTasks as getTasksLib,
  getTaskCounts,
  groupTasks,
} from "../lib/tasks.ts"
import { getStreamProgress, getStreamStatus } from "../lib/status.ts"
import { parseStreamDocument } from "../lib/stream-parser.ts"
import type {
  StreamMetadata,
  Task,
  TaskStatus,
  StreamStatus,
  StageDefinition,
  BatchDefinition,
  ThreadDefinition,
  StageQuestion,
  ConsolidateError,
} from "../lib/types.ts"

// ============================================
// Response Types
// ============================================

/**
 * Result wrapper for service operations
 * Success contains data, error contains message and optional details
 */
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode: number; details?: unknown }

/**
 * Workstream summary for list view
 */
export interface WorkstreamSummary {
  id: string
  name: string
  order: number
  status: StreamStatus
  approval?: StreamMetadata["approval"]
  size: StreamMetadata["size"]
  created_at: string
  updated_at: string
  is_current: boolean
  task_counts: {
    total: number
    pending: number
    in_progress: number
    completed: number
    blocked: number
    cancelled: number
  }
}

/**
 * Response for listing workstreams
 */
export interface ListWorkstreamsResponse {
  version: string
  last_updated: string
  current_stream?: string
  workstreams: WorkstreamSummary[]
}

/**
 * Detailed workstream info
 */
export interface WorkstreamDetail extends WorkstreamSummary {
  session_estimated?: StreamMetadata["session_estimated"]
  path: string
  generated_by?: StreamMetadata["generated_by"]
  files?: string[]
  progress: {
    total_tasks: number
    completed_tasks: number
    in_progress_tasks: number
    blocked_tasks: number
    pending_tasks: number
    percent_complete: number
    stages: Array<{
      number: number
      title: string
      status: string
      task_count: number
      completed_count: number
    }>
  }
}

/**
 * Task with grouping information
 */
export interface GroupedTasks {
  stream_id: string
  total: number
  filter: TaskStatus | null
  /**
   * Hierarchical grouping: stages > batches > threads > tasks
   */
  grouped: {
    [stageName: string]: {
      [batchName: string]: {
        [threadName: string]: Task[]
      }
    }
  }
  /**
   * Flat list of all tasks
   */
  tasks: Task[]
}

/**
 * Parsed PLAN.md structure
 */
export interface PlanStructure {
  stream_id: string
  stream_name: string
  summary: string
  references: string[]
  stages: Array<{
    id: number
    name: string
    definition: string
    constitution: string
    questions: StageQuestion[]
    batches: Array<{
      id: number
      prefix: string
      name: string
      summary: string
      threads: Array<{
        id: number
        name: string
        summary: string
        details: string
      }>
    }>
  }>
  parse_errors?: ConsolidateError[]
}

// ============================================
// Service Class
// ============================================

/**
 * Data service for accessing workstream data
 *
 * Wraps lib functions with error handling and provides
 * structured responses for web API use.
 */
export class DataService {
  private repoRoot: string

  /**
   * Create a new DataService
   * @param repoRoot - Optional repo root override (auto-detected if not provided)
   */
  constructor(repoRoot?: string) {
    this.repoRoot = repoRoot || getRepoRoot()
  }

  /**
   * List all workstreams with metadata
   */
  listWorkstreams(): ServiceResult<ListWorkstreamsResponse> {
    try {
      const index = loadIndex(this.repoRoot)
      const currentStreamId = getCurrentStreamId(index)

      const workstreams: WorkstreamSummary[] = index.streams.map((stream) => ({
        id: stream.id,
        name: stream.name,
        order: stream.order,
        status: getStreamStatus(this.repoRoot, stream),
        approval: stream.approval,
        size: stream.size,
        created_at: stream.created_at,
        updated_at: stream.updated_at,
        is_current: stream.id === currentStreamId,
        task_counts: getTaskCounts(this.repoRoot, stream.id),
      }))

      return {
        success: true,
        data: {
          version: index.version,
          last_updated: index.last_updated,
          current_stream: currentStreamId,
          workstreams,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        statusCode: 500,
      }
    }
  }

  /**
   * Get single workstream with progress details
   * @param id - Workstream ID or name
   */
  getWorkstream(id: string): ServiceResult<WorkstreamDetail> {
    try {
      const index = loadIndex(this.repoRoot)
      const stream = findStream(index, id)

      if (!stream) {
        return {
          success: false,
          error: `Workstream "${id}" not found`,
          statusCode: 404,
        }
      }

      const currentStreamId = getCurrentStreamId(index)
      const status = getStreamStatus(this.repoRoot, stream)
      const taskCounts = getTaskCounts(this.repoRoot, stream.id)
      const progress = getStreamProgress(this.repoRoot, stream)

      return {
        success: true,
        data: {
          id: stream.id,
          name: stream.name,
          order: stream.order,
          status,
          approval: stream.approval,
          size: stream.size,
          session_estimated: stream.session_estimated,
          created_at: stream.created_at,
          updated_at: stream.updated_at,
          path: stream.path,
          generated_by: stream.generated_by,
          files: stream.files,
          is_current: stream.id === currentStreamId,
          task_counts: taskCounts,
          progress: {
            total_tasks: progress.totalTasks,
            completed_tasks: progress.completedTasks,
            in_progress_tasks: progress.inProgressTasks,
            blocked_tasks: progress.blockedTasks,
            pending_tasks: progress.pendingTasks,
            percent_complete: progress.percentComplete,
            stages: progress.stages.map((stage) => ({
              number: stage.number,
              title: stage.title,
              status: stage.status,
              task_count: stage.tasks.length,
              completed_count: stage.tasks.filter((t) => t.status === "completed")
                .length,
            })),
          },
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        statusCode: 500,
      }
    }
  }

  /**
   * Get tasks for workstream with grouping by stage/batch/thread
   * @param id - Workstream ID or name
   * @param statusFilter - Optional status filter
   */
  getTasks(
    id: string,
    statusFilter?: TaskStatus
  ): ServiceResult<GroupedTasks> {
    try {
      const index = loadIndex(this.repoRoot)
      const stream = findStream(index, id)

      if (!stream) {
        return {
          success: false,
          error: `Workstream "${id}" not found`,
          statusCode: 404,
        }
      }

      // Validate status filter
      if (statusFilter) {
        const validStatuses: TaskStatus[] = [
          "pending",
          "in_progress",
          "completed",
          "blocked",
          "cancelled",
        ]
        if (!validStatuses.includes(statusFilter)) {
          return {
            success: false,
            error: `Invalid status filter "${statusFilter}". Valid values: ${validStatuses.join(", ")}`,
            statusCode: 400,
          }
        }
      }

      let tasks = getTasksLib(this.repoRoot, stream.id)

      // Apply status filter if provided
      if (statusFilter) {
        tasks = tasks.filter((t) => t.status === statusFilter)
      }

      // Group tasks by stage/batch/thread
      const groupedMap = groupTasks(tasks, { byBatch: true })

      // Convert Map to plain object for JSON serialization
      const grouped: GroupedTasks["grouped"] = {}
      for (const [stageName, batchMap] of groupedMap) {
        grouped[stageName] = {}
        for (const [batchName, threadMap] of batchMap) {
          grouped[stageName][batchName] = {}
          for (const [threadName, threadTasks] of threadMap) {
            grouped[stageName][batchName][threadName] = threadTasks
          }
        }
      }

      return {
        success: true,
        data: {
          stream_id: stream.id,
          total: tasks.length,
          filter: statusFilter || null,
          grouped,
          tasks,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        statusCode: 500,
      }
    }
  }

  /**
   * Get parsed PLAN.md structure
   * @param id - Workstream ID or name
   */
  getPlanStructure(id: string): ServiceResult<PlanStructure> {
    try {
      const index = loadIndex(this.repoRoot)
      const stream = findStream(index, id)

      if (!stream) {
        return {
          success: false,
          error: `Workstream "${id}" not found`,
          statusCode: 404,
        }
      }

      // Read PLAN.md from the workstream directory
      const planPath = join(this.repoRoot, stream.path, "PLAN.md")
      if (!existsSync(planPath)) {
        return {
          success: false,
          error: `PLAN.md not found for workstream "${id}"`,
          statusCode: 404,
        }
      }

      const planContent = readFileSync(planPath, "utf-8")
      const errors: ConsolidateError[] = []
      const streamDocument = parseStreamDocument(planContent, errors)

      if (!streamDocument) {
        return {
          success: false,
          error: "Failed to parse PLAN.md",
          statusCode: 500,
          details: { parse_errors: errors },
        }
      }

      return {
        success: true,
        data: {
          stream_id: stream.id,
          stream_name: streamDocument.streamName,
          summary: streamDocument.summary,
          references: streamDocument.references,
          stages: streamDocument.stages.map((stage) => ({
            id: stage.id,
            name: stage.name,
            definition: stage.definition,
            constitution: stage.constitution,
            questions: stage.questions,
            batches: stage.batches.map((batch) => ({
              id: batch.id,
              prefix: batch.prefix,
              name: batch.name,
              summary: batch.summary,
              threads: batch.threads.map((thread) => ({
                id: thread.id,
                name: thread.name,
                summary: thread.summary,
                details: thread.details,
              })),
            })),
          })),
          parse_errors: errors.length > 0 ? errors : undefined,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        statusCode: 500,
      }
    }
  }
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Create a data service with optional repo root
 */
export function createDataService(repoRoot?: string): DataService {
  return new DataService(repoRoot)
}

/**
 * List all workstreams (convenience function)
 */
export function listWorkstreams(
  repoRoot?: string
): ServiceResult<ListWorkstreamsResponse> {
  return createDataService(repoRoot).listWorkstreams()
}

/**
 * Get single workstream with progress (convenience function)
 */
export function getWorkstream(
  id: string,
  repoRoot?: string
): ServiceResult<WorkstreamDetail> {
  return createDataService(repoRoot).getWorkstream(id)
}

/**
 * Get tasks with grouping (convenience function)
 */
export function getTasksGrouped(
  id: string,
  statusFilter?: TaskStatus,
  repoRoot?: string
): ServiceResult<GroupedTasks> {
  return createDataService(repoRoot).getTasks(id, statusFilter)
}

/**
 * Get parsed PLAN.md structure (convenience function)
 */
export function getPlanStructure(
  id: string,
  repoRoot?: string
): ServiceResult<PlanStructure> {
  return createDataService(repoRoot).getPlanStructure(id)
}
