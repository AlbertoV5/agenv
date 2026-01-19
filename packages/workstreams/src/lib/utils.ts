/**
 * Shared utility functions for workstream management
 */

import type { TaskStatus, StageStatus } from "./types.ts"

/**
 * Convert kebab-case to Title Case
 */
export function toTitleCase(kebab: string): string {
  return kebab
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getDateString(): string {
  return new Date().toISOString().split("T")[0] ?? ""
}

/**
 * Validate stream name is kebab-case
 */
export function validateStreamName(name: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)
}

/**
 * Parse a positive integer from string
 */
export function parsePositiveInt(value: string, name: string): number {
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 1) {
    throw new Error(`${name} must be a positive integer. Got: "${value}"`)
  }
  return num
}

/**
 * Convert status to markdown checkbox
 */
export function statusToCheckbox(status: TaskStatus): string {
  switch (status) {
    case "completed":
      return "[x]"
    case "in_progress":
      return "[~]"
    case "blocked":
      return "[!]"
    case "cancelled":
      return "[-]"
    default:
      return "[ ]"
  }
}

/**
 * Parse task status from markdown checkbox
 */
export function parseTaskStatus(line: string): TaskStatus {
  if (line.includes("[x]") || line.includes("[X]")) return "completed"
  if (line.includes("[~]")) return "in_progress"
  if (line.includes("[!]")) return "blocked"
  if (line.includes("[-]")) return "cancelled"
  return "pending"
}

/**
 * Parse stage status from status text
 */
export function parseStageStatus(statusText: string): StageStatus {
  const lower = statusText.toLowerCase()
  if (lower.includes("complete") || lower.includes("✅")) return "complete"
  if (lower.includes("progress") || lower.includes("🔄")) return "in_progress"
  if (lower.includes("blocked") || lower.includes("⚠️")) return "blocked"
  return "pending"
}

/**
 * Set a nested field value using dot notation
 */
export function setNestedField(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split(".")
  let current: Record<string, unknown> = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!part) continue
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {}
    }
    current = current[part] as Record<string, unknown>
  }

  const lastPart = parts[parts.length - 1]
  if (!lastPart) return
  current[lastPart] = value
}

/**
 * Get a nested field value using dot notation
 */
export function getNestedField(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  const parts = path.split(".")
  let current: unknown = obj

  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Parse value string to appropriate type (for CLI inputs)
 */
export function parseValue(value: string): unknown {
  // Boolean
  if (value === "true") return true
  if (value === "false") return false

  // Number
  if (/^-?\d+$/.test(value)) return parseInt(value, 10)
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value)

  // JSON
  if (value.startsWith("{") || value.startsWith("[")) {
    try {
      return JSON.parse(value)
    } catch {
      // Fall through to string
    }
  }

  // String
  return value
}
