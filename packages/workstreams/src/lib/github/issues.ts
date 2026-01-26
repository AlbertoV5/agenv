
import { loadGitHubConfig, isGitHubEnabled } from "./config";
import { getGitHubAuth } from "./auth";
import { createGitHubClient } from "./client";
import type { ThreadGitHubMeta, GitHubConfig } from "./types";
import { getThreadLabels, formatLabel } from "./labels";
import type { Task } from "../types";
import type { StageIssue } from "./workstream-github";

export interface CreateThreadIssueInput {
  summary: string
  details: string
  streamId: string
  streamName: string
  stageId: string
  stageName: string
  batchId: string
  batchName: string
  threadId: string
  threadName: string
}

/**
 * Input for creating a stage-level GitHub issue
 */
export interface CreateStageIssueInput {
  streamId: string
  streamName: string
  stageNumber: number
  stageName: string
  batches: StageBatch[]
}

/**
 * A batch within a stage, containing threads
 */
export interface StageBatch {
  batchId: string
  batchName: string
  threads: StageThread[]
}

/**
 * A thread within a batch, containing tasks
 */
export interface StageThread {
  threadId: string
  threadName: string
  tasks: StageTask[]
}

/**
 * A task within a thread (simplified for issue body)
 */
export interface StageTask {
  taskId: string
  taskName: string
  status: string
}

export function formatIssueTitle(
  stageId: string,
  batchId: string,
  threadId: string,
  threadName: string,
  streamName: string
): string {
  return `[${stageId}.${batchId}.${threadId}] ${threadName} - ${streamName}`;
}

/**
 * Format the title for a stage-level GitHub issue.
 * Format: [{stream-id}] Stage {N}: {Stage Name}
 *
 * @param streamId - The workstream ID
 * @param stageNumber - The stage number (1-99)
 * @param stageName - The stage name
 * @returns Formatted issue title
 */
export function formatStageIssueTitle(
  streamId: string,
  stageNumber: number,
  stageName: string
): string {
  const stageId = stageNumber.toString().padStart(2, "0");
  return `[${streamId}] Stage ${stageId}: ${stageName}`;
}

/**
 * Format the body for a stage-level GitHub issue.
 * Lists all batches, threads, and tasks in the stage.
 *
 * @param input - Stage issue input data
 * @returns Formatted markdown body
 */
export function formatStageIssueBody(input: CreateStageIssueInput): string {
  const stageId = input.stageNumber.toString().padStart(2, "0");
  
  let body = `**Workstream:** ${input.streamName} (\`${input.streamId}\`)
**Stage:** ${stageId} - ${input.stageName}

## Batches

`;

  for (const batch of input.batches) {
    body += `### Batch ${batch.batchId}: ${batch.batchName}\n\n`;

    for (const thread of batch.threads) {
      body += `#### Thread ${thread.threadId}: ${thread.threadName}\n\n`;

      for (const task of thread.tasks) {
        const checkbox = task.status === "completed" || task.status === "cancelled" ? "[x]" : "[ ]";
        const suffix = task.status === "cancelled" ? " *(cancelled)*" : "";
        body += `- ${checkbox} \`${task.taskId}\` ${task.taskName}${suffix}\n`;
      }

      body += "\n";
    }
  }

  return body.trim();
}

/**
 * Get labels for a stage issue
 */
function getStageLabels(
  config: GitHubConfig,
  streamName: string,
  stageId: string,
  stageName: string
): string[] {
  const { label_config } = config;
  
  const streamLabel = formatLabel(label_config.workstream.prefix, streamName);
  const stageLabel = formatLabel(label_config.stage.prefix, `${stageId}-${stageName}`);
  
  return [streamLabel, stageLabel];
}

export function formatIssueBody(input: CreateThreadIssueInput): string {
  return `**Workstream:** ${input.streamName} (\`${input.streamId}\`)
**Stage:** ${input.stageName}
**Batch:** ${input.batchName}

## Summary
${input.summary}

## Details
${input.details}
`;
}

/**
 * Create a GitHub issue for a stage.
 *
 * Creates an issue with title format: [{stream-id}] Stage {N}: {Stage Name}
 * Body contains all batches, threads, and tasks in the stage.
 *
 * @param repoRoot - Repository root path
 * @param input - Stage issue input data
 * @returns StageIssue metadata if created, null if GitHub not configured
 */
