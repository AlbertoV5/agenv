/**
 * Fix stage generation logic
 */

import { readFileSync, appendFileSync } from "fs"
import { getStreamPlanMdPath } from "./consolidate.ts"
import { parseStreamDocument } from "./stream-parser.ts"
import type { ConsolidateError } from "./types.ts"

export interface FixStageOptions {
  targetStage: number
  name: string
  description?: string
}

export function appendFixStage(
  repoRoot: string,
  streamId: string,
  options: FixStageOptions
): { success: boolean; newStageNumber: number; message: string } {
  const planPath = getStreamPlanMdPath(repoRoot, streamId)
  const content = readFileSync(planPath, "utf-8")
  const errors: ConsolidateError[] = []
  
  const doc = parseStreamDocument(content, errors)
  if (!doc) {
    return { success: false, newStageNumber: 0, message: "Failed to parse PLAN.md" }
  }

  const lastStage = doc.stages[doc.stages.length - 1]
  const newStageNumber = (lastStage ? lastStage.id : 0) + 1
  
  const template = `

### Stage ${newStageNumber}: Fix - ${options.name}

#### Definition
Addressing issues found in Stage ${options.targetStage}.
${options.description || "Fixes and improvements based on evaluation."}

#### Batches
##### Batch 01: Fixes
###### Thread 1: Implementation
**Summary:**
Apply fixes.

**Details:**
- [ ] Analyze root cause
- [ ] Implement fix
- [ ] Verify fix
`

  appendFileSync(planPath, template)
  
  return { 
    success: true, 
    newStageNumber, 
    message: `Appended Stage ${newStageNumber} to PLAN.md` 
  }
}
