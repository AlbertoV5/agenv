/**
 * REPORT.md template generation and validation
 *
 * This module provides functions to:
 * - Generate REPORT.md templates from workstream metadata
 * - Parse existing REPORT.md files
 * - Validate report content
 */

import { join } from "path"
import { readFileSync } from "fs"
import { Lexer, type Token, type Tokens } from "marked"
import type {
  ReportTemplate,
  ReportStageAccomplishment,
  ReportFileReference,
  ReportValidation,
  StreamMetadata,
  StageDefinition,
  ConsolidateError,
} from "./types.ts"
import { loadIndex, findStream } from "./index.ts"
import { getWorkDir } from "./repo.ts"
import { parseStreamDocument } from "./stream-parser.ts"

/**
 * Generate a REPORT.md template skeleton from workstream metadata
 */
export function generateReportTemplate(
  repoRoot: string,
  streamId: string,
): string {
  const index = loadIndex(repoRoot)
  const stream = findStream(index, streamId)
  if (!stream) {
    throw new Error(`Workstream "${streamId}" not found`)
  }

  // Parse PLAN.md to get stage information
  const workDir = getWorkDir(repoRoot)
  const planPath = join(workDir, stream.id, "PLAN.md")
  const planContent = readFileSync(planPath, "utf-8")
  const errors: ConsolidateError[] = []
  const planDoc = parseStreamDocument(planContent, errors)

  if (!planDoc || errors.length > 0) {
    throw new Error(
      `Failed to parse PLAN.md: ${errors.map((e) => e.message).join(", ")}`,
    )
  }

  // Build the template
  const lines: string[] = []

  // Header
  lines.push(`# Report: ${stream.name}`)
  lines.push("")
  lines.push(`> **Stream ID:** ${stream.id} | **Reported:** ${new Date().toISOString().split("T")[0]}`)
  lines.push("")

  // Summary section
  lines.push("## Summary")
  lines.push("<!-- High-level summary of what was achieved -->")
  lines.push("")

  // Accomplishments section
  lines.push("## Accomplishments")
  lines.push("")

  // Add a subsection for each stage
  for (const stage of planDoc.stages) {
    const stagePrefix = stage.id.toString().padStart(2, "0")
    lines.push(`### Stage ${stagePrefix}: ${stage.name}`)
    lines.push("<!-- What was accomplished in this stage -->")
    lines.push("")
    lines.push("#### Key Changes")
    lines.push("- {description}")
    lines.push("")
  }

  // File References section
  lines.push("## File References")
  lines.push("")
  lines.push("| File | Changes |")
  lines.push("|------|---------|")
  lines.push("| `path/to/file.ts` | Description of changes |")
  lines.push("")

  // Issues & Blockers section
  lines.push("## Issues & Blockers")
  lines.push("<!-- Any issues encountered, bugs found, or blockers hit -->")
  lines.push("")

  // Next Steps section
  lines.push("## Next Steps")
  lines.push("<!-- Recommended follow-up work -->")
  lines.push("")

  return lines.join("\n")
}

/**
 * Parse an existing REPORT.md file and extract sections
 */
