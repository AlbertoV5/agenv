/**
 * GitHub Sync Operations
 *
 * Functions for synchronizing workstream data with GitHub issues.
 */

import { loadGitHubConfig, isGitHubEnabled } from "./config";
import { ensureWorkstreamLabels } from "./labels";
import { createThreadIssue, storeThreadIssueMeta, closeThreadIssue, type CreateThreadIssueInput } from "./issues";
import { loadIndex, getStream } from "../index";
import { readTasksFile, writeTasksFile, parseTaskId } from "../tasks";
import { getGitHubAuth } from "./auth";
import { createGitHubClient } from "./client";
import type { Task } from "../types";

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
 * @param repoRoot The repository root directory
 * @param streamId The workstream ID
 * @returns Result with created, skipped, and error counts
 */
export async function createIssuesForWorkstream(
  repoRoot: string,
  streamId: string
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
    // Check if any task in this thread already has an issue
    const existingIssue = tasks.find((t) => t.github_issue?.number);
    if (existingIssue) {
      result.skipped.push({
        threadId: threadKey,
        threadName: firstTask.thread_name,
        reason: `Already has issue #${existingIssue.github_issue!.number}`,
      });
      continue;
    }

    // Parse IDs for label generation
    const { stage, batch, thread } = parseTaskId(firstTask.id);
    const stageId = stage.toString().padStart(2, "0");
    const batchId = `${stageId}.${batch.toString().padStart(2, "0")}`;
    const threadId = thread.toString().padStart(2, "0");

    // Build task list for issue body
    const taskList = tasks
      .map((t) => `- [ ] ${t.name}`)
      .join("\n");

    const input: CreateThreadIssueInput = {
      summary: `Thread ${threadId} in batch ${batchId}`,
      details: `## Tasks\n\n${taskList}`,
      streamId: stream.id,
      streamName: stream.name,
      stageId,
      stageName: firstTask.stage_name,
      batchId: batch.toString().padStart(2, "0"),
      batchName: firstTask.batch_name,
      threadId,
      threadName: firstTask.thread_name,
    };

    try {
      const meta = await createThreadIssue(repoRoot, input);
      if (meta && meta.issue_number && meta.issue_url) {
        // Store the issue metadata on the first task of the thread
        storeThreadIssueMeta(repoRoot, streamId, firstTask.id, meta);

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
 * Find a task in the thread that has a github_issue
 * Returns the first task with a github_issue, since all tasks in a thread
 * share the same issue (issue is per thread, not per task)
 */
function findThreadIssueTask(
  tasks: Task[],
  threadPrefix: string
): Task | undefined {
  return tasks.find(
    (t) => t.id.startsWith(threadPrefix) && t.github_issue?.number
  );
}

/**
 * Check if a thread is complete and close its GitHub issue if so
 *
 * This function is called after a task status changes to "completed".
 * It checks if all tasks in the same thread are now completed,
 * and if so, closes the associated GitHub issue.
 *
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param taskId - The task ID that was just completed
 * @returns Object with closed status and issue number if closed
 */
export async function checkAndCloseThreadIssue(
  repoRoot: string,
  streamId: string,
  taskId: string
): Promise<{ closed: boolean; issueNumber?: number }> {
  // Check if GitHub is enabled
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    return { closed: false };
  }

  // Parse the task ID to get thread info
  const { stage, batch, thread } = parseTaskId(taskId);
  const stageId = stage.toString().padStart(2, "0");
  const batchId = batch.toString().padStart(2, "0");
  const threadId = thread.toString().padStart(2, "0");

  // Check if thread is complete
  if (!isThreadComplete(repoRoot, streamId, stageId, batchId, threadId)) {
    return { closed: false };
  }

  // Find a task with the github_issue
  const tasksFile = readTasksFile(repoRoot, streamId);
  if (!tasksFile) {
    return { closed: false };
  }

  const threadPrefix = `${stageId}.${batchId}.${threadId}.`;
  const issueTask = findThreadIssueTask(tasksFile.tasks, threadPrefix);

  if (!issueTask?.github_issue?.number) {
    return { closed: false };
  }

  // Issue is already closed
  if (issueTask.github_issue.state === "closed") {
    return { closed: false };
  }

  const issueNumber = issueTask.github_issue.number;

  // Close the issue on GitHub
  try {
    await closeThreadIssue(repoRoot, streamId, issueNumber);
  } catch (error) {
    // Don't fail if GitHub API fails, just log and return
    console.error(`Failed to close GitHub issue #${issueNumber}:`, error);
    return { closed: false };
  }

  // Update all tasks in the thread to mark issue as closed
  const threadTasks = tasksFile.tasks.filter((t) =>
    t.id.startsWith(threadPrefix)
  );
  for (const task of threadTasks) {
    if (task.github_issue) {
      task.github_issue.state = "closed";
      task.updated_at = new Date().toISOString();
    }
  }
  writeTasksFile(repoRoot, streamId, tasksFile);

  return { closed: true, issueNumber };
}

// ============================================
// SYNC COMMAND FUNCTIONS
// ============================================

/**
 * Result of syncing issue states
 */
export interface SyncIssueStatesResult {
  closed: { threadKey: string; threadName: string; issueNumber: number; issueUrl: string }[];
  unchanged: { threadKey: string; threadName: string; issueNumber: number; reason: string }[];
  errors: { threadKey: string; threadName: string; issueNumber: number; error: string }[];
}

/**
 * Thread info for sync operations
 */
interface ThreadSyncInfo {
  threadKey: string;
  threadName: string;
  tasks: Task[];
  issueNumber?: number;
  issueUrl?: string;
  issueState?: "open" | "closed";
}

/**
 * Group tasks by thread and extract sync info
 */
function getThreadSyncInfo(tasks: Task[]): Map<string, ThreadSyncInfo> {
  const threads = new Map<string, ThreadSyncInfo>();

  for (const task of tasks) {
    const { stage, batch, thread } = parseTaskId(task.id);
    const threadKey = `${stage.toString().padStart(2, "0")}.${batch.toString().padStart(2, "0")}.${thread.toString().padStart(2, "0")}`;

    if (!threads.has(threadKey)) {
      threads.set(threadKey, {
        threadKey,
        threadName: task.thread_name,
        tasks: [],
      });
    }

    const info = threads.get(threadKey)!;
    info.tasks.push(task);

    // Capture issue info from the first task that has it
    if (task.github_issue && !info.issueNumber) {
      info.issueNumber = task.github_issue.number;
      info.issueUrl = task.github_issue.url;
      info.issueState = task.github_issue.state;
    }
  }

  return threads;
}

/**
 * Check if all tasks in a thread are complete using task array
 */
function isThreadCompleteFromTasks(tasks: Task[]): boolean {
  if (tasks.length === 0) return false;
  return tasks.every(
    (task) => task.status === "completed" || task.status === "cancelled"
  );
}

/**
 * Sync all issue states for a workstream
 *
 * - Finds all threads with associated GitHub issues
 * - For completed threads with open issues, closes the issues
 * - Updates github_issue.state in tasks.json
 * - Reports: "Closed N issues, M unchanged"
 *
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @returns Result with closed, unchanged, and error counts
 */
export async function syncIssueStates(
  repoRoot: string,
  streamId: string
): Promise<SyncIssueStatesResult> {
  const result: SyncIssueStatesResult = {
    closed: [],
    unchanged: [],
    errors: [],
  };

  // Check if GitHub is enabled
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    return result;
  }

  // Load config and auth
  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) {
    return result;
  }

  const token = getGitHubAuth();
  if (!token) {
    throw new Error("GitHub authentication failed. Please check your token.");
  }

  // Load tasks
  const tasksFile = readTasksFile(repoRoot, streamId);
  if (!tasksFile || tasksFile.tasks.length === 0) {
    return result;
  }

  // Group tasks by thread
  const threads = getThreadSyncInfo(tasksFile.tasks);

  // Create GitHub client
  const client = createGitHubClient(token, config.owner, config.repo);

  // Track if we need to update tasks.json
  let tasksUpdated = false;

  // Process each thread with an associated issue
  for (const [threadKey, info] of threads) {
    // Skip threads without issues
    if (!info.issueNumber) {
      continue;
    }

    // Check if thread is complete
    const complete = isThreadCompleteFromTasks(info.tasks);

    // If thread is complete and issue is open, close it
    if (complete && info.issueState === "open") {
      try {
        await client.closeIssue(info.issueNumber);

        // Update the github_issue.state in tasks.json for all tasks in this thread
        for (const task of info.tasks) {
          if (task.github_issue) {
            task.github_issue.state = "closed";
            tasksUpdated = true;
          }
        }

        result.closed.push({
          threadKey,
          threadName: info.threadName,
          issueNumber: info.issueNumber,
          issueUrl: info.issueUrl || `https://github.com/${config.owner}/${config.repo}/issues/${info.issueNumber}`,
        });
      } catch (error) {
        result.errors.push({
          threadKey,
          threadName: info.threadName,
          issueNumber: info.issueNumber,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      // Issue doesn't need to be closed
      let reason: string;
      if (!complete) {
        reason = "Thread not complete";
      } else if (info.issueState === "closed") {
        reason = "Issue already closed";
      } else {
        reason = "No action needed";
      }

      result.unchanged.push({
        threadKey,
        threadName: info.threadName,
        issueNumber: info.issueNumber,
        reason,
      });
    }
  }

  // Save updated tasks.json if any issues were closed
  if (tasksUpdated) {
    writeTasksFile(repoRoot, streamId, tasksFile);
  }

  return result;
}
