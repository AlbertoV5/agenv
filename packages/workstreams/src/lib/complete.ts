/**
 * Workstream completion operations
 */

import type { StreamMetadata } from "./types.ts"
import { loadIndex, saveIndex } from "./index.ts"
import { setNestedField, getNestedField, parseValue } from "./utils.ts"

export interface CompleteStreamArgs {
  repoRoot: string
  streamId: string
}

export interface CompleteStreamResult {
  streamId: string
  completedAt: string
}

/**
 * Mark a workstream as complete
 * Sets the stream status to "completed" explicitly
 */
export function completeStream(args: CompleteStreamArgs): CompleteStreamResult {
  const index = loadIndex(args.repoRoot)
  const streamIndex = index.streams.findIndex(
    (s) => s.id === args.streamId || s.name === args.streamId
  )

  if (streamIndex === -1) {
    throw new Error(`Workstream "${args.streamId}" not found`)
  }

  const stream = index.streams[streamIndex]
  if (!stream) {
    throw new Error(`Workstream at index ${streamIndex} not found`)
  }

  const now = new Date().toISOString()

  // Set status to completed
  stream.status = "completed"
  stream.updated_at = now
  saveIndex(args.repoRoot, index)

  return {
    streamId: stream.id,
    completedAt: now,
  }
}

export interface UpdateIndexFieldArgs {
  repoRoot: string
  streamId: string
  field: string
  value: string
}

export interface UpdateIndexFieldResult {
  streamId: string
  field: string
  previousValue: unknown
  newValue: unknown
}

/**
 * Update a specific field in a stream's index entry
 */
export function updateIndexField(
  args: UpdateIndexFieldArgs
): UpdateIndexFieldResult {
  const index = loadIndex(args.repoRoot)
  const streamIndex = index.streams.findIndex(
    (s) => s.id === args.streamId || s.name === args.streamId
  )

  if (streamIndex === -1) {
    throw new Error(`Workstream "${args.streamId}" not found`)
  }

  const stream = index.streams[streamIndex]
  if (!stream) {
    throw new Error(`Workstream at index ${streamIndex} not found`)
  }

  // Get current value
  const currentValue = getNestedField(
    stream as unknown as Record<string, unknown>,
    args.field
  )
  const parsedValue = parseValue(args.value)

  // Update the field
  setNestedField(
    stream as unknown as Record<string, unknown>,
    args.field,
    parsedValue
  )

  // Update timestamps
  stream.updated_at = new Date().toISOString()
  saveIndex(args.repoRoot, index)

  return {
    streamId: stream.id,
    field: args.field,
    previousValue: currentValue,
    newValue: parsedValue,
  }
}

/**
 * Format stream info for display
 */
export function formatStreamInfo(stream: StreamMetadata): string {
  const lines: string[] = [
    `Workstream: ${stream.id}`,
    `|- name: ${stream.name}`,
    `|- order: ${stream.order}`,
    `|- size: ${stream.size}`,
    `|- path: ${stream.path}`,
    `|- created_at: ${stream.created_at}`,
    `|- updated_at: ${stream.updated_at}`,
    `|- session_estimated:`,
    `|  |- length: ${stream.session_estimated.length}`,
    `|  |- unit: ${stream.session_estimated.unit}`,
    `|  |- session_minutes: [${stream.session_estimated.session_minutes.join(", ")}]`,
    `|  +- session_iterations: [${stream.session_estimated.session_iterations.join(", ")}]`,
    `+- generated_by:`,
    `   +- workstreams: ${stream.generated_by.workstreams}`,
  ]

  return lines.join("\n")
}
