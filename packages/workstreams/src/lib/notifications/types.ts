/**
 * Notification system types, interfaces, and configuration
 *
 * This file contains all shared types used by the notification system.
 * Separated for easier parallel editing of provider implementations.
 */

import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { homedir } from "os"

// ============================================
// NOTIFICATION TYPES
// ============================================

/**
 * Events that can trigger notifications
 */
export type NotificationEvent =
  | "thread_complete"
  | "batch_complete"
  | "error"
  | "thread_synthesis_complete"

/**
 * Optional metadata that can be passed with notifications
 * Used to provide additional context (e.g., synthesis output for TTS)
 */
export interface NotificationMetadata {
  /** Synthesis output text for TTS providers */
  synthesisOutput?: string
  /** Thread identifier */
  threadId?: string
  /** Additional custom data */
  [key: string]: unknown
}

/**
 * Provider interface for notification implementations
 * Implementations should be non-blocking (fire-and-forget)
 */
export interface NotificationProvider {
  /** Provider name for identification */
  readonly name: string

  /**
   * Play a notification for the given event
   * Should be non-blocking - spawn process and don't await
   * @param event The notification event type
   * @param metadata Optional metadata (e.g., synthesis output for future TTS)
   */
  playNotification(event: NotificationEvent, metadata?: NotificationMetadata): void

  /**
   * Check if the provider is available on the current system
   */
  isAvailable(): boolean
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Custom sound mappings per event
 */
export interface SoundMappings {
  thread_complete?: string
  batch_complete?: string
  error?: string
  thread_synthesis_complete?: string
}

/**
 * External API provider configuration
 */
export interface ExternalApiConfig {
  enabled: boolean
  webhook_url?: string
  headers?: Record<string, string>
  events?: NotificationEvent[]
}

/**
 * Configuration file structure (~/.config/agenv/notifications.json)
 */
export interface NotificationConfig {
  /** Enable/disable all notifications */
  enabled?: boolean

  /** Custom sound file paths per event */
  sounds?: SoundMappings

  /** External API configuration */
  external_api?: ExternalApiConfig
}

/**
 * Default configuration path
 */
export const CONFIG_PATH = join(homedir(), ".config", "agenv", "notifications.json")

/**
 * Load notification configuration from disk
 * Returns empty config if file doesn't exist
 */
export function loadConfig(configPath: string = CONFIG_PATH): NotificationConfig {
  if (!existsSync(configPath)) {
    return {}
  }

  try {
    const content = readFileSync(configPath, "utf-8")
    return JSON.parse(content) as NotificationConfig
  } catch {
    // Invalid JSON or read error - return default config
    return {}
  }
}

/**
 * Default macOS system sounds for each event type
 * Located in /System/Library/Sounds/
 */
export const DEFAULT_SOUNDS: Record<NotificationEvent, string> = {
  thread_complete: "/System/Library/Sounds/Glass.aiff",
  batch_complete: "/System/Library/Sounds/Hero.aiff",
  error: "/System/Library/Sounds/Basso.aiff",
  thread_synthesis_complete: "/System/Library/Sounds/Purr.aiff",
}

/**
 * Webhook payload for external API notifications
 */
export interface WebhookPayload {
  event: NotificationEvent
  timestamp: string
  metadata?: Record<string, unknown>
  /** Synthesis output text for TTS providers or external consumers */
  synthesisOutput?: string
  /** Thread identifier associated with this notification */
  threadId?: string
}
