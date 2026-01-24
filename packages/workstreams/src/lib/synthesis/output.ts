/**
 * JSONL output parsing for synthesis sessions
 *
 * Parses JSONL output from `opencode run --format json` to extract
 * synthesis text results.
 */

import { readFileSync, appendFileSync, existsSync } from "node:fs"

/**
 * Base JSONL event structure
 */
interface JsonlEvent {
  type: string
}

/**
 * Text event with content
 */
export interface JsonlTextEvent extends JsonlEvent {
  type: "text"
  part: {
    text: string
  }
}

/**
 * Step start event
 */
export interface JsonlStepEvent extends JsonlEvent {
  type: "step_start" | "step_finish"
  [key: string]: unknown
}

/**
 * Result of parsing synthesis JSONL output
 */
export interface SynthesisParseResult {
  /** Concatenated text from all text events */
  text: string
  /** Debug logs collected during parsing */
  logs: string[]
  /** Whether parsing succeeded */
  success: boolean
}

/**
 * Parse JSONL content and extract text events
 *
 * @param content - JSONL string content
 * @returns Parse result with extracted text
 */
export function parseSynthesisJsonl(content: string): SynthesisParseResult {
  const logs: string[] = []
  const textParts: string[] = []
  let success = true

  logs.push(`Starting JSONL parse (${content.length} bytes)`)

  const lines = content.split("\n").filter((line) => line.trim() !== "")
  logs.push(`Found ${lines.length} non-empty lines`)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    try {
      const event = JSON.parse(line) as JsonlEvent

      if (event.type === "text") {
        const textEvent = event as JsonlTextEvent
        if (textEvent.part?.text) {
          textParts.push(textEvent.part.text)
          logs.push(
            `Line ${i + 1}: Extracted text (${textEvent.part.text.length} chars)`
          )
        } else {
          logs.push(`Line ${i + 1}: Text event missing part.text field`)
        }
      } else {
        logs.push(`Line ${i + 1}: Skipped event type "${event.type}"`)
      }
    } catch (error) {
      logs.push(
        `Line ${i + 1}: JSON parse error - ${error instanceof Error ? error.message : String(error)}`
      )
      success = false
    }
  }

  const text = textParts.join("")
  logs.push(`Parsing complete: ${textParts.length} text parts, ${text.length} total chars`)

  return {
    text,
    logs,
    success,
  }
}

/**
 * Read and parse synthesis output file
 *
 * @param filePath - Path to JSONL output file
 * @param logPath - Optional path to write debug logs
 * @returns Parse result with extracted text
 */
export function parseSynthesisOutputFile(
  filePath: string,
  logPath?: string
): SynthesisParseResult {
  const logs: string[] = []

  try {
    // Check if file exists
    if (!existsSync(filePath)) {
      logs.push(`ERROR: File not found: ${filePath}`)
      return {
        text: "",
        logs,
        success: false,
      }
    }

    logs.push(`Reading file: ${filePath}`)
    const content = readFileSync(filePath, "utf-8")
    logs.push(`Read ${content.length} bytes`)

    // Parse the content
    const result = parseSynthesisJsonl(content)

    // Merge logs
    const allLogs = [...logs, ...result.logs]

    // Write logs if path provided
    if (logPath) {
      try {
        const logContent = allLogs.join("\n") + "\n"
        appendFileSync(logPath, logContent)
        allLogs.push(`Debug logs written to: ${logPath}`)
      } catch (error) {
        allLogs.push(
          `WARNING: Failed to write logs to ${logPath}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    return {
      text: result.text,
      logs: allLogs,
      success: result.success,
    }
  } catch (error) {
    logs.push(
      `ERROR: Failed to read file: ${error instanceof Error ? error.message : String(error)}`
    )
    return {
      text: "",
      logs,
      success: false,
    }
  }
}
