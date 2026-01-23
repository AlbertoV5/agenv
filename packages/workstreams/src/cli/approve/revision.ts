/**
 * Approve CLI - Revision Approval Handler
 *
 * Handles revision approval workflow for adding new stages to existing workstreams.
 */

import { existsSync, readFileSync } from "fs"
import { join } from "path"

import { checkOpenQuestions } from "../../lib/approval.ts"
import {
  detectNewStages,
  generateTasksMdForRevision,
} from "../../lib/tasks-md.ts"
import { parseStreamDocument } from "../../lib/stream-parser.ts"
import { getWorkDir } from "../../lib/repo.ts"
import { atomicWriteFile, getResolvedStream } from "../../lib/index.ts"
import { getTasks } from "../../lib/tasks.ts"

import type { ApproveCliArgs } from "./utils.ts"

/**
 * Handle revision approval workflow
 *
 * Detects new stages in PLAN.md that don't have corresponding tasks,
 * validates them, and generates TASKS.md with placeholders for the new stages.
 */
export function handleRevisionApproval(
  repoRoot: string,
  stream: ReturnType<typeof getResolvedStream>,
  cliArgs: ApproveCliArgs
): void {
  const workDir = getWorkDir(repoRoot)
  const streamDir = join(workDir, stream.id)
  const planMdPath = join(streamDir, "PLAN.md")
  const tasksMdPath = join(streamDir, "TASKS.md")

  // Step 1: Load PLAN.md and parse with parseStreamDocument
  if (!existsSync(planMdPath)) {
    console.error(`Error: PLAN.md not found at ${planMdPath}`)
    process.exit(1)
  }

  const planContent = readFileSync(planMdPath, "utf-8")
  const errors: any[] = []
  const doc = parseStreamDocument(planContent, errors)

  if (!doc) {
    console.error(
      `Error: Failed to parse PLAN.md: ${errors.map((e) => e.message).join(", ")}`
    )
    process.exit(1)
  }

  // Step 2: Load existing tasks from tasks.json
  const existingTasks = getTasks(repoRoot, stream.id)

  // Step 3: Call detectNewStages() and error if no new stages found
  const newStageNumbers = detectNewStages(doc, existingTasks)

  if (newStageNumbers.length === 0) {
    if (cliArgs.json) {
      console.log(
        JSON.stringify(
          {
            action: "blocked",
            target: "revision",
            reason: "no_new_stages",
            streamId: stream.id,
            streamName: stream.name,
          },
          null,
          2
        )
      )
    } else {
      console.error("Error: No new stages to approve")
    }
    process.exit(1)
  }

  // Step 4: Validate new stages have no open questions
  // Reuse checkOpenQuestions logic filtered to new stages
  const questionsResult = checkOpenQuestions(repoRoot, stream.id)

  if (questionsResult.hasOpenQuestions && !cliArgs.force) {
    // Filter questions to only new stages
    const newStageSet = new Set(newStageNumbers)
    const newStageQuestions = questionsResult.questions.filter((q) =>
      newStageSet.has(q.stage)
    )

    if (newStageQuestions.length > 0) {
      if (cliArgs.json) {
        console.log(
          JSON.stringify(
            {
              action: "blocked",
              target: "revision",
              reason: "open_questions_in_new_stages",
              streamId: stream.id,
              streamName: stream.name,
              openQuestions: newStageQuestions,
              openCount: newStageQuestions.length,
            },
            null,
            2
          )
        )
      } else {
        console.error(
          "Error: Cannot approve revision with open questions in new stages"
        )
        console.error("")
        console.error(
          `Found ${newStageQuestions.length} open question(s) in new stages:`
        )
        for (const q of newStageQuestions) {
          console.error(`  Stage ${q.stage} (${q.stageName}): ${q.question}`)
        }
        console.error("")
        console.error("Options:")
        console.error("  1. Resolve questions in PLAN.md (mark with [x])")
        console.error("  2. Use --force to approve anyway")
      }
      process.exit(1)
    }
  }

  // Step 5: Call generateTasksMdForRevision() and write TASKS.md
  const tasksMdContent = generateTasksMdForRevision(
    stream.name,
    existingTasks,
    doc,
    newStageNumbers
  )

  atomicWriteFile(tasksMdPath, tasksMdContent)

  // Step 6: Count new placeholders
  // Each new stage has batches, each batch has threads, each thread gets 1 placeholder task
  let newPlaceholderCount = 0
  const newStageSet = new Set(newStageNumbers)

  for (const stage of doc.stages) {
    if (newStageSet.has(stage.id)) {
      for (const batch of stage.batches) {
        newPlaceholderCount += batch.threads.length
      }
    }
  }

  // Step 7: Output summary
  if (cliArgs.json) {
    console.log(
      JSON.stringify(
        {
          action: "generated",
          target: "revision",
          streamId: stream.id,
          streamName: stream.name,
          existingTaskCount: existingTasks.length,
          newStageCount: newStageNumbers.length,
          newPlaceholderCount,
          newStages: newStageNumbers,
          tasksMdPath,
        },
        null,
        2
      )
    )
  } else {
    console.log(
      `Generated TASKS.md with ${existingTasks.length} existing tasks and ${newPlaceholderCount} new task placeholders`
    )
    console.log("")
    console.log(
      `New stages: ${newStageNumbers.map((n) => `Stage ${n}`).join(", ")}`
    )
    console.log("")
    console.log(
      "Edit TASKS.md to add task details and assign agents, then run 'work approve tasks'"
    )
  }
}
