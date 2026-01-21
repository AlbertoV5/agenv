/**
 * UI routes for workstream visualization
 */

import { Hono } from "hono"
import { listWorkstreams } from "../data-service"
import { Dashboard } from "../views/dashboard"

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
      return c.html(`<div>Error: ${result.error}</div>`, 500)
    }

    return c.html(
      Dashboard({ 
        workstreams: result.data.workstreams,
        currentStreamId: result.data.current_stream
      })
    )
  })

  return ui
}
