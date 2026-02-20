/**
 * macOS Notification Center Provider
 *
 * Uses osascript to display native macOS Notification Center notifications.
 * Always available on macOS without external dependencies.
 */

import { spawn } from "child_process"
import {
  type NotificationProvider,
  type NotificationEvent,
  type NotificationMetadata,
  type NotificationCenterConfig,
} from "../types"

/**
 * Human-readable titles for notification events
 */
const EVENT_TITLES: Record<NotificationEvent, string> = {
  thread_complete: "Thread Complete",
  batch_complete: "Batch Complete",
  error: "Error",
  thread_synthesis_complete: "Synthesis Complete",
}

/**
 * Human-readable messages for notification events
 */
const EVENT_MESSAGES: Record<NotificationEvent, string> = {
  thread_complete: "A thread has completed successfully",
  batch_complete: "Batch processing complete",
  error: "An error occurred during processing",
  thread_synthesis_complete: "Thread synthesis has completed",
}

/**
 * macOS Notification Center provider using osascript
 *
 * Features:
 * - No external dependencies (uses built-in osascript)
 * - Always available on macOS
 * - Supports title, message, and sound
 * - Includes synthesis output in notification body when available
 */
export class MacOSNotificationCenterProvider implements NotificationProvider {
  readonly name = "macos-notification-center"

  private config: NotificationCenterConfig

  constructor(config?: NotificationCenterConfig) {
    this.config = config ?? { enabled: true }
  }

  /**
   * Check if osascript is available (macOS only)
   */
  isAvailable(): boolean {
    return process.platform === "darwin"
  }

  /**
   * Play notification using osascript
   * @param event The notification event type
   * @param metadata Optional metadata (e.g., synthesis output for message body)
   */
  playNotification(event: NotificationEvent, metadata?: NotificationMetadata): void {
    if (!this.config.enabled) {
      return
    }

    if (!this.isAvailable()) {
      return
    }

    const title = EVENT_TITLES[event]
    let message = EVENT_MESSAGES[event]

    // Include thread ID if available
    if (metadata?.threadId) {
      message = `Thread ${metadata.threadId}: ${message}`
    }

    // Include synthesis output if available and not too long
    if (metadata?.synthesisOutput) {
      const synthesis = metadata.synthesisOutput
      if (synthesis.length <= 200) {
        message = synthesis
      } else {
        message = synthesis.substring(0, 197) + "..."
      }
    }

    // Escape special characters for AppleScript
    const escapedTitle = this.escapeAppleScript(title)
    const escapedMessage = this.escapeAppleScript(message)

    // Build osascript command
    const script = `display notification "${escapedMessage}" with title "${escapedTitle}" sound name "default"`

    // Spawn osascript and detach
    spawn("osascript", ["-e", script], {
      stdio: "ignore",
      detached: true,
    }).unref()
  }

  /**
   * Escape special characters for AppleScript strings
   * Handles backslashes, double quotes, and newlines
   */
  private escapeAppleScript(str: string): string {
    return str
      .replace(/\\/g, "\\\\") // Escape backslashes first
      .replace(/"/g, '\\"') // Escape double quotes
      .replace(/\n/g, "\\n") // Escape newlines
      .replace(/\r/g, "\\r") // Escape carriage returns
  }
}
