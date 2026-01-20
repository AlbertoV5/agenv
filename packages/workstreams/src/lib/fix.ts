/**
 * Fix stage generation logic
 */

import { readFileSync, writeFileSync } from "fs"
import { getStreamPlanMdPath } from "./consolidate.ts"
import { parseStreamDocument } from "./stream-parser.ts"
import type { ConsolidateError } from "./types.ts"

export interface FixStageOptions {
  targetStage: number
  name: string
  description?: string
}

export function appendFixBatch(
  repoRoot: string,
  streamId: string,
  options: FixStageOptions,
): { success: boolean; newBatchNumber: number; message: string } {
  const planPath = getStreamPlanMdPath(repoRoot, streamId)
  const content = readFileSync(planPath, "utf-8")
  const errors: ConsolidateError[] = []

  const doc = parseStreamDocument(content, errors)
  if (!doc) {
    return {
      success: false,
      newBatchNumber: 0,
      message: "Failed to parse PLAN.md",
    }
  }

  const stage = doc.stages.find((s) => s.id === options.targetStage)
  if (!stage) {
    return {
      success: false,
      newBatchNumber: 0,
      message: `Stage ${options.targetStage} not found`,
    }
  }

  const lastBatch = stage.batches[stage.batches.length - 1]
  const newBatchNumber = (lastBatch ? lastBatch.id : -1) + 1
  const newBatchPrefix = newBatchNumber.toString().padStart(2, "0")
  const stageIdPadded = options.targetStage.toString().padStart(2, "0")

  const template = `
##### Batch ${newBatchPrefix}: Fix - ${options.name}
###### Thread 01: Fix Implementation
**Summary:**
Addressing issues in Stage ${stageIdPadded}.
${options.description || "Fixes and improvements."}

**Details:**
- [ ] Analyze root cause
- [ ] Implement fix
- [ ] Verify fix
`

  // Find insertion point
  // We want to insert after the current stage's content, which is before the next stage starts
  // or at the end of the file if this is the last stage.

  const lines = content.split("\n")
  let targetStageLineIndex = -1
  let nextStageLineIndex = -1

  // Regex to match "### Stage N: Name"
  const stageRegex = /^### Stage\s+(\d+):/

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i]?.match(stageRegex)
    if (match && match[1]) {
      const stageNum = parseInt(match[1], 10)
      if (stageNum === options.targetStage) {
        targetStageLineIndex = i
      } else if (
        targetStageLineIndex !== -1 &&
        stageNum > options.targetStage
      ) {
        // Found a stage after our target
        nextStageLineIndex = i
        break
      }
    }
  }

  if (targetStageLineIndex === -1) {
    return {
      success: false,
      newBatchNumber: 0,
      message: `Could not locate Stage ${options.targetStage} header in file`,
    }
  }

  if (nextStageLineIndex !== -1) {
    // Insert before the next stage
    lines.splice(nextStageLineIndex, 0, template)
    writeFileSync(planPath, lines.join("\n"))
  } else {
    // No next stage - insert at end of target stage content
    // Find the last non-empty line to insert after
    let insertIndex = lines.length
    for (let i = lines.length - 1; i >= targetStageLineIndex; i--) {
      if (lines[i]?.trim() !== "") {
        insertIndex = i + 1
        break
      }
    }
    lines.splice(insertIndex, 0, template)
    writeFileSync(planPath, lines.join("\n"))
  }

  return {
    success: true,
    newBatchNumber,
    message: `Appended Batch ${newBatchPrefix} to Stage ${options.targetStage}`,
  }
}

export function appendFixStage(
  repoRoot: string,
  streamId: string,
  options: FixStageOptions,
): { success: boolean; newStageNumber: number; message: string } {
  const planPath = getStreamPlanMdPath(repoRoot, streamId)
  const content = readFileSync(planPath, "utf-8")
  const errors: ConsolidateError[] = []

  const doc = parseStreamDocument(content, errors)
  if (!doc) {
    return {
      success: false,
      newStageNumber: 0,
      message: "Failed to parse PLAN.md",
    }
  }

  const lastStage = doc.stages[doc.stages.length - 1]
  const newStageNumber = (lastStage ? lastStage.id : 0) + 1
  const newStagePadded = newStageNumber.toString().padStart(2, "0")
  const targetStagePadded = options.targetStage.toString().padStart(2, "0")

  const template = `

### Stage ${newStagePadded}: Fix - ${options.name}

#### Definition
Addressing issues found in Stage ${targetStagePadded}.
${options.description || "Fixes and improvements based on evaluation."}

#### Batches
##### Batch 01: Fixes
###### Thread 01: Implementation
**Summary:**
Apply fixes.

**Details:**
- [ ] Analyze root cause
- [ ] Implement fix
- [ ] Verify fix
`

  // Append to end of file, trimming trailing whitespace first
  const trimmedContent = content.trimEnd()
  writeFileSync(planPath, trimmedContent + template)

  return {
    success: true,
    newStageNumber,
    message: `Appended Stage ${newStageNumber} to PLAN.md`,
  }
}
