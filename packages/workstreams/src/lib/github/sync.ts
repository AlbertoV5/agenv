/**
 * GitHub Sync Operations
 *
 * Functions for synchronizing workstream data with GitHub issues.
 * 
 * ## Stage-Level Sync (Current)
 * - `syncStageIssues()` - Sync stage issues with task status (uses github.json)
 * - `isStageComplete()` - Check if all tasks in a stage are completed
 * 
 * ## Thread-Level Sync (Deprecated)
 * Thread-level sync functions have been deprecated. Issue metadata storage has
 * moved from tasks.json/threads.json to github.json per-stage.
 * @see packages/workstreams/src/lib/github/workstream-github.ts
 */

import { loadGitHubConfig, isGitHubEnabled } from "./config";
import { ensureWorkstreamLabels } from "./labels";
import { createThreadIssue, closeThreadIssue, reopenThreadIssue, updateThreadIssueBody, findExistingThreadIssue, type CreateThreadIssueInput } from "./issues";
import { loadIndex, getStream } from "../index";
import { readTasksFile, parseTaskId } from "../tasks";
import { getGitHubAuth } from "./auth";
import { createGitHubClient } from "./client";
import type { Task } from "../types";
import {
  loadWorkstreamGitHub,
  saveWorkstreamGitHub,
  updateStageIssueState,
  type StageIssue,
} from "./workstream-github";

/**
 * @deprecated Thread-level issue creation is no longer used. Use stage-level issues instead.
 */
export interface CreateIssuesResult {
  created: {
    threadId: string;
    threadName: string;
    issueNumber: number;
    issueUrl: string;
  }[];
  skipped: {
    threadId: string;
    threadName: string;
    reason: string;
  }[];
  errors: {
    threadId: string;
    threadName: string;
    error: string;
  }[];
}

/**
 * Groups tasks by thread and returns unique threads.
 * Returns the first task of each thread as the representative task.
 * 
 * @deprecated Thread-level grouping is no longer used. Use stage-level operations instead.
 */
function getUniqueThreads(tasks: Task[]): Map<string, { tasks: Task[]; firstTask: Task }> {
  const threads = new Map<string, { tasks: Task[]; firstTask: Task }>();

  for (const task of tasks) {
    const { stage, batch, thread } = parseTaskId(task.id);
    const threadKey = `${stage.toString().padStart(2, "0")}.${batch.toString().padStart(2, "0")}.${thread.toString().padStart(2, "0")}`;

    if (!threads.has(threadKey)) {
      threads.set(threadKey, { tasks: [task], firstTask: task });
    } else {
      threads.get(threadKey)!.tasks.push(task);
    }
  }

  return threads;
}

/**
 * Creates GitHub issues for all threads in a workstream.
 *
 * @deprecated Thread-level issues are no longer used. Use stage-level issues instead.
 * @see createStageIssue in packages/workstreams/src/lib/github/issues.ts
 *
 * @param repoRoot The repository root directory
 * @param streamId The workstream ID
 * @param stageFilter Optional stage number to filter threads (only create issues for this stage)
 * @returns Result with created, skipped, and error counts
 */
