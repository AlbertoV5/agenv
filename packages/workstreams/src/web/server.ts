import { Hono } from "hono"
import { logger } from "hono/logger"
import { serveStatic } from "hono/bun"

import { createApiRoutes } from "./routes/api"
import { createUiRoutes } from "./routes/ui"

type BunServer = ReturnType<typeof Bun.serve>

export interface ServerOptions {
  port?: number
  host?: string
}

const DEFAULT_PORT = 3456
const DEFAULT_HOST = "localhost"

/**
 * Create and configure the Hono application
 */
export function createApp(): Hono {
  const app = new Hono()

  // Middleware
  app.use("*", logger())

  // Static file serving for CSS/JS assets
  app.use("/static/*", serveStatic({ root: "./" }))

  // Health check endpoint
  app.get("/health", (c) => c.json({ status: "ok" }))

  // API Routes
  app.route("/api", createApiRoutes())

  // UI Routes
  app.route("/", createUiRoutes())

  return app
}

/**
 * Start the HTTP server with graceful shutdown handling
 */
export async function startServer(
  options: ServerOptions = {},
): Promise<{ server: BunServer; shutdown: () => Promise<void> }> {
  const port = options.port ?? DEFAULT_PORT
  const hostname = options.host ?? DEFAULT_HOST

  const app = createApp()

  const server = Bun.serve({
    fetch: app.fetch,
    port,
    hostname,
  })

  /**
   * Graceful shutdown handler
   */
  const shutdown = async (): Promise<void> => {
    // Stop accepting new connections and close existing ones
    server.stop()
  }

  // Register signal handlers for graceful shutdown
  const signalHandler = async () => {
    await shutdown()
    process.exit(0)
  }

  process.on("SIGTERM", signalHandler)
  process.on("SIGINT", signalHandler)

  return { server, shutdown }
}

export { DEFAULT_PORT, DEFAULT_HOST }
