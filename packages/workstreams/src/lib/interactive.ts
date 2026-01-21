/**
 * Interactive prompts for CLI commands
 *
 * Provides readline-based prompts for interactive stage/batch/thread selection.
 */

import * as readline from "readline"
import type { StageDefinition, BatchDefinition, ThreadDefinition } from "./types.ts"

export interface SelectionResult<T> {
  index: number
  value: T
}

/**
 * Create a readline interface for interactive prompts
 */
export function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

/**
 * Display numbered list and prompt for selection
 * Accepts either a number or partial name match
 */
export async function selectFromList<T>(
  rl: readline.Interface,
  prompt: string,
  items: T[],
  displayFn: (item: T, index: number) => string
): Promise<SelectionResult<T>> {
  // Display items
  console.log(`\n${prompt}`)
  items.forEach((item, i) => {
    console.log(`  ${i + 1}. ${displayFn(item, i)}`)
  })

  // Get selection
  return new Promise((resolve, reject) => {
    rl.question("\nEnter number or name: ", (answer) => {
      const trimmed = answer.trim()

      // Try number first
      const num = parseInt(trimmed, 10)
      if (!isNaN(num) && num >= 1 && num <= items.length) {
        resolve({ index: num - 1, value: items[num - 1]! })
        return
      }

      // Try name match (case-insensitive partial match)
      const lowerAnswer = trimmed.toLowerCase()
      const matchIndex = items.findIndex((item) =>
        displayFn(item, 0).toLowerCase().includes(lowerAnswer)
      )

      if (matchIndex >= 0) {
        resolve({ index: matchIndex, value: items[matchIndex]! })
        return
      }

      reject(new Error(`Invalid selection: "${trimmed}"`))
    })
  })
}

/**
 * Prompt for text input
 */
export async function promptText(
  rl: readline.Interface,
  prompt: string
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim())
    })
  })
}

/**
 * Interactive stage selection from parsed PLAN.md
 */
export async function selectStage(
  rl: readline.Interface,
  stages: StageDefinition[]
): Promise<SelectionResult<StageDefinition>> {
  return selectFromList(
    rl,
    "Select stage:",
    stages,
    (stage) => `Stage ${stage.id.toString().padStart(2, "0")}: ${stage.name || "(unnamed)"}`
  )
}

/**
 * Interactive batch selection from a stage
 */
export async function selectBatch(
  rl: readline.Interface,
  batches: BatchDefinition[]
): Promise<SelectionResult<BatchDefinition>> {
  return selectFromList(
    rl,
    "Select batch:",
    batches,
    (batch) => `Batch ${batch.prefix}: ${batch.name || "(unnamed)"}`
  )
}

/**
 * Interactive thread selection from a batch
 */
export async function selectThread(
  rl: readline.Interface,
  threads: ThreadDefinition[]
): Promise<SelectionResult<ThreadDefinition>> {
  return selectFromList(
    rl,
    "Select thread:",
    threads,
    (thread) => `Thread ${thread.id}: ${thread.name || "(unnamed)"}`
  )
}
