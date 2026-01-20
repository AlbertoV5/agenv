/**
 * tmux session management utilities
 *
 * Provides functions for creating, managing, and attaching to tmux sessions
 * for parallel thread execution.
 */

import { execSync, spawn, type ChildProcess } from "child_process"

/**
 * Check if a tmux session exists
 */
export function sessionExists(name: string): boolean {
    try {
        execSync(`tmux has-session -t "${name}" 2>/dev/null`, {
            stdio: "pipe",
        })
        return true
    } catch {
        return false
    }
}

/**
 * Create a new tmux session with an initial window
 * The session is created detached (-d) so we can add more windows before attaching
 */
export function createSession(
    sessionName: string,
    windowName: string,
    command: string
): void {
    // Create session with first window
    execSync(
        `tmux new-session -d -s "${sessionName}" -n "${windowName}" "${command}"`,
        { stdio: "pipe" }
    )
}

/**
 * Add a new window to an existing tmux session
 */
export function addWindow(
    sessionName: string,
    windowName: string,
    command: string
): void {
    execSync(
        `tmux new-window -t "${sessionName}" -n "${windowName}" "${command}"`,
        { stdio: "pipe" }
    )
}

/**
 * Select a specific window in a session (0-indexed)
 */
export function selectWindow(sessionName: string, windowIndex: number): void {
    execSync(`tmux select-window -t "${sessionName}:${windowIndex}"`, {
        stdio: "pipe",
    })
}

/**
 * Attach to a tmux session
 * This spawns tmux in the foreground and takes over the terminal
 */
export function attachSession(sessionName: string): ChildProcess {
    const child = spawn("tmux", ["attach", "-t", sessionName], {
        stdio: "inherit",
    })
    return child
}

/**
 * Kill a tmux session
 */
export function killSession(sessionName: string): void {
    try {
        execSync(`tmux kill-session -t "${sessionName}"`, { stdio: "pipe" })
    } catch {
        // Session might not exist, ignore
    }
}

/**
 * List windows in a session
 * Returns array of window names
 */
export function listWindows(sessionName: string): string[] {
    try {
        const output = execSync(
            `tmux list-windows -t "${sessionName}" -F "#{window_name}"`,
            { stdio: "pipe", encoding: "utf-8" }
        )
        return output.trim().split("\n").filter(Boolean)
    } catch {
        return []
    }
}

/**
 * Get session info for a session
 * Returns null if session doesn't exist
 */
export function getSessionInfo(sessionName: string): {
    name: string
    windows: number
    attached: boolean
} | null {
    try {
        const output = execSync(
            `tmux list-sessions -F "#{session_name}:#{session_windows}:#{session_attached}" 2>/dev/null`,
            { stdio: "pipe", encoding: "utf-8" }
        )
        const lines = output.trim().split("\n")
        for (const line of lines) {
            const [name, windows, attached] = line.split(":")
            if (name === sessionName) {
                return {
                    name,
                    windows: parseInt(windows || "0", 10),
                    attached: attached === "1",
                }
            }
        }
        return null
    } catch {
        return null
    }
}

/**
 * Generate the session name for a workstream
 */
export function getWorkSessionName(streamId: string): string {
    // Truncate if too long for tmux
    const maxLen = 20
    const truncated = streamId.length > maxLen ? streamId.slice(0, maxLen) : streamId
    return `work-${truncated}`
}

/**
 * Build a tmux command string for display (dry-run mode)
 */
export function buildCreateSessionCommand(
    sessionName: string,
    windowName: string,
    command: string
): string {
    return `tmux new-session -d -s "${sessionName}" -n "${windowName}" "${command}"`
}

/**
 * Build a tmux new-window command string for display (dry-run mode)
 */
export function buildAddWindowCommand(
    sessionName: string,
    windowName: string,
    command: string
): string {
    return `tmux new-window -t "${sessionName}" -n "${windowName}" "${command}"`
}

/**
 * Build a tmux attach command string for display (dry-run mode)
 */
export function buildAttachCommand(sessionName: string): string {
    return `tmux attach -t "${sessionName}"`
}
