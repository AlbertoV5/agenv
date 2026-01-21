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
 * Truncate a string to maxLen chars, adding ellipsis if truncated
 */
function truncateTitle(title: string, maxLen: number = 32): string {
    if (title.length <= maxLen) return title
    return title.slice(0, maxLen - 1) + "…"
}

/**
 * Escape a string for use in shell double quotes
 */
function escapeForShell(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')
}

/**
 * Build the opencode run command with --title flag and session resume logic
 * Wrapped in sh -c to properly handle piped commands in tmux
 *
 * The command:
 * 1. Generates a unique tracking ID
 * 2. Runs opencode with a title containing the tracking ID
 * 3. After completion, searches for the session by tracking ID
 * 4. Resumes the session with opencode TUI if found
 */
export function buildRunCommand(
    port: number,
    model: string,
    promptPath: string,
    threadTitle: string
): string {
    // Escape single quotes in paths by replacing ' with '\''
    const escapedPath = promptPath.replace(/'/g, "'\\''")
    // Truncate and escape the title for shell safety
    const truncated = truncateTitle(threadTitle, 32)
    const escapedTitle = escapeForShell(truncated)

    // Build a shell script that:
    // 1. Generates a unique tracking ID (16 chars from nanosecond timestamp)
    // 2. Runs opencode run with the title containing the tracking ID
    // 3. After completion, searches for the session by tracking ID using jq
    // 4. Resumes the session with opencode TUI if found
    return `sh -c '
TRACK_ID=$(date +%s%N | head -c 16)
TITLE="${escapedTitle}__id=$TRACK_ID"
cat "${escapedPath}" | opencode run --port ${port} --model "${model}" --title "$TITLE"
echo ""
echo "Thread finished. Looking for session to resume..."
if command -v jq >/dev/null 2>&1; then
  SESSION_ID=$(opencode session list --max-count 10 --format json 2>/dev/null | jq -r ".[] | select(.title | contains(\\"__id=$TRACK_ID\\")) | .id" | head -1)
  if [ -n "$SESSION_ID" ]; then
    echo "Resuming session $SESSION_ID..."
    opencode --session "$SESSION_ID"
  else
    echo "Session not found. Press Enter to close."
    read
  fi
else
  echo "jq not found - install jq to enable session resume"
  echo "Press Enter to close."
  read
fi
'`
}

/**
 * Build the opencode serve command for display (dry-run mode)
 */
export function buildServeCommand(port: number = DEFAULT_PORT): string {
    return `opencode serve --port ${port}`
}
