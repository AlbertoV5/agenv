/**
 * GitHub Sync Operations
 *
 * Functions for synchronizing workstream data with GitHub issues.
 * 
 * ## Stage-Level Sync
 * - `syncStageIssues()` - Sync stage issues with task status (uses github.json)
 * - `isStageComplete()` - Check if all tasks in a stage are completed
 */

import { loadGitHubConfig, isGitHubEnabled } from "./config";
import { readTasksFile } from "../tasks";
import { getGitHubAuth } from "./auth";
import { createGitHubClient } from "./client";
import {
  loadWorkstreamGitHub,
  saveWorkstreamGitHub,
  updateStageIssueState,
  type StageIssue,
} from "./workstream-github";

// ============================================
// STAGE-LEVEL SYNC FUNCTIONS
// ============================================

/**
 * Result of syncing stage issue states
 */
export interface SyncStageIssuesResult {
  closed: { stageNumber: string; stageName: string; issueNumber: number; issueUrl: string }[];
  unchanged: { stageNumber: string; stageName: string; issueNumber: number; reason: string }[];
  errors: { stageNumber: string; stageName: string; issueNumber: number; error: string }[];
}

/**
 * Check if all tasks in a stage are completed (or cancelled)
 *
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param stageNumber - Stage number (e.g., 1, 2)
 * @returns true if all tasks in the stage are completed or cancelled
 */
export function isStageComplete(
  repoRoot: string,
  streamId: string,
  stageNumber: number
): boolean {
  const tasksFile = readTasksFile(repoRoot, streamId);
  if (!tasksFile) return false;

  const stagePrefix = `${stageNumber.toString().padStart(2, "0")}.`;

  // Get all tasks in this stage
  const stageTasks = tasksFile.tasks.filter((t) =>
    t.id.startsWith(stagePrefix)
  );

  // If no tasks in stage, consider it not complete
  if (stageTasks.length === 0) return false;

  // Check if all tasks are completed (or cancelled)
  return stageTasks.every(
    (t) => t.status === "completed" || t.status === "cancelled"
  );
}

/**
 * Get metadata for a stage from tasks.json
 *
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param stageNumber - Stage number (e.g., 1, 2)
 * @returns Stage name from first task, or null if no tasks found
 */
function getStageName(
  repoRoot: string,
  streamId: string,
  stageNumber: number
): string | null {
  const tasksFile = readTasksFile(repoRoot, streamId);
  if (!tasksFile) return null;

  const stagePrefix = `${stageNumber.toString().padStart(2, "0")}.`;
  const firstTask = tasksFile.tasks.find((t) => t.id.startsWith(stagePrefix));

  return firstTask?.stage_name || null;
}

/**
 * Synchronize stage-level GitHub issues with local task status.
 * 
 * For each stage with an open issue in github.json:
 * - If all tasks in the stage are completed/cancelled, close the issue
 * - Update the state field in github.json
 *
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @returns Result with closed, unchanged, and error counts
 */
export async function syncStageIssues(
  repoRoot: string,
  streamId: string
): Promise<SyncStageIssuesResult> {
  const result: SyncStageIssuesResult = {
    closed: [],
    unchanged: [],
    errors: [],
  };

  // Check if GitHub is enabled
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    return result;
  }

  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) {
    return result;
  }

  // Load github.json for this workstream
  let githubData = await loadWorkstreamGitHub(repoRoot, streamId);
  if (!githubData) {
    // No github.json exists - nothing to sync
    return result;
  }

  // Get GitHub client
  const token = getGitHubAuth();
  if (!token) {
    // No auth - can't sync
    return result;
  }

  const client = createGitHubClient(token, config.owner, config.repo);

  // Track if we need to save github.json
  let needsSave = false;

  // Process each stage in github.json
  for (const [stageNumber, stageIssue] of Object.entries(githubData.stages) as [string, StageIssue][]) {
    const stageName = getStageName(repoRoot, streamId, parseInt(stageNumber, 10)) || `Stage ${stageNumber}`;

    // Skip if issue is already closed
    if (stageIssue.state === "closed") {
      result.unchanged.push({
        stageNumber,
        stageName,
        issueNumber: stageIssue.issue_number,
        reason: "Issue already closed",
      });
      continue;
    }

    // Check if stage is complete
    const stageNum = parseInt(stageNumber, 10);
    const isComplete = isStageComplete(repoRoot, streamId, stageNum);

    if (!isComplete) {
      result.unchanged.push({
        stageNumber,
        stageName,
        issueNumber: stageIssue.issue_number,
        reason: "Stage has incomplete tasks",
      });
      continue;
    }

    // Stage is complete - close the issue
    try {
      await client.closeIssue(stageIssue.issue_number);

      // Update github.json state
      const closedAt = new Date().toISOString();
      updateStageIssueState(githubData, stageNumber, "closed", closedAt);
      needsSave = true;

      result.closed.push({
        stageNumber,
        stageName,
        issueNumber: stageIssue.issue_number,
        issueUrl: stageIssue.issue_url,
      });
    } catch (error) {
      result.errors.push({
        stageNumber,
        stageName,
        issueNumber: stageIssue.issue_number,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Save github.json if any changes were made
  if (needsSave) {
    await saveWorkstreamGitHub(repoRoot, streamId, githubData);
  }

  return result;
}
