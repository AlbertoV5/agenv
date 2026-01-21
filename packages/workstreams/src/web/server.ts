import { Hono } from "hono"
import { logger } from "hono/logger"
import { serveStatic } from "hono/bun"
import { serve, type ServerType } from "@hono/node-server"

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

  return app
}

/**
 * Start the HTTP server with graceful shutdown handling
 */
export async function startServer(
  options: ServerOptions = {}
): Promise<{ server: ServerType; shutdown: () => Promise<void> }> {
  const port = options.port ?? DEFAULT_PORT
  const hostname = options.host ?? DEFAULT_HOST

  const app = createApp()

  const server = serve({
    fetch: app.fetch,
    port,
    hostname,
  })

  // Track active connections for graceful shutdown
  const connections = new Set<any>()

  server.on("connection", (conn: any) => {
    connections.add(conn)
    conn.on("close", () => connections.delete(conn))
  })

  /**
   * Graceful shutdown handler
   */
  const shutdown = async (): Promise<void> => {
    return new Promise((resolve) => {
      // Stop accepting new connections
      server.close(() => {
        resolve()
      })

      // Force close existing connections after timeout
      const forceCloseTimeout = setTimeout(() => {
        for (const conn of connections) {
          conn.destroy()
        }
      }, 5000)

      // Clear timeout if server closes gracefully
      server.once("close", () => {
        clearTimeout(forceCloseTimeout)
      })
    })
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