export async function createStageIssue(
  repoRoot: string,
  input: CreateStageIssueInput
): Promise<StageIssue | null> {
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    return null;
  }

  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) {
    return null;
  }

  const token = getGitHubAuth();
  if (!token) {
    throw new Error("GitHub authentication failed. Please check your token.");
  }

  const client = createGitHubClient(token, config.owner, config.repo);

  const title = formatStageIssueTitle(input.streamId, input.stageNumber, input.stageName);
  const body = formatStageIssueBody(input);
  const stageId = input.stageNumber.toString().padStart(2, "0");
  const labels = getStageLabels(config, input.streamName, stageId, input.stageName);

  const issue = await client.createIssue(title, body, labels);

  return {
    issue_number: issue.number,
    issue_url: issue.html_url,
    state: "open",
    created_at: new Date().toISOString(),
  };
}

/**
 * Search for an existing GitHub issue for a stage.
 *
 * This is used to avoid creating duplicate issues when a stage is
 * revoked and re-approved. It searches by the expected title format
 * which is unique per stage: [{stream-id}] Stage {N}: {Stage Name}
 *
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param stageNumber - Stage number (1-99)
 * @param stageName - Stage name
 * @returns Issue info if found, null otherwise
 */
export async function findExistingStageIssue(
  repoRoot: string,
  streamId: string,
  stageNumber: number,
  stageName: string
): Promise<ExistingIssueInfo | null> {
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    return null;
  }

  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) {
    return null;
  }

  const token = getGitHubAuth();
  if (!token) {
    return null;
  }

  const client = createGitHubClient(token, config.owner, config.repo);

  // Build the expected title for this stage
  const expectedTitle = formatStageIssueTitle(streamId, stageNumber, stageName);

  // Search for issues with this title (in any state)
  try {
    const issues = await client.searchIssues({
      title: expectedTitle,
      state: "all",
    });

    // Find exact title match (search API does substring matching)
    const matchingIssue = issues.find((issue) => issue.title === expectedTitle);

    if (matchingIssue) {
      return {
        issueNumber: matchingIssue.number,
        issueUrl: matchingIssue.html_url,
        state: matchingIssue.state === "closed" ? "closed" : "open",
      };
    }
  } catch (error) {
    // Log but don't fail - better to create a new issue than crash
    console.error("Failed to search for existing stage issues:", error);
  }

  return null;
}

/**
 * Reopen a closed stage issue.
 *
 * @param repoRoot - Repository root path
 * @param issueNumber - GitHub issue number
 */
export async function reopenStageIssue(
  repoRoot: string,
  issueNumber: number
): Promise<void> {
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) return;

  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) return;

  const token = getGitHubAuth();
  if (!token) return;

  const client = createGitHubClient(token, config.owner, config.repo);
  await client.reopenIssue(issueNumber);
}

/**
 * Close a stage issue.
 *
 * @param repoRoot - Repository root path
 * @param issueNumber - GitHub issue number
 */
export async function closeStageIssue(
  repoRoot: string,
  issueNumber: number
): Promise<void> {
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) return;

  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) return;

  const token = getGitHubAuth();
  if (!token) return;

  const client = createGitHubClient(token, config.owner, config.repo);
  await client.closeIssue(issueNumber);
}

export async function createThreadIssue(
  repoRoot: string,
  input: CreateThreadIssueInput
): Promise<ThreadGitHubMeta | null> {
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    return null;
  }

  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) {
    return null;
  }

  const token = getGitHubAuth();
  if (!token) {
    throw new Error("GitHub authentication failed. Please check your token.");
  }

  const client = createGitHubClient(token, config.owner, config.repo);

  const title = formatIssueTitle(
    input.stageId,
    input.batchId,
    input.threadId,
    input.threadName,
    input.streamName
  );

  const body = formatIssueBody(input);

  const labels = getThreadLabels(
    config,
    input.streamName,
    input.stageId,
    input.stageName,
    input.batchId,
    input.batchName
  );

  const issue = await client.createIssue(title, body, labels);


  return {
    issue_number: issue.number,
    issue_url: issue.html_url,
  };
}

export async function closeThreadIssue(
  repoRoot: string,
  streamId: string,
  issueNumber: number
): Promise<void> {
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) return;

  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) return;

  const token = getGitHubAuth();
  if (!token) return;

  const client = createGitHubClient(token, config.owner, config.repo);
  await client.closeIssue(issueNumber);
}

export async function reopenThreadIssue(
  repoRoot: string,
  streamId: string,
  issueNumber: number
): Promise<void> {
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) return;

  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) return;

  const token = getGitHubAuth();
  if (!token) return;

  const client = createGitHubClient(token, config.owner, config.repo);
  await client.reopenIssue(issueNumber);
}

