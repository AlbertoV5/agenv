/**
 * Notification Tracker
 *
 * Tracks notifications that have already been played to prevent duplicates.
 * Used by multi.ts to prevent duplicate sounds when threads complete.
 */

import { type NotificationMetadata } from "./types"
import { playNotification } from "./manager"

/**
 * Tracks notifications that have already been played to prevent duplicates.
 *
 * This class ensures:
 * - Each thread only plays thread_complete once
 * - batch_complete only plays once per batch execution
 * - Error notifications are tracked per thread
 * - Synthesis notifications are tracked per thread
 *
 * Used by multi.ts to prevent duplicate sounds when:
 * - Thread completes normally
 * - User closes tmux session early
 * - Thread fails/errors
 */
export class NotificationTracker {
  /** Set of threadIds that have already played thread_complete */
  private notifiedThreadIds: Set<string> = new Set()

  /** Set of threadIds that have already played error notification */
  private errorNotifiedThreadIds: Set<string> = new Set()

  /** Set of threadIds that have already played thread_synthesis_complete */
  private synthesisNotifiedThreadIds: Set<string> = new Set()

  /** Whether batch_complete has already been played */
  private batchCompleteNotified: boolean = false

  /**
   * Check if a thread has already been notified for completion
   */
  hasThreadCompleteNotified(threadId: string): boolean {
    return this.notifiedThreadIds.has(threadId)
  }

  /**
   * Mark a thread as having played thread_complete notification
   */
  markThreadCompleteNotified(threadId: string): void {
    this.notifiedThreadIds.add(threadId)
  }

  /**
   * Check if a thread has already been notified for error
   */
  hasErrorNotified(threadId: string): boolean {
    return this.errorNotifiedThreadIds.has(threadId)
  }

  /**
   * Mark a thread as having played error notification
   */
  markErrorNotified(threadId: string): void {
    this.errorNotifiedThreadIds.add(threadId)
  }

  /**
   * Check if a thread has already been notified for synthesis complete
   */
  hasSynthesisCompleteNotified(threadId: string): boolean {
    return this.synthesisNotifiedThreadIds.has(threadId)
  }

  /**
   * Mark a thread as having played thread_synthesis_complete notification
   */
  markSynthesisCompleteNotified(threadId: string): void {
    this.synthesisNotifiedThreadIds.add(threadId)
  }

  /**
   * Check if batch_complete has already been played
   */
  hasBatchCompleteNotified(): boolean {
    return this.batchCompleteNotified
  }

  /**
   * Mark batch_complete as having been played
   */
  markBatchCompleteNotified(): void {
    this.batchCompleteNotified = true
  }

  /**
   * Play thread_complete notification if not already played for this thread.
   * Returns true if notification was played, false if already notified.
   */
  playThreadComplete(threadId: string): boolean {
    if (this.hasThreadCompleteNotified(threadId)) {
      return false
    }
    this.markThreadCompleteNotified(threadId)
    playNotification("thread_complete")
    return true
  }

  /**
   * Play error notification if not already played for this thread.
   * Returns true if notification was played, false if already notified.
   */
  playError(threadId: string): boolean {
    if (this.hasErrorNotified(threadId)) {
      return false
    }
    this.markErrorNotified(threadId)
    playNotification("error")
    return true
  }

  /**
   * Play batch_complete notification if not already played.
   * Returns true if notification was played, false if already notified.
   */
  playBatchComplete(): boolean {
    if (this.hasBatchCompleteNotified()) {
      return false
    }
    this.markBatchCompleteNotified()
    playNotification("batch_complete")
    return true
  }

  /**
   * Play thread_synthesis_complete notification if not already played for this thread.
   * Passes through synthesis output data to providers for future TTS integration.
   * Returns true if notification was played, false if already notified.
   * @param threadId The thread identifier
   * @param synthesisOutput The synthesis output text to pass to providers
   */
  playSynthesisComplete(threadId: string, synthesisOutput?: string): boolean {
    if (this.hasSynthesisCompleteNotified(threadId)) {
      return false
    }
    this.markSynthesisCompleteNotified(threadId)
    playNotification("thread_synthesis_complete", {
      threadId,
      synthesisOutput,
    })
    return true
  }

  /**
   * Reset the tracker state (useful for testing)
   */
  reset(): void {
    this.notifiedThreadIds.clear()
    this.errorNotifiedThreadIds.clear()
    this.synthesisNotifiedThreadIds.clear()
    this.batchCompleteNotified = false
  }

  /**
   * Get the count of threads that have been notified for completion
   */
  getNotifiedThreadCount(): number {
    return this.notifiedThreadIds.size
  }

  /**
   * Get the count of threads that have been notified for errors
   */
  getErrorNotifiedThreadCount(): number {
    return this.errorNotifiedThreadIds.size
  }

  /**
   * Get the count of threads that have been notified for synthesis complete
   */
  getSynthesisNotifiedThreadCount(): number {
    return this.synthesisNotifiedThreadIds.size
  }
}
