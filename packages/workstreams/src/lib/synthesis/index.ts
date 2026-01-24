/**
 * Synthesis module
 *
 * Provides types and utilities for synthesis agents that wrap working agents
 * to provide context preparation and output summarization.
 */

export type {
  SynthesisConfig,
  SynthesisOutputConfig,
  ThreadSynthesis,
} from "./types.js"

export type {
  JsonlTextEvent,
  JsonlStepEvent,
  SynthesisParseResult,
} from "./output.js"

export { parseSynthesisJsonl, parseSynthesisOutputFile } from "./output.js"
