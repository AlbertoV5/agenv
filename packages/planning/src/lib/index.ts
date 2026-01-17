/**
 * Index operations for plan management
 */

import { existsSync, readFileSync, writeFileSync, renameSync, rmSync } from "fs"
import { join } from "path"
import * as lockfile from "proper-lockfile"
import type { PlansIndex, PlanMetadata } from "./types.ts"
import { getIndexPath, getPlansDir } from "./repo.ts"

/**
 * Atomic write: write to temp file, then rename (atomic on POSIX)
 */
function atomicWriteJSON(path: string, data: object): void {
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, JSON.stringify(data, null, 2))
  renameSync(tempPath, path)
}

/**
 * Atomic write for any file content
 */
export function atomicWriteFile(path: string, content: string): void {
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, content)
  renameSync(tempPath, path)
}

/**
 * Execute a function with file lock on the index
 */
async function withIndexLock<T>(
  indexPath: string,
  fn: () => T
): Promise<T> {
  const release = await lockfile.lock(indexPath, {
    retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 }
  })
  try {
    return fn()
  } finally {
    await release()
  }
}

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

  try {
    return JSON.parse(content) as PlansIndex
  } catch (e) {
    throw new Error(
      `Failed to parse index.json at ${indexPath}: ${e instanceof Error ? e.message : String(e)}`
    )
  }
}

/**
 * Save the index.json (uses atomic write)
 */
export function saveIndex(repoRoot: string, index: PlansIndex): void {
  const indexPath = getIndexPath(repoRoot)
  index.last_updated = new Date().toISOString()
  atomicWriteJSON(indexPath, index)
}

/**
 * Save the index.json with file locking (async, safe for concurrent access)
 */
export async function saveIndexSafe(repoRoot: string, index: PlansIndex): Promise<void> {
  const indexPath = getIndexPath(repoRoot)
  await withIndexLock(indexPath, () => {
    index.last_updated = new Date().toISOString()
    atomicWriteJSON(indexPath, index)
  })
}

/**
 * Atomic read-modify-write operation on the index with file locking
 */
export async function modifyIndex<T>(
  repoRoot: string,
  fn: (index: PlansIndex) => T
): Promise<T> {
  const indexPath = getIndexPath(repoRoot)
  return withIndexLock(indexPath, () => {
    const index = loadIndex(repoRoot)
    const result = fn(index)
    saveIndex(repoRoot, index)
    return result
  })
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

export interface DeletePlanOptions {
  deleteFiles?: boolean
}

export interface DeletePlanResult {
  deleted: boolean
  planId: string
  planPath: string
}

/**
 * Delete a plan from the index (and optionally its files)
 */
export async function deletePlan(
  repoRoot: string,
  planIdOrName: string,
  options?: DeletePlanOptions
): Promise<DeletePlanResult> {
  return modifyIndex(repoRoot, (index) => {
    const planIndex = index.plans.findIndex(
      (p) => p.id === planIdOrName || p.name === planIdOrName
    )

    if (planIndex === -1) {
      throw new Error(`Plan "${planIdOrName}" not found`)
    }

    const plan = index.plans[planIndex]!
    index.plans.splice(planIndex, 1)

    // Optionally delete plan directory
    if (options?.deleteFiles) {
      const planDir = join(getPlansDir(repoRoot), plan.id)
      if (existsSync(planDir)) {
        rmSync(planDir, { recursive: true })
      }
    }

    return {
      deleted: true,
      planId: plan.id,
      planPath: plan.path,
    }
  })
}
