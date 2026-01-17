/**
 * Index operations for plan management
 */

import { existsSync, readFileSync, writeFileSync } from "fs"
import type { PlansIndex, PlanMetadata } from "./types.ts"
import { getIndexPath, getPlansDir } from "./repo.ts"

/**
 * Read and parse the plans index.json, or create a new one
 */
export function getOrCreateIndex(repoRoot: string): PlansIndex {
  const indexPath = getIndexPath(repoRoot)

  if (existsSync(indexPath)) {
    const content = readFileSync(indexPath, "utf-8")
    return JSON.parse(content) as PlansIndex
  }

  return {
    version: "1.0.0",
    last_updated: new Date().toISOString(),
    plans: [],
  }
}

/**
 * Load the plans index, throwing if it doesn't exist
 */
export function loadIndex(repoRoot: string): PlansIndex {
  const indexPath = getIndexPath(repoRoot)

  if (!existsSync(indexPath)) {
    throw new Error(`No plans index found at ${indexPath}`)
  }

  const content = readFileSync(indexPath, "utf-8")
  return JSON.parse(content) as PlansIndex
}

/**
 * Save the index.json
 */
export function saveIndex(repoRoot: string, index: PlansIndex): void {
  const indexPath = getIndexPath(repoRoot)
  index.last_updated = new Date().toISOString()
  writeFileSync(indexPath, JSON.stringify(index, null, 2))
}

/**
 * Find a plan by ID or name
 */
export function findPlan(
  index: PlansIndex,
  planIdOrName: string
): PlanMetadata | undefined {
  return index.plans.find(
    (p) => p.id === planIdOrName || p.name === planIdOrName
  )
}

/**
 * Find a plan by ID or name, throwing if not found
 */
export function getPlan(index: PlansIndex, planIdOrName: string): PlanMetadata {
  const plan = findPlan(index, planIdOrName)
  if (!plan) {
    throw new Error(`Plan "${planIdOrName}" not found`)
  }
  return plan
}

/**
 * Get the next plan order number
 */
export function getNextOrderNumber(index: PlansIndex): number {
  if (index.plans.length === 0) return 0
  return Math.max(...index.plans.map((p) => p.order)) + 1
}

/**
 * Format order number as 3-digit string
 */
export function formatOrderNumber(order: number): string {
  return order.toString().padStart(3, "0")
}
