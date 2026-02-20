/**
 * Marker Polling
 *
 * Handles polling for completion marker files and cleanup of session files.
 * Used by the multi command to track thread completion and trigger notifications.
 */

import { existsSync, unlinkSync, readFileSync } from "fs"
import { getCompletionMarkerPath, getSessionFilePath, getSynthesisOutputPath, getWorkingAgentSessionPath, getSynthesisLogPath } from "./opencode.ts"
import type { NotificationTracker } from "./notifications.ts"
import { parseSynthesisOutputFile } from "./synthesis/output.ts"

/**
 * Configuration for marker file polling
 */
export interface MarkerPollingConfig {
  /** Thread IDs to monitor */
  threadIds: string[]
  /** Notification tracker for playing sounds (null = silent mode) */
  notificationTracker: NotificationTracker | null
  /** Polling interval in milliseconds (default: 500) */
  pollIntervalMs?: number
  /** Stream ID for reading synthesis output files (optional, enables synthesis notifications) */
  streamId?: string
}

/**
 * Polling state that can be used to stop polling externally
 */
export interface MarkerPollingState {
  /** Set to false to stop polling */
  active: boolean
  /** Set of thread IDs that have completed */
  completedThreadIds: Set<string>
}

/**
 * Clean up completion marker files for all threads
 * Called when batch completes to remove /tmp/workstream-*-complete.txt files
 */
export function cleanupCompletionMarkers(threadIds: string[]): void {
  for (const threadId of threadIds) {
    const markerPath = getCompletionMarkerPath(threadId)
    try {
      if (existsSync(markerPath)) {
        unlinkSync(markerPath)
      }
    } catch {
      // Ignore cleanup errors - files may already be deleted
    }
  }
}

/**
 * Clean up session ID files for all threads
 * Called when batch completes to remove /tmp/workstream-*-session.txt files
 */
export function cleanupSessionFiles(threadIds: string[]): void {
  for (const threadId of threadIds) {
    const sessionPath = getSessionFilePath(threadId)
    try {
      if (existsSync(sessionPath)) {
        unlinkSync(sessionPath)
      }
    } catch {
      // Ignore cleanup errors - files may already be deleted
    }
  }
}

/**
 * Clean up synthesis-related temp files for all threads
 * Called when batch completes to remove:
 * - /tmp/workstream-{streamId}-{threadId}-synthesis.txt (legacy synthesis output)
 * - /tmp/workstream-{streamId}-{threadId}-synthesis.json (JSONL synthesis output)
 * - /tmp/workstream-{streamId}-{threadId}-synthesis.log (synthesis debug logs)
 * - /tmp/workstream-{streamId}-{threadId}-exported-session.json (exported session)
 * - /tmp/workstream-{streamId}-{threadId}-context.txt (extracted context)
 * - /tmp/workstream-{streamId}-{threadId}-working-session.txt (working agent session)
 */
export function cleanupSynthesisFiles(streamId: string, threadIds: string[]): void {
  for (const threadId of threadIds) {
    // Clean up legacy synthesis output file (.txt)
    const synthesisPath = getSynthesisOutputPath(streamId, threadId)
    try {
      if (existsSync(synthesisPath)) {
        unlinkSync(synthesisPath)
      }
    } catch {
      // Ignore cleanup errors - files may already be deleted
    }

    // Clean up JSONL synthesis output file (.json)
    const synthesisJsonPath = `/tmp/workstream-${streamId}-${threadId}-synthesis.json`
    try {
      if (existsSync(synthesisJsonPath)) {
        unlinkSync(synthesisJsonPath)
      }
    } catch {
      // Ignore cleanup errors
    }

    // Clean up synthesis log file
    const synthesisLogPath = getSynthesisLogPath(streamId, threadId)
    try {
      if (existsSync(synthesisLogPath)) {
        unlinkSync(synthesisLogPath)
      }
    } catch {
      // Ignore cleanup errors
    }

    // Clean up exported session file
    const exportedSessionPath = `/tmp/workstream-${streamId}-${threadId}-exported-session.json`
    try {
      if (existsSync(exportedSessionPath)) {
        unlinkSync(exportedSessionPath)
      }
    } catch {
      // Ignore cleanup errors
    }

    // Clean up extracted context file
    const extractedContextPath = `/tmp/workstream-${streamId}-${threadId}-context.txt`
    try {
      if (existsSync(extractedContextPath)) {
        unlinkSync(extractedContextPath)
      }
    } catch {
      // Ignore cleanup errors
    }

    // Clean up working agent session file
    const workingSessionPath = getWorkingAgentSessionPath(streamId, threadId)
    try {
      if (existsSync(workingSessionPath)) {
        unlinkSync(workingSessionPath)
      }
    } catch {
      // Ignore cleanup errors - files may already be deleted
    }
  }
}