/**
 * @deprecated Issue metadata is now stored in github.json per-stage, not in tasks.json.
 * This function is a no-op kept for backward compatibility.
 * Use the new github.json storage via workstream-github.ts instead.
 */
export function storeThreadIssueMeta(
  _repoRoot: string,
  _streamId: string,
  _taskId: string,
  _meta: ThreadGitHubMeta
): void {
  // No-op: Issue metadata is now stored in github.json per-stage
  // See packages/workstreams/src/lib/github/workstream-github.ts
}

/**
 * Result of finding an existing thread issue
 */
export interface ExistingIssueInfo {
  issueNumber: number;
  issueUrl: string;
  state: "open" | "closed";
}

/**
 * Search for an existing GitHub issue for a thread.
 * 
 * This is used to avoid creating duplicate issues when a stage is
 * revoked and re-approved. It searches by the expected title format
 * which is unique per thread: [stageId.batchId.threadId] threadName - streamName
 *
 * @param repoRoot - Repository root path
 * @param stageId - Stage ID (e.g., "01")
 * @param batchId - Batch ID within stage (e.g., "01")
 * @param threadId - Thread ID within batch (e.g., "01")
 * @param threadName - Thread name
 * @param streamName - Workstream name
 * @returns Issue info if found, null otherwise
 */
export async function findExistingThreadIssue(
  repoRoot: string,
  stageId: string,
  batchId: string,
  threadId: string,
  threadName: string,
  streamName: string
): Promise<ExistingIssueInfo | null> {
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    return null;
  }

  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) {
    return null;
  }

  const token = getGitHubAuth();
  if (!token) {
    return null;
  }

  const client = createGitHubClient(token, config.owner, config.repo);

  // Build the expected title for this thread
  const expectedTitle = formatIssueTitle(stageId, batchId, threadId, threadName, streamName);

  // Search for issues with this title (in any state)
  try {
    const issues = await client.searchIssues({
      title: expectedTitle,
      state: "all",
    });

    // Find exact title match (search API does substring matching)
    const matchingIssue = issues.find((issue) => issue.title === expectedTitle);

    if (matchingIssue) {
      return {
        issueNumber: matchingIssue.number,
        issueUrl: matchingIssue.html_url,
        state: matchingIssue.state === "closed" ? "closed" : "open",
      };
    }
  } catch (error) {
    // Log but don't fail - better to create a new issue than crash
    console.error("Failed to search for existing issues:", error);
  }

  return null;
}

/**
 * Format the completed issue body with checked tasks and reports.
 *
 * - All tasks are shown as checked: `- [x] Task name`
 * - If a task has a report, include it as a blockquote: `> Report: ...`
 * - Cancelled tasks are marked with `*(cancelled)*`
 *
 * @param input - The original issue input data
 * @param tasks - The tasks in this thread
 * @returns Formatted markdown body for the completed issue
 */
export function formatCompletedIssueBody(
  input: CreateThreadIssueInput,
  tasks: Task[]
): string {
  const taskList = tasks
    .map((t) => {
      // Format task line with checkmark
      let taskLine = `- [x] ${t.name}`;

      // Add cancelled indicator if applicable
      if (t.status === "cancelled") {
        taskLine += " *(cancelled)*";
      }

      // Add report as blockquote if present
      if (t.report) {
        taskLine += `\n  > Report: ${t.report}`;
      }

      return taskLine;
    })
    .join("\n");

  return `**Workstream:** ${input.streamName} (\`${input.streamId}\`)
**Stage:** ${input.stageName}
**Batch:** ${input.batchName}

## Summary
${input.summary}

## Tasks

${taskList}
`;
}

/**
 * Update the issue body for a completed thread.
 *
 * @param repoRoot - Repository root path
 * @param streamId - Workstream ID
 * @param issueNumber - GitHub issue number
 * @param input - The original issue input data
 * @param tasks - The tasks in this thread
 */
export async function updateThreadIssueBody(
  repoRoot: string,
  streamId: string,
  issueNumber: number,
  input: CreateThreadIssueInput,
  tasks: Task[]
): Promise<void> {
  const enabled = await isGitHubEnabled(repoRoot);
  if (!enabled) {
    throw new Error("GitHub integration is not enabled");
  }

  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) {
    throw new Error("GitHub repository not configured");
  }

  const token = getGitHubAuth();
  if (!token) {
    throw new Error("GitHub authentication not available. Ensure GITHUB_TOKEN or GH_TOKEN is set, or run 'gh auth login'");
  }

  const client = createGitHubClient(token, config.owner, config.repo);
  const body = formatCompletedIssueBody(input, tasks);
  await client.updateIssue(issueNumber, { body });
}
