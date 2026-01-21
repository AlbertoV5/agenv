/**
 * REST API routes for workstream data
 *
 * All endpoints return JSON responses.
 */

import { Hono } from "hono"
import {
  loadIndex,
  findStream,
  getStream,
  getCurrentStreamId,
} from "../../lib/index.ts"
import { getRepoRoot } from "../../lib/repo.ts"
import { getTasks, getTaskCounts } from "../../lib/tasks.ts"
import { getStreamProgress, getStreamStatus } from "../../lib/status.ts"
import { parseStreamDocument } from "../../lib/stream-parser.ts"
import { readFileSync, existsSync } from "fs"
import { join } from "path"
import type { StreamMetadata, Task, TaskStatus } from "../../lib/types.ts"

/**
 * Create API routes for workstream data
 * @param repoRoot - Optional repo root override (defaults to detected repo root)
 */
export function createApiRoutes(repoRoot?: string): Hono {
  const api = new Hono()

  // Helper to get repo root (use provided or detect)
  const getRoot = () => repoRoot || getRepoRoot()

  /**
   * GET /api/workstreams
   * List all workstreams with metadata
   */
  api.get("/workstreams", (c) => {
    try {
      const root = getRoot()
      const index = loadIndex(root)
      const currentStreamId = getCurrentStreamId(index)

      const workstreams = index.streams.map((stream) => ({
        id: stream.id,
        name: stream.name,
        order: stream.order,
        status: getStreamStatus(root, stream),
        approval: stream.approval,
        size: stream.size,
        created_at: stream.created_at,
        updated_at: stream.updated_at,
        is_current: stream.id === currentStreamId,
        task_counts: getTaskCounts(root, stream.id),
      }))

      return c.json({
        version: index.version,
        last_updated: index.last_updated,
        current_stream: currentStreamId,
        workstreams,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return c.json({ error: message }, 500)
    }
  })

  /**
   * GET /api/workstreams/:id
   * Get single workstream details
   */
  api.get("/workstreams/:id", (c) => {
    try {
      const root = getRoot()
      const index = loadIndex(root)
      const streamId = c.req.param("id")

      const stream = findStream(index, streamId)
      if (!stream) {
        return c.json({ error: `Workstream "${streamId}" not found` }, 404)
      }

      const currentStreamId = getCurrentStreamId(index)
      const status = getStreamStatus(root, stream)
      const taskCounts = getTaskCounts(root, stream.id)

      return c.json({
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
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return c.json({ error: message }, 500)
    }
  })

  /**
   * GET /api/workstreams/:id/tasks
   * Get tasks for workstream with optional status filter
   * Query params:
   *   - status: Filter by task status (pending, in_progress, completed, blocked, cancelled)
   */
  api.get("/workstreams/:id/tasks", (c) => {
    try {
      const root = getRoot()
      const index = loadIndex(root)
      const streamId = c.req.param("id")
      const statusFilter = c.req.query("status") as TaskStatus | undefined

      const stream = findStream(index, streamId)
      if (!stream) {
        return c.json({ error: `Workstream "${streamId}" not found` }, 404)
      }

      let tasks = getTasks(root, stream.id)

      // Apply status filter if provided
      if (statusFilter) {
        const validStatuses: TaskStatus[] = [
          "pending",
          "in_progress",
          "completed",
          "blocked",
          "cancelled",
        ]
        if (!validStatuses.includes(statusFilter)) {
          return c.json(
            {
              error: `Invalid status filter "${statusFilter}". Valid values: ${validStatuses.join(", ")}`,
            },
            400
          )
        }
        tasks = tasks.filter((t) => t.status === statusFilter)
      }

      return c.json({
        stream_id: stream.id,
        total: tasks.length,
        filter: statusFilter || null,
        tasks,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return c.json({ error: message }, 500)
    }
  })

  /**
   * GET /api/workstreams/:id/progress
   * Get progress summary for workstream
   */
  api.get("/workstreams/:id/progress", (c) => {
    try {
      const root = getRoot()
      const index = loadIndex(root)
      const streamId = c.req.param("id")

      const stream = findStream(index, streamId)
      if (!stream) {
        return c.json({ error: `Workstream "${streamId}" not found` }, 404)
      }

      const progress = getStreamProgress(root, stream)
      const status = getStreamStatus(root, stream)

      return c.json({
        stream_id: stream.id,
        stream_name: stream.name,
        status,
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
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return c.json({ error: message }, 500)
    }
  })

  /**
   * GET /api/workstreams/:id/plan
   * Get parsed PLAN.md structure
   */
  api.get("/workstreams/:id/plan", (c) => {
    try {
      const root = getRoot()
      const index = loadIndex(root)
      const streamId = c.req.param("id")

      const stream = findStream(index, streamId)
      if (!stream) {
        return c.json({ error: `Workstream "${streamId}" not found` }, 404)
      }

      // Read PLAN.md from the workstream directory
      const planPath = join(root, stream.path, "PLAN.md")
      if (!existsSync(planPath)) {
        return c.json(
          { error: `PLAN.md not found for workstream "${streamId}"` },
          404
        )
      }

      const planContent = readFileSync(planPath, "utf-8")
      const errors: { line?: number; section?: string; message: string }[] = []
      const streamDocument = parseStreamDocument(planContent, errors)

      if (!streamDocument) {
        return c.json(
          {
            error: "Failed to parse PLAN.md",
            parse_errors: errors,
          },
          500
        )
      }

      return c.json({
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
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return c.json({ error: message }, 500)
    }
  })

  return api
}
