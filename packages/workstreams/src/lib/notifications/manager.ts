/**
 * Notification Manager
 *
 * Central manager that dispatches notifications to all registered providers.
 */

import {
  type NotificationProvider,
  type NotificationEvent,
  type NotificationMetadata,
  type NotificationConfig,
  loadConfig,
} from "./types"
import { MacOSSoundProvider } from "./providers/macos-sound"
import { ExternalApiProvider } from "./providers/external-api"

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
   * @param event The notification event type
   * @param metadata Optional metadata to pass to providers (e.g., synthesis output)
   */
  playNotification(event: NotificationEvent, metadata?: NotificationMetadata): void {
    if (this.config.enabled === false) {
      return
    }

    for (const provider of this.providers) {
      if (provider.isAvailable()) {
        provider.playNotification(event, metadata)
      }
    }
  }

  /**
   * Helper method to play thread_synthesis_complete notification with synthesis output.
   * Convenience wrapper that sets up the correct event type and metadata structure.
   * This sets up the interface for a future TTSProvider to receive summaries.
   *
   * @param threadId The thread identifier
   * @param synthesisOutput The synthesis output text for TTS providers
   *
   * @example
   * manager.playSynthesisComplete('01.01.01', 'Thread completed: implemented feature X')
   */
  playSynthesisComplete(threadId: string, synthesisOutput: string): void {
    this.playNotification("thread_synthesis_complete", {
      threadId,
      synthesisOutput,
    })
  }
}

// ============================================
// SINGLETON & CONVENIENCE FUNCTIONS
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
 * @param event The notification event type
 * @param metadata Optional metadata to pass to providers (e.g., synthesis output)
 *
 * @example
 * // Play thread completion sound
 * playNotification('thread_complete')
 *
 * // Play error sound
 * playNotification('error')
 *
 * // Play synthesis complete with output for TTS
 * playNotification('thread_synthesis_complete', { synthesisOutput: 'Thread completed successfully' })
 */
export function playNotification(event: NotificationEvent, metadata?: NotificationMetadata): void {
  getNotificationManager().playNotification(event, metadata)
}
