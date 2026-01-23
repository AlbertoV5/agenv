/**
 * Notification System
 *
 * Modular notification system for workstream events.
 * Split into separate files for easier parallel editing:
 *
 * - types.ts: Types, interfaces, and configuration
 * - providers/macos-sound.ts: MacOS sound provider with queue
 * - providers/external-api.ts: External webhook provider
 * - manager.ts: Central notification manager
 * - tracker.ts: Deduplication tracker
 *
 * @example
 * // Simple usage
 * import { playNotification } from './notifications'
 * playNotification('thread_complete')
 *
 * // With manager
 * import { NotificationManager } from './notifications'
 * const manager = new NotificationManager()
 * manager.playNotification('batch_complete')
 *
 * // With tracker for deduplication
 * import { NotificationTracker } from './notifications'
 * const tracker = new NotificationTracker()
 * tracker.playThreadComplete('01.01.01')
 */

// Types and configuration
export {
  type NotificationEvent,
  type NotificationMetadata,
  type NotificationProvider,
  type SoundMappings,
  type ExternalApiConfig,
  type NotificationConfig,
  type WebhookPayload,
  CONFIG_PATH,
  DEFAULT_SOUNDS,
  loadConfig,
} from "./types"

// Providers
export { MacOSSoundProvider } from "./providers/macos-sound"
export { ExternalApiProvider } from "./providers/external-api"

// Manager and convenience functions
export {
  NotificationManager,
  getNotificationManager,
  resetNotificationManager,
  playNotification,
} from "./manager"

// Tracker for deduplication
export { NotificationTracker } from "./tracker"
