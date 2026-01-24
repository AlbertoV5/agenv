/**
 * Synthesis configuration types
 *
 * Synthesis agents wrap working agents to provide:
 * - Pre-work context preparation
 * - Post-work output summarization
 * - Session continuity management
 */

/**
 * Output storage settings for synthesis
 */
export interface SynthesisOutputConfig {
  /** Store synthesis output in threads.json (default: true) */
  store_in_threads?: boolean
}

/**
 * Synthesis configuration
 * Controls whether synthesis agents are enabled for workstream execution
 * Stored in work/synthesis.json within each repository
 */
export interface SynthesisConfig {
  /** Enable/disable synthesis agents globally */
  enabled: boolean
  /** Override default synthesis agent name from agents.yaml */
  agent?: string
  /** Output storage settings */
  output?: SynthesisOutputConfig
}

/**
 * Thread synthesis result
 * Stored in ThreadMetadata when synthesis completes for a thread
 */
export interface ThreadSynthesis {
  /** The synthesis agent's opencode session ID */
  sessionId: string
  /** The synthesis output text */
  output: string
  /** When synthesis completed (ISO timestamp) */
  completedAt: string
}
