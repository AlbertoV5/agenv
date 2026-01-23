/**
 * Notification system for workstream events
 *
 * Provides audio and external notifications for workstream lifecycle events.
 * Supports macOS system sounds via afplay and extensible provider architecture.
 */

import { spawn, type ChildProcess } from "child_process"
import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { homedir } from "os"

// ============================================
// NOTIFICATION TYPES
// ============================================

/**
 * Events that can trigger notifications
 */
export type NotificationEvent = "thread_complete" | "batch_complete" | "error"

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
   */
  playNotification(event: NotificationEvent): void

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

// ============================================
// MACOS SOUND PROVIDER
// ============================================

/**
 * Default macOS system sounds for each event type
 * Located in /System/Library/Sounds/
 */
export const DEFAULT_SOUNDS: Record<NotificationEvent, string> = {
  thread_complete: "/System/Library/Sounds/Glass.aiff",
  batch_complete: "/System/Library/Sounds/Hero.aiff",
  error: "/System/Library/Sounds/Basso.aiff",
}

/**
 * MacOS sound notification provider using afplay
 *
 * Uses non-blocking playback - spawns process and detaches immediately.
 * Falls back to system sounds if custom paths don't exist.
 */
export class MacOSSoundProvider implements NotificationProvider {
  readonly name = "macos-sound"

  private soundMappings: SoundMappings
  private enabled: boolean

  constructor(config?: NotificationConfig) {
    this.soundMappings = config?.sounds ?? {}
    this.enabled = config?.enabled !== false // Enabled by default
  }

  /**
   * Check if afplay is available (macOS only)
   */
  isAvailable(): boolean {
    return process.platform === "darwin"
  }

  /**
   * Play notification sound for the given event
   * Non-blocking - spawns afplay process and detaches
   */
  playNotification(event: NotificationEvent): void {
    if (!this.enabled || !this.isAvailable()) {
      return
    }

    const soundPath = this.getSoundPath(event)
    if (!existsSync(soundPath)) {
      return
    }

    // Spawn afplay and detach - fire and forget
    const child: ChildProcess = spawn("afplay", [soundPath], {
      detached: true,
      stdio: "ignore",
    })

    // Unref to prevent parent from waiting
    child.unref()
  }

  /**
   * Get the sound file path for an event
   * Uses custom mapping if available, falls back to defaults
   */
  private getSoundPath(event: NotificationEvent): string {
    const customPath = this.soundMappings[event]

    // If custom path is set and exists, use it
    if (customPath && existsSync(customPath)) {
      return customPath
    }

    // Fall back to default system sound
    return DEFAULT_SOUNDS[event]
  }
}

// ============================================
// EXTERNAL API PROVIDER (STUB)
// ============================================

/**
 * Webhook payload for external API notifications
 */
export interface WebhookPayload {
  event: NotificationEvent
  timestamp: string
  metadata?: Record<string, unknown>
}

/**
 * External API notification provider stub
 *
 * Placeholder for future webhook/API integrations.
 * Can send notifications to external services like Slack, Discord, etc.
 *
 * TODO: Implement actual HTTP requests when needed
 */
export class ExternalApiProvider implements NotificationProvider {
  readonly name = "external-api"

  private config: ExternalApiConfig

  constructor(config?: ExternalApiConfig) {
    this.config = config ?? { enabled: false }
  }

  /**
   * Check if external API is configured and enabled
   */
  isAvailable(): boolean {
    return this.config.enabled && !!this.config.webhook_url
  }

  /**
   * Send notification to external API
   * Currently a stub - logs intent but doesn't make HTTP requests
   */
  playNotification(event: NotificationEvent): void {
    if (!this.isAvailable()) {
      return
    }

    // Check if this event type is enabled
    if (this.config.events && !this.config.events.includes(event)) {
      return
    }

    // Stub: In future, this would make an HTTP POST request
    // const payload: WebhookPayload = {
    //   event,
    //   timestamp: new Date().toISOString(),
    // }
    // fetch(this.config.webhook_url!, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', ...this.config.headers },
    //   body: JSON.stringify(payload),
    // }).catch(() => {}) // Fire and forget
  }

  /**
   * Build webhook payload for an event
   */
  buildPayload(event: NotificationEvent, metadata?: Record<string, unknown>): WebhookPayload {
    return {
      event,
      timestamp: new Date().toISOString(),
      metadata,
    }
  }
}

// ============================================
// NOTIFICATION MANAGER
// ============================================

/**
 * Central notification manager
 *
 * Manages multiple notification providers and dispatches events to all of them.
 * Loads configuration automatically and initializes default providers.
 */
export class NotificationManager {
  private providers: NotificationProvider[] = []
  private config: NotificationConfig

  constructor(config?: NotificationConfig) {
    this.config = config ?? loadConfig()
    this.initializeDefaultProviders()
  }

  /**
   * Initialize default providers based on configuration
   */
  private initializeDefaultProviders(): void {
    // Always add macOS sound provider (it checks availability internally)
    this.providers.push(new MacOSSoundProvider(this.config))

    // Add external API provider if configured
    if (this.config.external_api) {
      this.providers.push(new ExternalApiProvider(this.config.external_api))
    }
  }

  /**
   * Add a custom notification provider
   */
  addProvider(provider: NotificationProvider): void {
    this.providers.push(provider)
  }

  /**
   * Remove a provider by name
   */
  removeProvider(name: string): void {
    this.providers = this.providers.filter((p) => p.name !== name)
  }

  /**
   * Get all registered providers
   */
  getProviders(): NotificationProvider[] {
    return [...this.providers]
  }

  /**
   * Play notification across all available providers
   * Non-blocking - each provider handles its own async behavior
   */
  playNotification(event: NotificationEvent): void {
    if (this.config.enabled === false) {
      return
    }

    for (const provider of this.providers) {
      if (provider.isAvailable()) {
        provider.playNotification(event)
      }
    }
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

// Singleton instance for simple usage
let defaultManager: NotificationManager | null = null

/**
 * Get or create the default notification manager
 */
export function getNotificationManager(): NotificationManager {
  if (!defaultManager) {
    defaultManager = new NotificationManager()
  }
  return defaultManager
}

/**
 * Reset the default notification manager (useful for testing)
 */
export function resetNotificationManager(): void {
  defaultManager = null
}

/**
 * Play a notification for the given event
 * Uses the default notification manager
 *
 * @example
 * // Play thread completion sound
 * playNotification('thread_complete')
 *
 * // Play error sound
 * playNotification('error')
 */
export function playNotification(event: NotificationEvent): void {
  getNotificationManager().playNotification(event)
}
