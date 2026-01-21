
import { loadGitHubConfig, isGitHubEnabled } from "./config";
import { getGitHubAuth } from "./auth";
import { createGitHubClient } from "./client";
import type { ThreadGitHubMeta } from "./types";
import { readTasksFile, writeTasksFile } from "../tasks";

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

  // TODO: Add labels when implemented in Thread 02
  const labels: string[] = [];

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