export function parseReport(
  repoRoot: string,
  streamId: string,
): ReportTemplate {
  const index = loadIndex(repoRoot)
  const stream = findStream(index, streamId)
  if (!stream) {
    throw new Error(`Workstream "${streamId}" not found`)
  }

  const workDir = getWorkDir(repoRoot)
  const reportPath = join(workDir, stream.id, "REPORT.md")
  const content = readFileSync(reportPath, "utf-8")

  // Parse using marked lexer
  const lexer = new Lexer()
  const tokens = lexer.lex(content)

  const report: ReportTemplate = {
    streamId: stream.id,
    streamName: stream.name,
    reportedDate: "",
    summary: "",
    accomplishments: [],
    fileReferences: [],
    issues: "",
    nextSteps: "",
  }

  let currentSection: string | null = null
  let currentStage: { stageNumber: number; stageName: string; description: string; keyChanges: string[] } | null = null
  let inKeyChanges = false

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (!token) continue

    // Extract stream ID and reported date from blockquote
    if (token.type === "blockquote") {
      const blockquote = token as Tokens.Blockquote
      const text = extractTextFromTokens(blockquote.tokens)
      const dateMatch = text.match(/\*\*Reported:\*\*\s*(\S+)/)
      if (dateMatch && dateMatch[1]) {
        report.reportedDate = dateMatch[1]
      }
    }

    // Track sections by heading
    if (token.type === "heading") {
      const heading = token as Tokens.Heading
      const text = heading.text

      if (heading.depth === 2) {
        // Main sections
        if (text === "Summary") {
          currentSection = "summary"
          currentStage = null
          inKeyChanges = false
        } else if (text === "Accomplishments") {
          currentSection = "accomplishments"
          currentStage = null
          inKeyChanges = false
        } else if (text === "File References") {
          currentSection = "fileReferences"
          currentStage = null
          inKeyChanges = false
        } else if (text.includes("Issues")) {
          currentSection = "issues"
          currentStage = null
          inKeyChanges = false
        } else if (text === "Next Steps") {
          currentSection = "nextSteps"
          currentStage = null
          inKeyChanges = false
        }
      } else if (heading.depth === 3 && currentSection === "accomplishments") {
        // Stage subsections
        const stageMatch = text.match(/Stage\s+(\d+):\s*(.+)/)
        if (stageMatch && stageMatch[1] && stageMatch[2]) {
          // Save previous stage if exists
          if (currentStage) {
            report.accomplishments.push({
              stageNumber: currentStage.stageNumber,
              stageName: currentStage.stageName,
              description: currentStage.description.trim(),
              keyChanges: currentStage.keyChanges,
            })
          }
          currentStage = {
            stageNumber: parseInt(stageMatch[1], 10),
            stageName: stageMatch[2],
            description: "",
            keyChanges: [],
          }
          inKeyChanges = false
        }
      } else if (heading.depth === 4 && currentStage && text === "Key Changes") {
        inKeyChanges = true
      }
    }

    // Extract content based on current section
    if (token.type === "paragraph") {
      const para = token as Tokens.Paragraph
      const text = para.text

      // Skip HTML comments
      if (text.startsWith("<!--")) continue

      if (currentSection === "summary") {
        report.summary += text + "\n"
      } else if (currentSection === "issues") {
        report.issues += text + "\n"
      } else if (currentSection === "nextSteps") {
        report.nextSteps += text + "\n"
      } else if (currentStage && !inKeyChanges) {
        currentStage.description += text + "\n"
      }
    }

    // Extract list items for key changes
    if (token.type === "list" && currentStage && inKeyChanges) {
      const list = token as Tokens.List
      for (const item of list.items) {
        const text = extractTextFromTokens(item.tokens)
        // Skip placeholder text
        if (!text.includes("{description}")) {
          currentStage.keyChanges.push(text.trim())
        }
      }
    }

    // Extract file references from table
    if (token.type === "table" && currentSection === "fileReferences") {
      const table = token as Tokens.Table
      for (const row of table.rows) {
        const cells = row.map((cell) => extractTextFromTokens(cell.tokens).trim())
        if (cells.length >= 2 && cells[0] && cells[1]) {
          const path = cells[0].replace(/`/g, "")
          const changes = cells[1]
          // Skip placeholder rows
          if (!path.includes("path/to/file")) {
            report.fileReferences.push({ path, changes })
          }
        }
      }
    }
  }

  // Save last stage if exists
  if (currentStage) {
    report.accomplishments.push({
      stageNumber: currentStage.stageNumber,
      stageName: currentStage.stageName,
      description: currentStage.description.trim(),
      keyChanges: currentStage.keyChanges,
    })
  }

  // Trim multiline strings
  report.summary = report.summary.trim()
  report.issues = report.issues.trim()
  report.nextSteps = report.nextSteps.trim()

  return report
}

/**
 * Validate a REPORT.md file to ensure required sections have content
 */
export function validateReport(
  repoRoot: string,
  streamId: string,
): ReportValidation {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const report = parseReport(repoRoot, streamId)

    // Check for required sections
    if (!report.summary || report.summary.length === 0) {
      errors.push("Summary section is empty or missing")
    }

    if (report.accomplishments.length === 0) {
      errors.push("No stage accomplishments found")
    } else {
      // Check each stage accomplishment
      for (const accomplishment of report.accomplishments) {
        if (!accomplishment.description || accomplishment.description.length === 0) {
          warnings.push(
            `Stage ${accomplishment.stageNumber.toString().padStart(2, "0")} (${accomplishment.stageName}) has no description`,
          )
        }
        if (accomplishment.keyChanges.length === 0) {
          warnings.push(
            `Stage ${accomplishment.stageNumber.toString().padStart(2, "0")} (${accomplishment.stageName}) has no key changes listed`,
          )
        }
      }
    }

    if (report.fileReferences.length === 0) {
      warnings.push("No file references documented")
    }

    // Issues and Next Steps are optional, just warn if they're empty
    if (!report.issues || report.issues.length === 0) {
      warnings.push("Issues & Blockers section is empty")
    }

    if (!report.nextSteps || report.nextSteps.length === 0) {
      warnings.push("Next Steps section is empty")
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to parse REPORT.md: ${error instanceof Error ? error.message : String(error)}`],
      warnings,
    }
  }
}

/**
 * Helper function to extract text from a list of tokens
 */
function extractTextFromTokens(tokens: Token[]): string {
  let text = ""
  for (const token of tokens) {
    if (token.type === "paragraph") {
      const para = token as Tokens.Paragraph
      text += para.text + " "
    } else if (token.type === "text") {
      const txt = token as Tokens.Text
      text += txt.text + " "
    } else if (token.type === "strong") {
      const strong = token as Tokens.Strong
      text += extractTextFromTokens(strong.tokens) + " "
    } else if (token.type === "em") {
      const em = token as Tokens.Em
      text += extractTextFromTokens(em.tokens) + " "
    } else if (token.type === "codespan") {
      const code = token as Tokens.Codespan
      text += code.text + " "
    }
  }
  return text.trim()
}
