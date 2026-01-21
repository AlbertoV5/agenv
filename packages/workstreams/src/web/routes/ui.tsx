import { Hono } from "hono"
import { listWorkstreams, getWorkstream, getTasksGrouped } from "../data-service"
import { Dashboard } from "../views/dashboard"
import { WorkstreamPage } from "../views/workstream"
import { TasksView } from "../views/tasks"
import { Layout } from "../views/layout"
import type { TaskStatus } from "../../lib/types"

/**
 * Create UI routes for workstream visualization
 * @param repoRoot - Optional repo root override
 */
export function createUiRoutes(repoRoot?: string): Hono {
  const ui = new Hono()

  /**
   * GET /
   * Dashboard view showing all workstreams
   */
  ui.get("/", (c) => {
    const result = listWorkstreams(repoRoot)
    
    if (!result.success) {
      return c.html(
        <div style="padding: 2rem; color: var(--status-blocked);">
          <h1>Error loading workstreams</h1>
          <p>{result.error}</p>
        </div>,
        500
      )
    }

    return c.html(
      <Dashboard 
        workstreams={result.data.workstreams} 
        currentStreamId={result.data.current_stream} 
      />
    )
  })

  /**
   * GET /workstream/:id
   * Detailed workstream view with full hierarchy
   */
  ui.get("/workstream/:id", (c) => {
    const id = c.req.param("id")
    const streamResult = getWorkstream(id, repoRoot)
    const tasksResult = getTasksGrouped(id, undefined, repoRoot)

    if (!streamResult.success) {
      return c.html(
        <Layout title="Error">
          <div style="padding: 2rem; color: var(--status-blocked);">
            <h1>Workstream not found</h1>
            <p>{streamResult.error}</p>
            <a href="/" style="color: var(--accent-color);">Back to Dashboard</a>
          </div>
        </Layout>,
        404
      )
    }

    if (!tasksResult.success) {
      return c.html(
        <Layout title="Error">
          <div style="padding: 2rem; color: var(--status-blocked);">
            <h1>Error loading tasks</h1>
            <p>{tasksResult.error}</p>
            <a href="/" style="color: var(--accent-color);">Back to Dashboard</a>
          </div>
        </Layout>,
        500
      )
    }

    return c.html(
      <WorkstreamPage 
        stream={streamResult.data} 
        tasks={tasksResult.data} 
      />
    )
  })

  /**
   * GET /workstream/:id/tasks
   * Flat task list view with filtering
   */
  ui.get("/workstream/:id/tasks", (c) => {
    const id = c.req.param("id")
    const statusFilter = c.req.query("status") as TaskStatus | undefined

    const streamResult = getWorkstream(id, repoRoot)
    if (!streamResult.success) {
      return c.html(
        <Layout title="Error">
          <div style="padding: 2rem; color: var(--status-blocked);">
            <h1>Error loading workstream</h1>
            <p>{streamResult.error}</p>
          </div>
        </Layout>,
        404
      )
    }

    const tasksResult = getTasksGrouped(id, statusFilter, repoRoot)
    if (!tasksResult.success) {
      return c.html(
        <Layout title="Error">
          <div style="padding: 2rem; color: var(--status-blocked);">
            <h1>Error loading tasks</h1>
            <p>{tasksResult.error}</p>
          </div>
        </Layout>,
        500
      )
    }

    return c.html(
      <TasksView 
        workstreamId={streamResult.data.id}
        workstreamName={streamResult.data.name}
        tasks={tasksResult.data.tasks}
        statusFilter={statusFilter || null}
      />
    )
  })

  return ui
}