/**
 * Create a new polling state
 */
export function createPollingState(): MarkerPollingState {
  return {
    active: true,
    completedThreadIds: new Set<string>(),
  }
}

/**
 * Poll for marker files to detect thread completion
 *
 * Watches for completion marker files created by opencode when a thread finishes.
 * With post-session synthesis, the marker is written AFTER synthesis completes,
 * so synthesis output is available when notifications fire.
 *
 * @param config Polling configuration
 * @param state Polling state (can be modified externally to stop polling)
 * @returns Promise that resolves when all threads complete or polling is stopped
 */
export async function pollMarkerFiles(
  config: MarkerPollingConfig,
  state: MarkerPollingState,
): Promise<void> {
  const { threadIds, notificationTracker, pollIntervalMs = 500, streamId } = config

  while (state.active) {
    for (const threadId of threadIds) {
      if (state.completedThreadIds.has(threadId)) continue

      const markerPath = getCompletionMarkerPath(threadId)
      if (existsSync(markerPath)) {
        state.completedThreadIds.add(threadId)
        
        // Check for synthesis output (only if streamId provided)
        let synthesisOutput: string | undefined
        if (streamId) {
          // Build path to .json file (instead of .txt)
          const synthesisJsonPath = `/tmp/workstream-${streamId}-${threadId}-synthesis.json`
          const synthesisLogPath = getSynthesisLogPath(streamId, threadId)
          
          if (existsSync(synthesisJsonPath)) {
            try {
              // Parse the JSONL output file
              const result = parseSynthesisOutputFile(synthesisJsonPath, synthesisLogPath)
              if (result.success && result.text) {
                synthesisOutput = result.text.trim()
              }
            } catch {
              // Ignore parse errors, synthesisOutput stays undefined
            }
          }
        }
        
        // If synthesis output exists, play synthesis notification with output
        // Otherwise, play regular thread_complete notification
        if (synthesisOutput) {
          notificationTracker?.playSynthesisComplete(threadId, synthesisOutput)
        } else {
          notificationTracker?.playThreadComplete(threadId)
        }
      }
    }

    // Check if ALL threads have marker files -> batch complete
    if (state.completedThreadIds.size === threadIds.length && threadIds.length > 0) {
      // Small delay so batch sound plays after thread sounds
      await Bun.sleep(100)
      notificationTracker?.playBatchComplete()
      // Stop polling once batch is complete
      state.active = false
      break
    }

    // Poll at configured interval
    await Bun.sleep(pollIntervalMs)
  }
}

/**
 * Start polling in the background (non-blocking)
 * Returns the polling promise and state for control
 */
export function startMarkerPolling(
  config: MarkerPollingConfig,
): { promise: Promise<void>; state: MarkerPollingState } {
  const state = createPollingState()
  const promise = pollMarkerFiles(config, state)
  return { promise, state }
}

/**
 * Stop polling gracefully
 * @param state The polling state to stop
 */
export function stopPolling(state: MarkerPollingState): void {
  state.active = false
}