export async function createIssuesForWorkstream(
  repoRoot: string,
  streamId: string,
  stageFilter?: number
): Promise<CreateIssuesResult> {
  const result: CreateIssuesResult = {
    created: [],
    skipped: [],
    errors: [],
  };

  // Check if GitHub is enabled
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    return result;
  }

  const config = await loadGitHubConfig(repoRoot);
  if (!config.auto_create_issues) {
    return result;
  }

  // Load stream and tasks
  const index = loadIndex(repoRoot);
  const stream = getStream(index, streamId);
  const tasksFile = readTasksFile(repoRoot, streamId);

  if (!tasksFile || tasksFile.tasks.length === 0) {
    return result;
  }

  // Ensure labels exist first
  await ensureWorkstreamLabels(repoRoot, streamId);

  // Group tasks by thread
  const threads = getUniqueThreads(tasksFile.tasks);

  // Create issues for each thread
  for (const [threadKey, { firstTask, tasks }] of threads) {
    // Parse IDs for label generation
    const { stage, batch, thread } = parseTaskId(firstTask.id);

    // Skip if stage filter is set and this thread is not in the filtered stage
    if (stageFilter !== undefined && stage !== stageFilter) {
      continue;
    }

    const stageId = stage.toString().padStart(2, "0");
    const batchIdFormatted = batch.toString().padStart(2, "0");
    const threadIdFormatted = thread.toString().padStart(2, "0");

    // Check if thread is complete (all tasks completed or cancelled)
    const isComplete = tasks.every(
      (t) => t.status === "completed" || t.status === "cancelled"
    );

    // Check GitHub for existing issues (no longer checking local task metadata)
    const existingRemoteIssue = await findExistingThreadIssue(
      repoRoot,
      stageId,
      batchIdFormatted,
      threadIdFormatted,
      firstTask.thread_name,
      stream.name
    );

    if (existingRemoteIssue) {
      if (existingRemoteIssue.state === "closed") {
        if (isComplete) {
          // Thread is still complete - keep issue closed
          result.skipped.push({
            threadId: threadKey,
            threadName: firstTask.thread_name,
            reason: `Existing closed issue #${existingRemoteIssue.issueNumber} (thread complete)`,
          });
        } else {
          // Thread is no longer complete - reopen the issue
          try {
            await reopenThreadIssue(repoRoot, streamId, existingRemoteIssue.issueNumber);
            result.created.push({
              threadId: threadKey,
              threadName: firstTask.thread_name,
              issueNumber: existingRemoteIssue.issueNumber,
              issueUrl: existingRemoteIssue.issueUrl,
            });
          } catch (error) {
            result.errors.push({
              threadId: threadKey,
              threadName: firstTask.thread_name,
              error: `Failed to reopen issue: ${error instanceof Error ? error.message : String(error)}`,
            });
          }
        }
      } else {
        // Issue is already open
        result.skipped.push({
          threadId: threadKey,
          threadName: firstTask.thread_name,
          reason: `Existing open issue #${existingRemoteIssue.issueNumber}`,
        });
      }
      continue;
    }

    // No existing issue found - check if thread is already complete
    // Don't create issues for work that's already done
    if (isComplete) {
      result.skipped.push({
        threadId: threadKey,
        threadName: firstTask.thread_name,
        reason: "Thread already complete, no issue needed",
      });
      continue;
    }

    // No existing issue and thread is not complete - create a new one
    const batchId = `${stageId}.${batchIdFormatted}`;
    const taskList = tasks
      .map((t) => `- [ ] ${t.name}`)
      .join("\n");

    const input: CreateThreadIssueInput = {
      summary: `Thread ${threadIdFormatted} in batch ${batchId}`,
      details: `## Tasks\n\n${taskList}`,
      streamId: stream.id,
      streamName: stream.name,
      stageId,
      stageName: firstTask.stage_name,
      batchId: batchIdFormatted,
      batchName: firstTask.batch_name,
      threadId: threadIdFormatted,
      threadName: firstTask.thread_name,
    };

    try {
      const meta = await createThreadIssue(repoRoot, input);
      if (meta && meta.issue_number && meta.issue_url) {
        // Issue created successfully (metadata now stored in github.json per-stage)
        result.created.push({
          threadId: threadKey,
          threadName: firstTask.thread_name,
          issueNumber: meta.issue_number,
          issueUrl: meta.issue_url,
        });
      } else {
        result.skipped.push({
          threadId: threadKey,
          threadName: firstTask.thread_name,
          reason: "GitHub not configured or auth failed",
        });
      }
    } catch (error) {
      result.errors.push({
        threadId: threadKey,
        threadName: firstTask.thread_name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

/**
 * Check if all tasks in a thread are completed
 *
 * @deprecated Thread-level completion checks are no longer used. Use isStageComplete() instead.
 *
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param stageId - Stage number (padded string like "01")
 * @param batchId - Batch number (padded string like "01")
 * @param threadId - Thread number (padded string like "01")
 * @returns true if all tasks in the thread are completed
 */
export function isThreadComplete(
  repoRoot: string,
  streamId: string,
  stageId: string,
  batchId: string,
  threadId: string
): boolean {
  const tasksFile = readTasksFile(repoRoot, streamId);
  if (!tasksFile) return false;

  const threadPrefix = `${stageId}.${batchId}.${threadId}.`;

  // Get all tasks in this thread
  const threadTasks = tasksFile.tasks.filter((t) =>
    t.id.startsWith(threadPrefix)
  );

  // If no tasks in thread, consider it not complete
  if (threadTasks.length === 0) return false;

  // Check if all tasks are completed (or cancelled)
  return threadTasks.every(
    (t) => t.status === "completed" || t.status === "cancelled"
  );
}

/**
 * @deprecated Issue metadata is no longer stored in tasks.json.
 * This function is a no-op kept for backward compatibility.
 * Use github.json per-stage for issue tracking.
 */
export async function checkAndCloseThreadIssue(
  _repoRoot: string,
  _streamId: string,
  _taskId: string
): Promise<{ closed: boolean; issueNumber?: number }> {
  // No-op: Issue metadata is no longer stored in tasks.json
  // Close operations should now use github.json per-stage
  return { closed: false };
}

/**
 * @deprecated Issue metadata is no longer stored in tasks.json.
 * This function is a no-op kept for backward compatibility.
 * Use github.json per-stage for issue tracking.
 */
export async function checkAndReopenThreadIssue(
  _repoRoot: string,
  _streamId: string,
  _taskId: string
): Promise<{ reopened: boolean; issueNumber?: number }> {
  // No-op: Issue metadata is no longer stored in tasks.json
  // Reopen operations should now use github.json per-stage
  return { reopened: false };
}

// ============================================
// SYNC COMMAND FUNCTIONS
// ============================================

/**
 * Result of syncing issue states (thread-level - deprecated)
 */
export interface SyncIssueStatesResult {
  closed: { threadKey: string; threadName: string; issueNumber: number; issueUrl: string }[];
  unchanged: { threadKey: string; threadName: string; issueNumber: number; reason: string }[];
  errors: { threadKey: string; threadName: string; issueNumber: number; error: string }[];
}

/**
 * @deprecated Issue metadata is no longer stored in tasks.json.
 * This function returns empty results for backward compatibility.
 * Use syncStageIssues() for stage-level sync with github.json.
 */
export async function syncIssueStates(
  _repoRoot: string,
  _streamId: string
): Promise<SyncIssueStatesResult> {
  // No-op: Issue metadata is no longer stored in tasks.json
  // Sync operations should now use syncStageIssues() with github.json per-stage
  return {
    closed: [],
    unchanged: [],
    errors: [],
  };
}

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
