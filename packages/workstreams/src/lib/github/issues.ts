
import { loadGitHubConfig, isGitHubEnabled } from "./config";
import { getGitHubAuth } from "./auth";
import { createGitHubClient } from "./client";
import type { ThreadGitHubMeta } from "./types";
import { readTasksFile, writeTasksFile } from "../tasks";
import { getThreadLabels } from "./labels";
import type { Task } from "../types";

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

export function formatIssueTitle(
  stageId: string,
  batchId: string,
  threadId: string,
  threadName: string,
  streamName: string
): string {
  return `[${stageId}.${batchId}.${threadId}] ${threadName} - ${streamName}`;
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

export function storeThreadIssueMeta(
  repoRoot: string,
  streamId: string,
  taskId: string,
  meta: ThreadGitHubMeta
): void {
  const tasksFile = readTasksFile(repoRoot, streamId);
  if (!tasksFile) return;

  const task = tasksFile.tasks.find((t) => t.id === taskId);
  if (!task) return;

  if (meta.issue_number && meta.issue_url) {
    task.github_issue = {
      number: meta.issue_number,
      url: meta.issue_url,
      state: "open"
    };
    writeTasksFile(repoRoot, streamId, tasksFile);
  }
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
  if (!enabled) return;

  const config = await loadGitHubConfig(repoRoot);
  if (!config.owner || !config.repo) return;

  const token = getGitHubAuth();
  if (!token) return;

  const client = createGitHubClient(token, config.owner, config.repo);
  const body = formatCompletedIssueBody(input, tasks);
  await client.updateIssue(issueNumber, { body });
}
