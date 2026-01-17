/**
 * Plan completion operations
 */

import type { PlansIndex, PlanMetadata } from "./types.ts"
import { loadIndex, saveIndex, getPlan } from "./index.ts"
import { setNestedField, getNestedField, parseValue } from "./utils.ts"

export interface CompletePlanArgs {
  repoRoot: string
  planId: string
  referencePath?: string
}

export interface CompletePlanResult {
  planId: string
  synthesizedAt: string
  referencePath?: string
}

/**
 * Mark a plan as complete
 */
export function completePlan(args: CompletePlanArgs): CompletePlanResult {
  const index = loadIndex(args.repoRoot)
  const planIndex = index.plans.findIndex(
    (p) => p.id === args.planId || p.name === args.planId
  )

  if (planIndex === -1) {
    throw new Error(`Plan "${args.planId}" not found`)
  }

  const plan = index.plans[planIndex]
  if (!plan) {
    throw new Error(`Plan at index ${planIndex} not found`)
  }

  const now = new Date().toISOString()

  // Update synthesis status
  plan.synthesis = {
    synthesized: true,
    synthesized_at: now,
  }

  if (args.referencePath) {
    plan.synthesis.reference_path = args.referencePath
  }

  plan.updated_at = now
  saveIndex(args.repoRoot, index)

  return {
    planId: plan.id,
    synthesizedAt: now,
    referencePath: args.referencePath,
  }
}

export interface UpdateIndexFieldArgs {
  repoRoot: string
  planId: string
  field: string
  value: string
}

export interface UpdateIndexFieldResult {
  planId: string
  field: string
  previousValue: unknown
  newValue: unknown
}

/**
 * Update a specific field in a plan's index entry
 */
export function updateIndexField(
  args: UpdateIndexFieldArgs
): UpdateIndexFieldResult {
  const index = loadIndex(args.repoRoot)
  const planIndex = index.plans.findIndex(
    (p) => p.id === args.planId || p.name === args.planId
  )

  if (planIndex === -1) {
    throw new Error(`Plan "${args.planId}" not found`)
  }

  const plan = index.plans[planIndex]
  if (!plan) {
    throw new Error(`Plan at index ${planIndex} not found`)
  }

  // Get current value
  const currentValue = getNestedField(
    plan as unknown as Record<string, unknown>,
    args.field
  )
  const parsedValue = parseValue(args.value)

  // Update the field
  setNestedField(
    plan as unknown as Record<string, unknown>,
    args.field,
    parsedValue
  )

  // Update timestamps
  plan.updated_at = new Date().toISOString()
  saveIndex(args.repoRoot, index)

  return {
    planId: plan.id,
    field: args.field,
    previousValue: currentValue,
    newValue: parsedValue,
  }
}

/**
 * Format plan info for display
 */
export function formatPlanInfo(plan: PlanMetadata): string {
  const lines: string[] = [
    `Plan: ${plan.id}`,
    `|- name: ${plan.name}`,
    `|- order: ${plan.order}`,
    `|- size: ${plan.size}`,
    `|- path: ${plan.path}`,
    `|- created_at: ${plan.created_at}`,
    `|- updated_at: ${plan.updated_at}`,
    `|- session:`,
    `|  |- length: ${plan.session.length}`,
    `|  |- unit: ${plan.session.unit}`,
    `|  |- session_minutes: [${plan.session.session_minutes.join(", ")}]`,
    `|  +- session_iterations: [${plan.session.session_iterations.join(", ")}]`,
    `+- synthesis:`,
    `   |- synthesized: ${plan.synthesis.synthesized}`,
  ]

  if (plan.synthesis.reference_path) {
    lines.push(`   |- reference_path: ${plan.synthesis.reference_path}`)
  }
  if (plan.synthesis.synthesized_at) {
    lines.push(`   +- synthesized_at: ${plan.synthesis.synthesized_at}`)
  } else {
    // Fix the last line connector
    const lastLine = lines[lines.length - 1]
    if (lastLine) {
      lines[lines.length - 1] = lastLine.replace("|-", "+-")
    }
  }

  return lines.join("\n")
}
