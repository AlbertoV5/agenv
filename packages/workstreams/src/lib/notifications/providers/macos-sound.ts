/**
 * MacOS Sound Provider
 *
 * Plays notification sounds using macOS afplay command.
 * Implements sound queueing to prevent overlapping sounds when
 * multiple threads complete simultaneously.
 */

import { spawn, type ChildProcess } from "child_process"
import { existsSync } from "fs"
import {
  type NotificationProvider,
  type NotificationEvent,
  type NotificationMetadata,
  type NotificationConfig,
  type SoundMappings,
  DEFAULT_SOUNDS,
} from "../types"

/**
 * MacOS sound notification provider using afplay
 *
 * Features:
 * - Sound queueing to prevent overlapping playback
 * - Sequential playback via afplay exit event handling
 * - Falls back to system sounds if custom paths don't exist
 * - Prepares for future TTS integration where summaries would be read sequentially
 */
export class MacOSSoundProvider implements NotificationProvider {
  readonly name = "macos-sound"

  private soundMappings: SoundMappings
  private enabled: boolean
  private queue: string[] = []
  private isPlaying: boolean = false

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
   * Queues sounds to prevent overlapping - plays sequentially
   * @param event The notification event type
   * @param _metadata Optional metadata (unused by sound provider, reserved for future TTS)
   */
  playNotification(event: NotificationEvent, _metadata?: NotificationMetadata): void {
    if (!this.enabled || !this.isAvailable()) {
      return
    }

    const soundPath = this.getSoundPath(event)
    if (!existsSync(soundPath)) {
      return
    }

    // Add sound to queue
    this.queue.push(soundPath)

    // Start playing if not already playing
    if (!this.isPlaying) {
      this.playNext()
    }
  }

  /**
   * Play the next sound from the queue
   * Called when current sound finishes or when queue is first populated
   */
  private playNext(): void {
    // Get next sound from queue
    const soundPath = this.queue.shift()
    if (!soundPath) {
      this.isPlaying = false
      return
    }

    this.isPlaying = true

    // Spawn afplay without detaching so we can listen for exit
    const child: ChildProcess = spawn("afplay", [soundPath], {
      stdio: "ignore",
    })

    // When sound finishes, play next in queue
    child.on("exit", () => {
      this.playNext()
    })

    // Handle errors by moving to next sound
    child.on("error", () => {
      this.playNext()
    })
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

  /**
   * Get the current queue length (useful for testing)
   */
  getQueueLength(): number {
    return this.queue.length
  }

  /**
   * Check if currently playing a sound (useful for testing)
   */
  getIsPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * Clear the queue and reset state (useful for testing)
   */
  clearQueue(): void {
    this.queue = []
    this.isPlaying = false
  }
}
