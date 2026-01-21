/**
 * opencode server management utilities
 *
 * Provides functions for starting, checking, and managing the opencode serve
 * backend which allows multiple client instances to share MCP and model cache.
 */

import { spawn, type ChildProcess } from "child_process"

const DEFAULT_PORT = 4096
const HEALTH_CHECK_INTERVAL_MS = 200
const DEFAULT_TIMEOUT_MS = 30000

/**
 * Get the server URL for a given port
 */
export function getServerUrl(port: number = DEFAULT_PORT): string {
    return `http://localhost:${port}`
}

/**
 * Check if the opencode server is running on the specified port
 * Makes a simple HTTP request to verify the server is responsive
 */
export async function isServerRunning(
    port: number = DEFAULT_PORT
): Promise<boolean> {
    try {
        const response = await fetch(`http://localhost:${port}/`, {
            method: "GET",
            signal: AbortSignal.timeout(2000),
        })
        // Any response means the server is up (even if not 200)
        return response.ok || response.status < 500
    } catch {
        return false
    }
}

/**
 * Start the opencode server in the background
 * Returns the child process handle
 *
 * Note: The process is started detached so it continues running
 * after the parent process exits.
 */
export function startServer(
    port: number = DEFAULT_PORT,
    cwd?: string
): ChildProcess {
    const child = spawn("opencode", ["serve", "--port", String(port)], {
        cwd,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
    })

    // Unref so parent can exit while server continues
    child.unref()

    return child
}

/**
 * Wait for the server to become available
 * Polls until the server responds or timeout is reached
 */
export async function waitForServer(
    port: number = DEFAULT_PORT,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<boolean> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
        const running = await isServerRunning(port)
        if (running) {
            return true
        }
        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS))
    }

    return false
}

/**
 * Build the opencode run command with --attach flag
 * Wrapped in sh -c to properly handle piped commands in tmux
 */
export function buildRunCommand(
    port: number,
    model: string,
    promptPath: string
): string {
    // Escape single quotes in paths by replacing ' with '\''
    const escapedPath = promptPath.replace(/'/g, "'\\''")
    // Wrap in sh -c with single quotes so the pipe works in tmux
    // We add a read command at the end to keep the pane open after execution (Dead Pane Prevention)
    return `sh -c 'cat "${escapedPath}" | opencode run --port ${port} --model "${model}"; echo "\\nThread finished. Press Enter to close."; read'`
}

/**
 * Build the opencode serve command for display (dry-run mode)
 */
export function buildServeCommand(port: number = DEFAULT_PORT): string {
    return `opencode serve --port ${port}`
}
