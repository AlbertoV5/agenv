/**
 * Workstream-specific GitHub tracking
 *
 * Manages the github.json file within each workstream directory,
 * tracking GitHub issues created for each stage.
 */

import { join, dirname } from "node:path"
import { readFile, writeFile, rename, mkdir } from "node:fs/promises"
import { getWorkDir } from "../repo"

// ============================================
// TYPES
// ============================================

/**
 * Information about a GitHub issue linked to a stage
 */
export interface StageIssue {
  issue_number: number
  issue_url: string
  state: "open" | "closed"
  created_at: string
  closed_at?: string
}

/**
 * Branch information for a workstream
 */
export interface WorkstreamBranch {
  name: string
  url: string
  created_at: string
}

/**
 * The structure of a workstream's github.json file
 */
export interface WorkstreamGitHub {
  version: string
  stream_id: string
  last_updated: string
  branch?: WorkstreamBranch
  stages: {
    [stageNumber: string]: StageIssue
  }
}

// ============================================
// FILE PATH UTILITIES
// ============================================

/**
 * Returns the path to a workstream's github.json file.
 * @param repoRoot The root directory of the repository
 * @param streamId The workstream ID
 * @returns The absolute path to work/{streamId}/github.json
 */
export function getWorkstreamGitHubPath(repoRoot: string, streamId: string): string {
  return join(getWorkDir(repoRoot), streamId, "github.json")
}

// ============================================
// LOAD / SAVE FUNCTIONS
// ============================================

/**
 * Loads and parses the workstream's github.json file.
 * Returns null if file does not exist.
 * @param repoRoot The root directory of the repository
 * @param streamId The workstream ID
 * @returns The WorkstreamGitHub data or null if not found
 */
export async function loadWorkstreamGitHub(
  repoRoot: string,
  streamId: string
): Promise<WorkstreamGitHub | null> {
  const configPath = getWorkstreamGitHubPath(repoRoot, streamId)
  try {
    const content = await readFile(configPath, "utf-8")
    return JSON.parse(content) as WorkstreamGitHub
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw error
  }
}

/**
 * Saves the workstream's github.json file atomically.
 * @param repoRoot The root directory of the repository
 * @param streamId The workstream ID
 * @param data The WorkstreamGitHub data to save
 */
export async function saveWorkstreamGitHub(
  repoRoot: string,
  streamId: string,
  data: WorkstreamGitHub
): Promise<void> {
  const configPath = getWorkstreamGitHubPath(repoRoot, streamId)
  const tempPath = `${configPath}.tmp`

  // Ensure directory exists
  await mkdir(dirname(configPath), { recursive: true })

  // Update last_updated timestamp
  data.last_updated = new Date().toISOString()

  await writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8")
  await rename(tempPath, configPath)
}

/**
 * Initializes a new github.json file for a workstream.
 * @param repoRoot The root directory of the repository
 * @param streamId The workstream ID
 * @returns The newly created WorkstreamGitHub data
 */
export async function initWorkstreamGitHub(
  repoRoot: string,
  streamId: string
): Promise<WorkstreamGitHub> {
  const data: WorkstreamGitHub = {
    version: "1.0.0",
    stream_id: streamId,
    last_updated: new Date().toISOString(),
    stages: {},
  }

  await saveWorkstreamGitHub(repoRoot, streamId, data)
  return data
}

// ============================================
// STAGE ISSUE HELPERS
// ============================================

/**
 * Gets the issue information for a specific stage.
 * @param data The WorkstreamGitHub data
 * @param stageNumber The stage number (e.g., "01", "02")
 * @returns The StageIssue or undefined if not found
 */
export function getStageIssue(
  data: WorkstreamGitHub,
  stageNumber: string
): StageIssue | undefined {
  return data.stages[stageNumber]
}

/**
 * Sets the issue information for a specific stage.
 * Note: This modifies the data object in place. Call saveWorkstreamGitHub to persist.
 * @param data The WorkstreamGitHub data
 * @param stageNumber The stage number (e.g., "01", "02")
 * @param issue The StageIssue to set
 */
export function setStageIssue(
  data: WorkstreamGitHub,
  stageNumber: string,
  issue: StageIssue
): void {
  data.stages[stageNumber] = issue
}

/**
 * Updates the state of a stage issue (open/closed).
 * Note: This modifies the data object in place. Call saveWorkstreamGitHub to persist.
 * @param data The WorkstreamGitHub data
 * @param stageNumber The stage number (e.g., "01", "02")
 * @param state The new state
 * @param closedAt Optional closed_at timestamp (required when state is "closed")
 */
export function updateStageIssueState(
  data: WorkstreamGitHub,
  stageNumber: string,
  state: "open" | "closed",
  closedAt?: string
): void {
  const issue = data.stages[stageNumber]
  if (issue) {
    issue.state = state
    if (state === "closed" && closedAt) {
      issue.closed_at = closedAt
    } else if (state === "open") {
      delete issue.closed_at
    }
  }
}
